import {
  specialistWallets,
  type SpecialistId
} from "@/app/lib/specialist-agents";

export type FounderRequest = {
  budgetSol: number;
  constraints: string;
  deadline: string;
  description: string;
  gameName: string;
  goal: string;
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
    "Keep founder review before public posts. No paid bots. No fake engagement."
};

export function createCampaignPlan(request: FounderRequest): CampaignPlan {
  const cleanRequest = normalizeRequest(request);
  const daysRemaining = getDaysRemaining(cleanRequest.deadline);
  const bids = createSpecialistBids(cleanRequest, daysRemaining);
  const winningBid = [...bids].sort((a, b) => b.score - a.score)[0];

  return {
    bids,
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
      request.constraints.trim() || defaultFounderRequest.constraints
  };
}

function createSpecialistBids(
  request: FounderRequest,
  daysRemaining: number
): Bid[] {
  const budget = request.budgetSol;
  const deadlineIsClose = daysRemaining <= 14;
  const bids: Array<Omit<Bid, "score">> = [
    {
      id: "creator-outreach",
      agentName: "Creator Outreach Agent",
      agentWallet: specialistWallets["creator-outreach"],
      service: "Creator playtest sprint",
      action:
        "Turns a visible product update into a creator brief, playtest angle, and approved outreach list.",
      priceSol: priceFromBudget(budget, 0.32, 0.55),
      reasoning:
        "Strong when the product needs proof from gameplay clips before a broader launch.",
      differentiation:
        "Best for visual proof. Slower than an event when the goal needs urgency.",
      deliverables: [
        "Creator brief",
        "Founder-approved outreach angle",
        "Playtest schedule"
      ],
      timeline: "4 days"
    },
    {
      id: "tournament",
      agentName: "Tournament Agent",
      agentWallet: specialistWallets.tournament,
      service: "Launch tournament",
      action:
        "Packages the latest product change into a time-boxed event with launch copy, rules, and a handoff plan.",
      priceSol: priceFromBudget(budget, 0.38, 0.75),
      reasoning:
        "Best when the repository shows a recent improvement that new users should experience immediately.",
      differentiation:
        "Creates urgency, a reason to try the update, and a clean campaign handoff.",
      deliverables: [
        "Tournament framing",
        "Launch thread",
        "Founder reply pack"
      ],
      timeline: "5 days"
    },
    {
      id: "referral",
      agentName: "Referral Campaign Agent",
      agentWallet: specialistWallets.referral,
      service: "Referral loop",
      action:
        "Prepares a simple invite loop for early users once the first launch beat creates attention.",
      priceSol: priceFromBudget(budget, 0.26, 0.42),
      reasoning:
        "Useful after a seed audience exists. Weaker as the first move for a fresh product update.",
      differentiation:
        "Best for compounding attention after the initial launch moment.",
      deliverables: [
        "Invite framing",
        "Reward ladder",
        "Abuse review checklist"
      ],
      timeline: "3 days"
    },
    {
      id: "community",
      agentName: "Community Launch Agent",
      agentWallet: specialistWallets.community,
      service: "Community launch kit",
      action:
        "Prepares founder-led community copy, moderator notes, and response prompts for the launch window.",
      priceSol: priceFromBudget(budget, 0.24, 0.35),
      reasoning:
        "Good for trust and founder presence. Less direct than a focused launch event.",
      differentiation:
        "Best for calm founder communication around a new product change.",
      deliverables: [
        "Community brief",
        "Moderator notes",
        "Founder response prompts"
      ],
      timeline: "4 days"
    }
  ];

  return bids.map((bid) => ({
    ...bid,
    score: bid.id === "tournament" ? (deadlineIsClose ? 4 : 3.8) : baseFit(bid.id)
  }));
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
