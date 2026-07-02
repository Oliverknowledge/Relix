import {
  listActiveSpecialistAgents,
  type SpecialistId
} from "@/app/lib/specialist-agents";

export type FounderRequest = {
  budgetSol: number;
  constraints: string;
  deadline: string;
  description: string;
  gameName: string;
  goal: string;
  websiteUrl: string;
};

export type Bid = {
  action: string;
  agentName: string;
  agentWallet: string;
  deliverables: string[];
  differentiation: string;
  id: SpecialistId;
  priceSol: number;
  reasoning: string;
  score: number;
  service: string;
  timeline: string;
};

export type CampaignPlan = {
  bids: Bid[];
  budgetStatus: {
    blocked: boolean;
    constrainedByBudget: boolean;
    message: string;
    remainingBudgetSol: number;
    requestedBudgetSol: number;
    selectedPriceSol: number;
  };
  daysRemaining: number;
  id: string;
  request: FounderRequest;
  winningBid: Bid;
};

export type PaymentResult = {
  agentWallet: string;
  campaignId: string;
  contractAmountSol: number;
  errorMessage?: string;
  explorerUrl: string;
  founderWallet: string;
  mode: "devnet-transfer";
  ok: boolean;
  settlementSol: number;
  signature: string;
  slot?: number;
  status: "confirmed";
  winnerAgent: string;
};

export const defaultFounderRequest: FounderRequest = {
  gameName: "Shardbound Blitz",
  description:
    "A fast session, mobile-first strategy battler where squads are built from tradable onchain units.",
  goal: "Get 500 waitlist signups.",
  budgetSol: 10,
  deadline: "2026-07-18",
  constraints:
    "Keep founder review before public posts. No paid bots. No fake engagement.",
  websiteUrl: ""
};

export function createCampaignPlan(request: FounderRequest): CampaignPlan {
  const cleanRequest = normalizeRequest(request);
  const daysRemaining = getDaysRemaining(cleanRequest.deadline);
  const bids = createSpecialistBids(cleanRequest, daysRemaining);
  const { budgetStatus, winningBid } = selectWinningBid(bids, cleanRequest);

  return {
    bids,
    budgetStatus,
    daysRemaining,
    id: campaignId(cleanRequest),
    request: cleanRequest,
    winningBid
  };
}

export function formatSol(value: number) {
  return `${trimNumber(value)} SOL`;
}

function normalizeRequest(request: FounderRequest): FounderRequest {
  return {
    gameName: request.gameName.trim() || defaultFounderRequest.gameName,
    description:
      request.description.trim() || defaultFounderRequest.description,
    goal: request.goal.trim() || defaultFounderRequest.goal,
    budgetSol: clamp(Number(request.budgetSol) || 0, 0.4, 50),
    deadline: request.deadline || defaultFounderRequest.deadline,
    constraints:
      request.constraints.trim() || defaultFounderRequest.constraints,
    websiteUrl: request.websiteUrl.trim()
  };
}

type SpecialistPitch = {
  action: string;
  budgetShare: number;
  deliverables: string[];
  differentiation: string;
  reasoning: string;
  service: string;
};

const specialistPitches: Record<SpecialistId, SpecialistPitch> = {
  "creator-outreach": {
    service: "Creator playtest sprint",
    action:
      "Turns a visible product update into a creator brief, playtest angle, and approved outreach list.",
    budgetShare: 0.32,
    reasoning:
      "Strong when the product needs proof from gameplay clips before a broader launch.",
    differentiation:
      "Best for visual proof. Slower than an event when the goal needs urgency.",
    deliverables: [
      "Creator brief",
      "Founder-approved outreach angle",
      "Playtest schedule"
    ]
  },
  tournament: {
    service: "Launch tournament",
    action:
      "Packages the latest product change into a time-boxed event with launch copy, rules, and a handoff plan.",
    budgetShare: 0.38,
    reasoning:
      "Best when the repository shows a recent improvement that new users should experience immediately.",
    differentiation:
      "Creates urgency, a reason to try the update, and a clean campaign handoff.",
    deliverables: [
      "Tournament framing",
      "Launch thread",
      "Founder reply pack"
    ]
  },
  referral: {
    service: "Referral loop",
    action:
      "Prepares a simple invite loop for early users once the first launch beat creates attention.",
    budgetShare: 0.26,
    reasoning:
      "Useful after a seed audience exists. Weaker as the first move for a fresh product update.",
    differentiation:
      "Best for compounding attention after the initial launch moment.",
    deliverables: [
      "Invite framing",
      "Reward ladder",
      "Abuse review checklist"
    ]
  },
  community: {
    service: "Community launch kit",
    action:
      "Prepares founder-led community copy, moderator notes, and response prompts for the launch window.",
    budgetShare: 0.24,
    reasoning:
      "Good for trust and founder presence. Less direct than a focused launch event.",
    differentiation:
      "Best for calm founder communication around a new product change.",
    deliverables: [
      "Community brief",
      "Moderator notes",
      "Founder response prompts"
    ]
  }
};

