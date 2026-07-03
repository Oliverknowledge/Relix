// Server-only. Turns the deterministic campaign backbone into real AI-agent
// output: each seller agent runs its own Claude model + system prompt to write
// its bid and delivery, and the buyer (Growth Employee) runs Claude to choose
// and explain the hire. Every function keeps the deterministic value as a
// fallback, so the app works unchanged when ANTHROPIC_API_KEY is unset.
import { claudeConfigured, generateAgentJSON } from "@/app/lib/anthropic";
import type { Bid, CampaignPlan } from "@/app/lib/campaign";
import {
  getSpecialistAdapter,
  getSpecialistAgent,
  type SpecialistAgent,
  type SpecialistDelivery,
  type SpecialistJobContext
} from "@/app/lib/specialist-agents";

const BUYER_MODEL = "claude-sonnet-5";

export type NextStepPlan = {
  assessment: string;
  goalMet: boolean;
  nextGoal: string;
  recommendation: string;
  shouldContinue: boolean;
};

function jobFacts(context: SpecialistJobContext) {
  return [
    `Founder goal: ${context.goal}`,
    `Budget: ${context.budgetSol} SOL, deadline in ${context.daysRemaining} days`,
    `Product: ${context.productName} (${context.repository})`,
    `Newest shipped change: ${context.launchChange}`,
    `Product area the recent work centres on: ${context.productArea}`,
    context.websiteRead
      ? `Website promise: "${context.websitePromise}". Primary call to action: ${context.websiteCta}.`
      : "Website: not analysed.",
    context.analyticsConnected
      ? `Analytics: ${context.analyticsSummary}`
      : "Analytics: not connected."
  ].join("\n");
}

async function writeBid(
  agent: SpecialistAgent,
  bid: Bid,
  context: SpecialistJobContext
): Promise<Bid> {
  const prompt = `${jobFacts(context)}

Your capabilities: ${agent.capabilities.join(", ")}.
Your fixed price for this job is ${bid.priceSol} SOL and your delivery time is ${bid.deliveryDays} days (already set — do not change them).

You are bidding for this paid growth job on the Relix marketplace. Write your pitch grounded ONLY in the facts above. Do not invent traction numbers, users, or results.

Respond with a JSON object only, no prose, in exactly this shape:
{
  "reasoning": "2-3 sentences on why you are the right hire, tied to the shipped change and the goal",
  "risk": "1-2 honest sentences on the main risk or limitation of your approach",
  "deliverables": ["3 to 5 short concrete deliverables you will hand over"]
}`;

  const result = await generateAgentJSON<{
    deliverables?: unknown;
    reasoning?: unknown;
    risk?: unknown;
  }>({ maxTokens: 900, model: agent.model, prompt, system: agent.prompt });

  return {
    ...bid,
    deliverables: cleanStringArray(result.deliverables, bid.deliverables),
    reasoning: cleanString(result.reasoning, bid.reasoning),
    risk: cleanString(result.risk, bid.risk)
  };
}

async function chooseWinner(
  bids: Bid[],
  context: SpecialistJobContext
): Promise<{ reason: string; specialistId: string } | null> {
  const roster = bids
    .map((bid) => {
      const agent = getSpecialistAgent(bid.specialistId);

      return `- id: ${bid.specialistId}
  name: ${agent.name} (owner ${agent.ownerName}, ${agent.jobsCompleted} jobs, ${
    agent.averageRating > 0 ? `${agent.averageRating.toFixed(1)}★` : "new seller"
  })
  price: ${bid.priceSol} SOL, delivery: ${bid.deliveryDays} days
  capabilities: ${agent.capabilities.join(", ")}
  pitch: ${bid.reasoning}
  risk: ${bid.risk}`;
    })
    .join("\n");

  const prompt = `${jobFacts(context)}

You are the Growth Employee — the autonomous hiring agent (the buyer) the founder hired. Choose exactly ONE specialist to hire for this job. Optimise for goal fit, budget fit (price must be within budget), repo/website fit, delivery time, capabilities, and track record. Do not choose randomly; justify the pick against the alternatives.

Bids:
${roster}

Respond with a JSON object only, in exactly this shape:
{
  "specialistId": "<the id of the bid you hire>",
  "reason": "3-4 sentences explaining why this specialist over the others, grounded in the facts"
}`;

  const result = await generateAgentJSON<{
    reason?: unknown;
    specialistId?: unknown;
  }>({
    maxTokens: 700,
    model: BUYER_MODEL,
    prompt,
    system:
      "You are Relix's Growth Employee, an autonomous buyer agent that hires specialist seller agents on behalf of a startup founder."
  });

  const specialistId =
    typeof result.specialistId === "string" ? result.specialistId : "";
  const reason = cleanString(result.reason, "");

  if (!specialistId || !reason || !bids.some((bid) => bid.specialistId === specialistId)) {
    return null;
  }

  return { reason, specialistId };
}

