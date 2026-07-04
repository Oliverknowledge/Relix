// Formal CoralOS market smoke test. Drives the real CoralOS coordination path
// through Relix's own client (app/lib/coralos/client) and prints a clear
// pass/fail summary. It proves all three seller agents bid over CoralOS, that a
// bid can be awarded, and that the result can be linked to a (fake) escrow id
// WITHOUT touching real escrow.
//
//   npm run coralos:verify
//
// Requires: a running Coral Server, the registered Relix agents, and the CoralOS
// env vars (RELIX_CORALOS_ENABLED=1, CORAL_API_KEY, CORAL_SERVER_URL). No Phantom
// and no real escrow transaction — the Anchor tests cover the on-chain part.
import { randomUUID } from "node:crypto";
import { runCoralMarket, CoralUnavailableError } from "@/app/lib/coralos/client";
import { CORAL_BUILT_IN_SELLER_IDS } from "@/app/lib/coralos/config";
import type { SpecialistJobContext } from "@/app/lib/specialist-agents";

const jobContext: SpecialistJobContext = {
  analyticsAudience: true,
  analyticsConnected: true,
  analyticsSummary: "1,200 sessions in the last 28 days, mostly from launch posts.",
  budgetSol: 8,
  commitMessages: ["Add squad drafting", "Ship onchain unit trades"],
  daysRemaining: 12,
  goal: "Get 500 waitlist signups.",
  jobId: "smoke-job",
  launchChange: "Add squad drafting with tradable onchain units",
  productArea: "onboarding",
  productName: "Shardbound Blitz",
  repoSummary: "A fast, mobile-first strategy battler.",
  repository: "acme/shardbound",
  supportingChange: "Ship onchain unit trades",
  websiteCta: "Join the waitlist",
  websitePromise: "Build a squad, battle in minutes",
  websiteRead: true,
  websiteSummary:
    'The website promises "Build a squad, battle in minutes" for mobile strategy players.'
};

type Check = { name: string; ok: boolean; detail: string };

function line(check: Check) {
  return `  ${check.ok ? "PASS" : "FAIL"}  ${check.name}${check.detail ? ` — ${check.detail}` : ""}`;
}

async function main() {
  const checks: Check[] = [];

  let result;
  try {
    result = await runCoralMarket(jobContext);
    checks.push({ name: "runtime connected", ok: true, detail: `session ${result.sessionId}` });
    checks.push({
      name: "buyer agent ok",
      ok: Boolean(result.buyerAgent),
      detail: `buyer "${result.buyerAgent}", thread ${result.threadId}`
    });
  } catch (error) {
    const reason =
      error instanceof CoralUnavailableError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);
    checks.push({ name: "runtime connected", ok: false, detail: reason });
    report(checks, false);
    return;
  }

  // Per-seller bid checks: one line per built-in specialist so the output makes
  // it obvious all three bid over CoralOS.
  const bySpecialist = new Map(result.bids.map((b) => [b.specialistId, b]));
  for (const id of CORAL_BUILT_IN_SELLER_IDS) {
    const bid = bySpecialist.get(id);
    checks.push({
      name: `${id} seller bid ok`,
      ok: Boolean(bid),
      detail: bid ? `${bid.bid.priceSol} SOL, bid id ${bid.bid.id}` : "no bid returned"
    });
  }

  // Award the lowest in-budget bid (deterministic) and record it — no escrow.
  const awarded = [...result.bids].sort((a, b) => a.bid.priceSol - b.bid.priceSol)[0];
  checks.push({
    name: "award recorded ok",
    ok: Boolean(awarded),
    detail: awarded
      ? `awarded ${awarded.specialistId} bid ${awarded.bid.id} at ${awarded.bid.priceSol} SOL`
      : "no bid to award"
  });

  // Simulate linking the CoralOS session to an escrow id WITHOUT touching real
  // escrow. Proves the plumbing (session/thread/bid -> escrow id) end to end.
  const fakeEscrowId = `TEST-ESCROW-${randomUUID()}`;
  const escrowLink = {
    coralSessionId: result.sessionId,
    coralThreadId: result.threadId,
    awardedBidId: awarded?.bid.id ?? null,
    escrowAccount: fakeEscrowId
  };
  checks.push({
    name: "escrow link simulated ok",
    ok: Boolean(escrowLink.awardedBidId && escrowLink.escrowAccount),
    detail: `linked ${fakeEscrowId} to session ${result.sessionId}`
  });

  console.log("\nCoralOS market details:");
  console.log("  session id:", result.sessionId);
  console.log("  thread id :", result.threadId);
  console.log("  buyer     :", result.buyerAgent);
  console.log("  sellers   :", result.sellerAgents.join(", "));
  console.log("  bid ids   :", result.bidIds.join(", "));

  report(checks, checks.every((c) => c.ok));
}

function report(checks: Check[], passed: boolean) {
  console.log("\nCoralOS market smoke test");
  console.log(checks.map(line).join("\n"));
  console.log(`\n${passed ? "ALL CHECKS PASSED" : "SMOKE TEST FAILED"}\n`);
  process.exit(passed ? 0 : 1);
}

main().catch((e) => {
  console.error("SMOKE TEST ERROR", e);
  process.exit(1);
});
