// Standalone unit test for the server-side X scheduling primitives — due-post
// selection and idempotent claim/publish/retry transitions. Bundled with
// esbuild (resolves the "@/" alias, like coralos:verify / test:readiness) and
// run under node against an isolated scratch data directory, never the real
// data/ dir. Kept out of tests/ so `anchor test` is untouched.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.RELIX_DATA_DIR = mkdtempSync(join(tmpdir(), "relix-x-scheduling-"));

const {
  claimDueXPostForCron,
  listAllDueScheduledXPosts,
  markXPostPublished,
  recordXPostFailure,
  scheduleXPosts
} = await import("@/app/lib/x-store");

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL  ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

const past = (minutesAgo: number) =>
  new Date(Date.now() - minutesAgo * 60_000).toISOString();
const future = (minutesAhead: number) =>
  new Date(Date.now() + minutesAhead * 60_000).toISOString();

async function scheduleOne({
  campaignId,
  scheduledFor,
  sourceId
}: {
  campaignId: string;
  scheduledFor: string;
  sourceId: string;
}) {
  const posts = await scheduleXPosts({
    campaignId,
    posts: [{ scheduledFor, sourceId, text: `Test post ${sourceId}` }],
    repository: "test/repo",
    userId: "user-test",
    xAccountId: "xacct-test"
  });

  const created = posts.find((post) => post.sourceId === sourceId);

  assert.ok(created, `expected a scheduled post for ${sourceId}`);

  return created!;
}

await test("a due post (scheduledFor in the past) is selected", async () => {
  const post = await scheduleOne({
    campaignId: "camp-due",
    scheduledFor: past(5),
    sourceId: "asset-due"
  });
  const due = await listAllDueScheduledXPosts();

  assert.ok(
    due.some((candidate) => candidate.id === post.id),
    "expected the past-scheduled post to be due"
  );
});

await test("a future-scheduled post is not selected as due", async () => {
  const post = await scheduleOne({
    campaignId: "camp-future",
    scheduledFor: future(30),
    sourceId: "asset-future"
  });
  const due = await listAllDueScheduledXPosts();

  assert.ok(
    !due.some((candidate) => candidate.id === post.id),
    "expected the future-scheduled post to NOT be due yet"
  );
});

await test(
  "claiming a due post twice in a row only succeeds once (idempotent)",
  async () => {
    const post = await scheduleOne({
      campaignId: "camp-idempotent",
      scheduledFor: past(1),
      sourceId: "asset-idempotent"
    });

    const firstClaim = await claimDueXPostForCron({
      maxAttempts: 3,
      postId: post.id
    });

    assert.ok(firstClaim, "first claim should succeed");
    assert.equal(firstClaim!.status, "publishing");
    assert.equal(firstClaim!.attempts, 1);

    const secondClaim = await claimDueXPostForCron({
      maxAttempts: 3,
      postId: post.id
    });

    assert.equal(
      secondClaim,
      null,
      "a second claim on the same post must be a no-op, not a re-publish"
    );
  }
);

await test(
  "a published post is never picked up as due again",
  async () => {
    const post = await scheduleOne({
      campaignId: "camp-published",
      scheduledFor: past(2),
      sourceId: "asset-published"
    });

    await claimDueXPostForCron({ maxAttempts: 3, postId: post.id });
    await markXPostPublished({
      postId: post.id,
      publishedAt: new Date().toISOString(),
      text: post.text,
      userId: post.userId,
      xPostId: "x-post-id-123",
      xPostUrl: "https://x.com/example/status/123"
    });

    const due = await listAllDueScheduledXPosts();

    assert.ok(
      !due.some((candidate) => candidate.id === post.id),
      "a published post must not reappear as due"
    );

    const reclaim = await claimDueXPostForCron({
      maxAttempts: 3,
      postId: post.id
    });

    assert.equal(
      reclaim,
      null,
      "claiming an already-published post must be a no-op"
    );
  }
);

await test(
  "a failing post retries up to the attempt cap, then terminally fails",
  async () => {
    const maxAttempts = 3;
    const post = await scheduleOne({
      campaignId: "camp-retry",
      scheduledFor: past(1),
      sourceId: "asset-retry"
    });

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const claimed = await claimDueXPostForCron({ maxAttempts, postId: post.id });

      assert.ok(claimed, `expected attempt ${attempt} to be claimable`);
      assert.equal(claimed!.attempts, attempt);

      const afterFailure = await recordXPostFailure({
        errorMessage: `simulated failure ${attempt}`,
        maxAttempts,
        postId: post.id
      });

      if (attempt < maxAttempts) {
        assert.equal(
          afterFailure?.status,
          "scheduled",
          `expected a requeue after attempt ${attempt}`
        );
      } else {
        assert.equal(
          afterFailure?.status,
          "failed",
          "expected a terminal failure once attempts are exhausted"
        );
      }
    }

    const due = await listAllDueScheduledXPosts();

    assert.ok(
      !due.some((candidate) => candidate.id === post.id),
      "an exhausted (terminally failed) post must not be selected as due"
    );
  }
);

console.log(`\n${passed} passed, ${failed} failed`);
rmSync(process.env.RELIX_DATA_DIR, { force: true, recursive: true });