/**
 * Enhances a deterministic plan in place: rewrites every bid's reasoning/risk
 * with the seller's own model, then lets the buyer model pick and explain the
 * winner among budget-eligible bids. Returns the plan (possibly unchanged).
 */
export async function enhanceCampaignPlan(
  plan: CampaignPlan
): Promise<{ aiEnhanced: boolean; plan: CampaignPlan }> {
  if (!claudeConfigured()) {
    return { aiEnhanced: false, plan };
  }

  const context = plan.jobContext;
  let enhanced = false;

  const bids = await Promise.all(
    plan.bids.map(async (bid) => {
      try {
        const next = await writeBid(getSpecialistAgent(bid.specialistId), bid, context);
        enhanced = true;
        return next;
      } catch {
        return bid;
      }
    })
  );

  let winningBid = bids.find((bid) => bid.id === plan.winningBid.id) || plan.winningBid;
  let budgetStatus = plan.budgetStatus;
  let reason = plan.selection.reason;

  try {
    const choice = await chooseWinner(bids, context);

    if (choice) {
      reason = choice.reason;
      const chosen = bids.find(
        (bid) => bid.specialistId === choice.specialistId
      );

      // Only honour the buyer's pick when it fits the budget; otherwise keep
      // the deterministic (guaranteed-eligible) winner but use the AI reason.
      if (chosen && chosen.priceSol <= context.budgetSol) {
        winningBid = chosen;
        budgetStatus = {
          ...plan.budgetStatus,
          blocked: false,
          constrainedByBudget: chosen.id !== plan.winningBid.id,
          remainingBudgetSol: Number(
            (context.budgetSol - chosen.priceSol).toFixed(3)
          ),
          selectedPriceSol: chosen.priceSol
        };
      }
      enhanced = true;
    }
  } catch {
    // Keep deterministic selection.
  }

  return {
    aiEnhanced: enhanced,
    plan: {
      ...plan,
      bids,
      budgetStatus,
      selection: { ...plan.selection, reason },
      winningBid
    }
  };
}

/**
 * Generates the winning specialist's delivery. Uses the deterministic delivery
 * as the exact section/block structure, then rewrites each block's text with
 * the specialist's model so the assets are genuinely written by the agent.
 */