function createSpecialistBids(
  request: FounderRequest,
  daysRemaining: number
): Bid[] {
  const budget = request.budgetSol;
  const deadlineIsClose = daysRemaining <= 14;

  return listActiveSpecialistAgents().map((agent) => {
    const pitch = specialistPitches[agent.id];

    return {
      action: pitch.action,
      agentName: agent.name,
      agentWallet: agent.ownerWallet,
      deliverables: pitch.deliverables,
      differentiation: pitch.differentiation,
      id: agent.id,
      priceSol: priceFromBudget(budget, pitch.budgetShare, agent.basePriceSol),
      reasoning: pitch.reasoning,
      score:
        agent.id === "tournament"
          ? deadlineIsClose
            ? 4
            : 3.8
          : baseFit(agent.id),
      service: pitch.service,
      timeline: `${agent.deliveryDays} ${agent.deliveryDays === 1 ? "day" : "days"}`
    };
  });
}

function selectWinningBid(bids: Bid[], request: FounderRequest) {
  const ranked = [...bids].sort((a, b) => b.score - a.score);
  const eligible = ranked.filter((bid) => bid.priceSol <= request.budgetSol);
  const winningBid = eligible[0] || ranked[ranked.length - 1];
  const preferredBid = ranked[0];
  const constrainedByBudget = winningBid.id !== preferredBid.id;
  const remainingBudgetSol = Number(
    (request.budgetSol - winningBid.priceSol).toFixed(3)
  );
  const blocked = winningBid.priceSol > request.budgetSol;

  return {
    budgetStatus: {
      blocked,
      constrainedByBudget,
      message: budgetMessage({
        blocked,
        preferredBid,
        request,
        winningBid
      }),
      remainingBudgetSol,
      requestedBudgetSol: request.budgetSol,
      selectedPriceSol: winningBid.priceSol
    },
    winningBid
  };
}

function budgetMessage({
  blocked,
  preferredBid,
  request,
  winningBid
}: {
  blocked: boolean;
  preferredBid: Bid;
  request: FounderRequest;
  winningBid: Bid;
}) {
  if (blocked) {
    return `Your budget is ${formatSol(
      request.budgetSol
    )}. The cheapest specialist costs ${formatSol(
      winningBid.priceSol
    )}, so increase budget before payment.`;
  }

  if (winningBid.id !== preferredBid.id) {
    return `Your budget is ${formatSol(
      request.budgetSol
    )}. I selected ${winningBid.agentName.replace(
      "Agent",
      "Specialist"
    )} because ${preferredBid.agentName.replace(
      "Agent",
      "Specialist"
    )} costs ${formatSol(preferredBid.priceSol)} and exceeds the budget.`;
  }

  return `Budget fits selected specialist. ${formatSol(
    request.budgetSol - winningBid.priceSol
  )} remains after the contract amount.`;
}

function baseFit(id: SpecialistId) {
  if (id === "creator-outreach") {
    return 3.2;
  }

  if (id === "community") {
    return 2.8;
  }

  return 2.6;
}

function priceFromBudget(budget: number, ratio: number, minimum: number) {
  return Number(Math.max(minimum, budget * ratio).toFixed(2));
}

function getDaysRemaining(deadline: string) {
  const now = new Date("2026-07-01T12:00:00.000Z");
  const target = new Date(`${deadline}T12:00:00.000Z`);
  const diff = target.getTime() - now.getTime();

  if (Number.isNaN(diff)) {
    return 14;
  }

  return Math.max(1, Math.ceil(diff / 86_400_000));
}

function campaignId(request: FounderRequest) {
  const slug = `${request.gameName}-${request.goal}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42);

  return `relix-${slug || "campaign"}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function trimNumber(value: number) {
  return Number(value.toFixed(3)).toString();
}
