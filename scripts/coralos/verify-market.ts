// Verification harness: drives one real CoralOS market round through the actual
// Relix client (app/lib/coralos/client) and prints the collected bids. Requires
// a running Coral Server and the registered Relix agents.
import { runCoralMarket } from "@/app/lib/coralos/client";
import type { SpecialistJobContext } from "@/app/lib/specialist-agents";

const jobContext: SpecialistJobContext = {
  analyticsAudience: true,
  analyticsConnected: true,
  analyticsSummary: "1,200 sessions in the last 28 days, mostly from launch posts.",
  budgetSol: 8,
  commitMessages: ["Add squad drafting", "Ship onchain unit trades"],
  daysRemaining: 12,
  goal: "Get 500 waitlist signups.",
  jobId: "verify-job",
  launchChange: "Add squad drafting with tradable onchain units",
  productArea: "onboarding",
  productName: "Shardbound Blitz",
  repoSummary: "A fast, mobile-first strategy battler.",
  repository: "acme/shardbound",
  supportingChange: "Ship onchain unit trades",
  websiteCta: "Join the waitlist",
  websitePromise: "Build a squad, battle in minutes",
  websiteRead: true,
  websiteSummary: 'The website promises "Build a squad, battle in minutes" for mobile strategy players.'
};

runCoralMarket(jobContext)
  .then((result) => {
    console.log("CORALOS MARKET RESULT");
    console.log("  sessionId:", result.sessionId);
    console.log("  threadId :", result.threadId);
    console.log("  buyer    :", result.buyerAgent);
    console.log("  sellers  :", result.sellerAgents.join(", "));
    console.log("  bids     :", result.bids.length);
    for (const b of result.bids) {
      console.log(`    - ${b.sellerName} (${b.specialistId}): ${b.bid.priceSol} SOL, ${b.bid.deliveryDays}d, id=${b.bid.id}`);
    }
    console.log("VERIFY_OK", result.bids.length >= 3);
    process.exit(0);
  })
  .catch((e) => {
    console.error("VERIFY_FAIL", e?.message ?? e);
    process.exit(1);
  });
