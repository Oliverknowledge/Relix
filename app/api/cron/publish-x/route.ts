import { NextResponse, type NextRequest } from "next/server";
import { publishXPost } from "@/app/lib/x-api";
import {
  claimDueXPostForCron,
  getXAccountForUser,
  listAllDueScheduledXPosts,
  markXPostPublished,
  recordXPostFailure
} from "@/app/lib/x-store";

// Server-side scheduled publisher — runs with no browser open, invoked by
// Vercel Cron (see vercel.json) every 5 minutes, or manually for testing (see
// isAuthorized below). Never fires except for posts a founder already
// explicitly scheduled or approved via the founder-facing UI.
export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 3;

type PostResult = {
  error?: string;
  id: string;
  result: "failed" | "published" | "retry_scheduled" | "skipped";
};

// Requires CRON_SECRET either way — Vercel sends it as
// `Authorization: Bearer <CRON_SECRET>` when the env var is set, and the same
// secret works as a `?secret=` query param for manual testing before a demo
// recording. A bare "vercel-cron" user-agent is not treated as sufficient
// authorization on its own, since a user-agent string is trivially spoofable
// by anyone who finds this public URL.
function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get("authorization");

  if (authHeader === `Bearer ${secret}`) {
    return true;
  }

  return request.nextUrl.searchParams.get("secret") === secret;
}

async function handle(request: NextRequest) {
  if (!isAuthorized(request)) {
    const configured = Boolean(process.env.CRON_SECRET);

    return NextResponse.json(
      {
        error: configured
          ? "Invalid or missing cron secret."
          : "CRON_SECRET is not configured on the server."
      },
      { status: configured ? 401 : 500 }
    );
  }

  const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";
  const duePosts = await listAllDueScheduledXPosts();

  if (dryRun) {
    return NextResponse.json({
      checked: duePosts.length,
      dryRun: true,
      failed: 0,
      published: 0,
      skipped: 0,
      wouldPublish: duePosts.map((post) => ({
        campaignId: post.campaignId,
        id: post.id,
        label: post.label,
        scheduledFor: post.scheduledFor,
        textPreview: `${post.text.slice(0, 80)}${post.text.length > 80 ? "…" : ""}`
      }))
    });
  }

  const details: PostResult[] = [];

  for (const duePost of duePosts) {
    const claimed = await claimDueXPostForCron({
      maxAttempts: MAX_ATTEMPTS,
      postId: duePost.id
    });

    if (!claimed) {
      details.push({ id: duePost.id, result: "skipped" });
      continue;
    }

    try {
      const account = await getXAccountForUser(claimed.userId);

      if (!account) {
        throw new Error("X account not found or disconnected.");
      }

      const published = await publishXPost({
        account,
        text: claimed.text,
        userId: claimed.userId
      });

      await markXPostPublished({
        postId: claimed.id,
        publishedAt: new Date().toISOString(),
        text: published.text,
        userId: claimed.userId,
        xPostId: published.id,
        xPostUrl: published.url
      });

      details.push({ id: claimed.id, result: "published" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Scheduled publish failed.";
      const updated = await recordXPostFailure({
        errorMessage: message,
        maxAttempts: MAX_ATTEMPTS,
        postId: claimed.id
      });

      details.push({
        error: message,
        id: claimed.id,
        result: updated?.status === "failed" ? "failed" : "retry_scheduled"
      });
    }
  }

  const published = details.filter(
    (detail) => detail.result === "published"
  ).length;
  const failed = details.filter(
    (detail) => detail.result === "failed" || detail.result === "retry_scheduled"
  ).length;
  const skipped = details.filter(
    (detail) => detail.result === "skipped"
  ).length;

  return NextResponse.json({
    checked: duePosts.length,
    details,
    failed,
    published,
    skipped
  });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

// POST is supported too, purely for convenience when testing with curl -X POST.
export async function POST(request: NextRequest) {
  return handle(request);
}