export async function generateDelivery(
  specialistId: string,
  context: SpecialistJobContext
): Promise<{ aiGenerated: boolean; delivery: SpecialistDelivery }> {
  const adapter = getSpecialistAdapter(specialistId);
  const base = await adapter.deliver({
    bid: {
      createdAt: new Date().toISOString(),
      deliverables: [],
      deliveryDays: 0,
      id: `bid-${context.jobId}-${specialistId}`,
      jobId: context.jobId,
      priceSol: 0,
      reasoning: "",
      risk: "",
      specialistId
    },
    request: context
  });

  if (!claudeConfigured()) {
    return { aiGenerated: false, delivery: base };
  }

  const agent = getSpecialistAgent(specialistId);
  const blocks = base.sections.flatMap((section) =>
    section.blocks.map((block) => ({
      id: block.id,
      kind: block.kind,
      label: `${section.title} — ${block.label}`
    }))
  );
  const prompt = `${jobFacts(context)}

You are delivering the launch assets you were hired for. Rewrite each asset below so it is specific, grounded in the facts above, and ready for founder review. Tweets must be 280 characters or fewer. Do not invent metrics, users, or results.

Assets (keep every id):
${blocks
  .map((block) => `- id: ${block.id} [${block.kind}] ${block.label}`)
  .join("\n")}

Respond with a JSON object only, in exactly this shape:
{
  "report": "1-2 sentence summary of what you delivered",
  "blocks": { "<id>": "the rewritten text for that asset", ... }
}`;

  try {
    const result = await generateAgentJSON<{
      blocks?: Record<string, unknown>;
      report?: unknown;
    }>({ maxTokens: 3000, model: agent.model, prompt, system: agent.prompt });
    const rewritten = result.blocks || {};

    return {
      aiGenerated: true,
      delivery: {
        report: cleanString(result.report, base.report),
        sections: base.sections.map((section) => ({
          ...section,
          blocks: section.blocks.map((block) => {
            const next = cleanString(rewritten[block.id], block.text);

            return {
              ...block,
              text: block.kind === "tweet" ? clampTweet(next) : next
            };
          })
        })),
        specialistId: base.specialistId
      }
    };
  } catch {
    return { aiGenerated: false, delivery: base };
  }
}

/**
 * The buyer agent assesses whether the goal is met and plans the next move.
 */
export async function planNextStep({
  analyticsSummary,
  budgetRemainingSol,
  completedSpecialist,
  goal,
  productName,
  repository
}: {
  analyticsSummary: string;
  budgetRemainingSol: number;
  completedSpecialist: string;
  goal: string;
  productName: string;
  repository: string;
}): Promise<NextStepPlan> {
  const fallback: NextStepPlan = {
    assessment: `${completedSpecialist} delivered the first campaign for ${productName}. It is too early to know if "${goal}" is met.`,
    goalMet: false,
    nextGoal: goal,
    recommendation: `Ship one more visible improvement to ${repository}, then run a follow-up campaign to build on the launch.`,
    shouldContinue: budgetRemainingSol > 0.1
  };

  if (!claudeConfigured()) {
    return fallback;
  }

  const prompt = `You already ran one growth campaign for ${productName} (${repository}). ${completedSpecialist} delivered it and was paid on Solana.
Founder goal: ${goal}
Remaining campaign budget: ${budgetRemainingSol.toFixed(2)} SOL
Analytics: ${analyticsSummary}

Decide the next move as the autonomous Growth Employee. Respond with a JSON object only:
{
  "goalMet": true or false,
  "assessment": "1-2 sentences on where the goal stands",
  "recommendation": "1-2 sentences on the single most useful next action",
  "nextGoal": "the goal for the next campaign (can be the same goal, refined)",
  "shouldContinue": true or false (should you run another campaign now, given budget and progress)
}`;

  try {
    const result = await generateAgentJSON<Partial<NextStepPlan>>({
      maxTokens: 700,
      model: BUYER_MODEL,
      prompt,
      system:
        "You are Relix's Growth Employee, an autonomous buyer agent working a startup's growth goal over multiple campaigns within a fixed budget."
    });

    return {
      assessment: cleanString(result.assessment, fallback.assessment),
      goalMet: typeof result.goalMet === "boolean" ? result.goalMet : false,
      nextGoal: cleanString(result.nextGoal, goal),
      recommendation: cleanString(result.recommendation, fallback.recommendation),
      shouldContinue:
        typeof result.shouldContinue === "boolean"
          ? result.shouldContinue && budgetRemainingSol > 0.1
          : fallback.shouldContinue
    };
  } catch {
    return fallback;
  }
}

function cleanString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function cleanStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, 5);

  return items.length > 0 ? items : fallback;
}

function clampTweet(text: string) {
  return text.length <= 280 ? text : `${text.slice(0, 277).trimEnd()}…`;
}
