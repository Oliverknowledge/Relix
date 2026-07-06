// Standalone unit test for the Audience Research capability. Bundled with
// esbuild (resolves the "@/" alias, like coralos:verify / test:readiness) and
// run under node. Covers: a specialist with the capability can be created,
// delivery generation includes a well-formed audienceResearch object without
// throwing, and a specialist without the capability never gets one.
import assert from "node:assert/strict";
import {
  createGenericSpecialistAdapter,
  getSpecialistAdapter,
  hasAudienceResearchCapability,
  type SpecialistAgent,
  type SpecialistJobContext
} from "@/app/lib/specialist-agents";

let passed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (error) {
    console.error(`FAIL  ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

function context(overrides: Partial<SpecialistJobContext> = {}): SpecialistJobContext {
  return {
    analyticsAudience: false,
    analyticsConnected: true,
    analyticsSummary: "96 users, 108 sessions (28d), 19% engagement",
    budgetSol: 3,
    commitMessages: ["Build proper waitlist system", "Rebuild onboarding for students"],
    daysRemaining: 17,
    goal: "Get 500 waitlist signups.",
    jobId: "job-1",
    launchChange: "Build a proper waitlist system",
    launchUrl: "https://getsnowball.app",
    productArea: "onboarding and signup conversion",
    productName: "Snowball",
    repoSummary: "A student productivity tool for exam revision",
    repository: "Oliverknowledge/Snowball",
    supportingChange: "Rebuilt onboarding for students",
    websiteCta: "https://getsnowball.app",
    websitePromise: "Start Studying in One Minute",
    websiteRead: true,
    websiteSummary: "A student study app",
    ...overrides
  };
}

function bidStub(specialistId: string, jobId: string) {
  return {
    channel: "",
    createdAt: new Date().toISOString(),
    deliverables: [],
    deliveryDays: 0,
    id: `bid-${jobId}-${specialistId}`,
    jobId,
    priceSol: 0,
    reasoning: "",
    risk: "",
    specialistId,
    successMetric: "",
    targetAudience: "",
    timing: ""
  };
}

function publishedAgentWithResearch(): SpecialistAgent {
  return {
    avatar: "🧪",
    averageDeliveryDays: 3,
    averageRating: 0,
    basePriceSol: 0.4,
    capabilities: ["launch-threads", "audience-research"],
    createdAt: new Date().toISOString(),
    deliveryDays: 3,
    description: "Test-only published specialist for the audience-research suite.",
    id: "test-audience-specialist",
    jobsCompleted: 0,
    lastHiredAt: null,
    model: "claude-haiku-4-5",
    monthlyEarnings: [],
    name: "Test Audience Specialist",
    ownerName: "Test Owner",
    ownerWallet: "11111111111111111111111111111111",
    prompt: "You are a test specialist.",
    recentClients: [],
    status: "active",
    totalEarnedSol: 0,
    version: "1.0.0"
  };
}

await test("audience-research capability is detected correctly", () => {
  assert.equal(hasAudienceResearchCapability(["audience-research"]), true);
  assert.equal(hasAudienceResearchCapability(["launch-threads"]), false);
  assert.equal(hasAudienceResearchCapability([]), false);
});

await test("Referral Specialist (built-in) delivery includes a well-formed audienceResearch", async () => {
  const adapter = getSpecialistAdapter("referral");
  const ctx = context();
  const delivery = await adapter.deliver({ bid: bidStub("referral", ctx.jobId), request: ctx });

  assert.ok(delivery.audienceResearch, "expected audienceResearch to be present");
  const research = delivery.audienceResearch!;
  assert.equal(research.segments.length, 3);
  assert.equal(research.channels.length, 5);
  assert.ok(research.objections.length >= 1);
  assert.ok(research.first72HoursPlan.length >= 1);
  assert.ok(research.summary.length > 0);
  research.channels.forEach((channel) => {
    assert.ok(["Reddit", "X", "Discord", "Indie Hackers", "Other"].includes(channel.platform));
    assert.ok(channel.name.length > 0);
    assert.ok(channel.whyRelevant.length > 0);
    assert.ok(channel.firstAction.length > 0);
  });
});

await test("Referral Specialist audience research never claims verified data", async () => {
  const adapter = getSpecialistAdapter("referral");
  const ctx = context();
  const delivery = await adapter.deliver({ bid: bidStub("referral", ctx.jobId), request: ctx });
  const rendered = JSON.stringify(delivery.audienceResearch).toLowerCase();

  assert.ok(!rendered.includes("verified community"));
  assert.ok(!rendered.includes("verified subreddit"));
});

await test("Community Specialist (no audience-research capability) has no audienceResearch", async () => {
  const adapter = getSpecialistAdapter("community");
  const ctx = context();
  const delivery = await adapter.deliver({ bid: bidStub("community", ctx.jobId), request: ctx });

  assert.equal(delivery.audienceResearch, undefined);
});

await test("a published specialist with the capability gets audienceResearch via the generic adapter", async () => {
  const agent = publishedAgentWithResearch();
  const adapter = createGenericSpecialistAdapter(agent);
  const ctx = context({ productArea: "student focus and revision tracking" });
  const delivery = await adapter.deliver({ bid: bidStub(agent.id, ctx.jobId), request: ctx });

  assert.ok(delivery.audienceResearch);
  assert.equal(delivery.audienceResearch!.segments.length, 3);
  assert.equal(delivery.audienceResearch!.channels.length, 5);

  const bid = await adapter.bid(ctx);
  assert.ok(bid.deliverables.includes("Audience research"));
});

await test("education-flavoured context surfaces study-relevant candidate subreddits", async () => {
  const agent = publishedAgentWithResearch();
  const adapter = createGenericSpecialistAdapter(agent);
  const ctx = context({
    commitMessages: ["Rebuild study streaks", "Add exam revision reminders"],
    productArea: "exam revision and study streaks",
    repoSummary: "A student study app for revision"
  });
  const delivery = await adapter.deliver({ bid: bidStub(agent.id, ctx.jobId), request: ctx });
  const names = delivery.audienceResearch!.channels.map((channel) => channel.name).join(" ");

  assert.ok(/r\/GetStudying|r\/productivity/.test(names));
});

console.log(`\n${passed} test(s) passed.`);
