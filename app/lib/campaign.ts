import type { GoogleAnalyticsMetrics } from "@/app/lib/google-analytics";
import {
  inferProductArea,
  type GitHubRepositoryContext
} from "@/app/lib/github-tool";
import {
  getSpecialistAgent,
  listActiveSpecialistAgents,
  type Bid,
  type SpecialistAgent,
  type SpecialistId,
  type SpecialistJobContext
} from "@/app/lib/specialist-agents";
import type { WebsiteAnalysis } from "@/app/lib/website-analysis";

export type { Bid } from "@/app/lib/specialist-agents";

export type FounderRequest = {
  budgetSol: number;
  constraints: string;
  deadline: string;
  description: string;
  gameName: string;
  goal: string;
  websiteUrl: string;
};

export type CampaignSignals = {
  analytics?: GoogleAnalyticsMetrics | null;
  github?: GitHubRepositoryContext | null;
  website?: WebsiteAnalysis | null;
};

export type BidEvaluation = {
  bidId: string;
  budgetFit: number;
  capabilityFit: number;
  deliveryFit: number;
  goalFit: number;
  repoFit: number;
  specialistId: SpecialistId;
  total: number;
};

export type BidSelection = {
  evaluations: BidEvaluation[];
  reason: string;
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
  jobContext: SpecialistJobContext;
  request: FounderRequest;
  selection: BidSelection;
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

export function createCampaignPlan(
  request: FounderRequest,
  signals: CampaignSignals = {}
): CampaignPlan {
  const cleanRequest = normalizeRequest(request);
  const daysRemaining = getDaysRemaining(cleanRequest.deadline);
  const id = campaignId(cleanRequest);
  const jobContext = buildSpecialistJobContext({
    daysRemaining,
    jobId: id,
    request: cleanRequest,
    signals
  });
  const bids = listActiveSpecialistAgents().map((agent) =>
    agent.createBid(jobContext)
  );
  const { budgetStatus, selection, winningBid } = selectWinningBid(
    bids,
    jobContext
  );

  return {
    bids,
    budgetStatus,
    daysRemaining,
    id,
    jobContext,
    request: cleanRequest,
    selection,
    winningBid
  };
}

export function buildSpecialistJobContext({
  daysRemaining,
  jobId,
  request,
  signals
}: {
  daysRemaining: number;
  jobId: string;
  request: FounderRequest;
  signals: CampaignSignals;
}): SpecialistJobContext {
  const github = signals.github || null;
  const website = signals.website?.ok ? signals.website : null;
  const analytics = signals.analytics?.connected ? signals.analytics : null;
  const commitMessages = github
    ? github.commits.map((commit) => commit.message)
    : [];
  const release = github?.releases[0];
  const launchChange =
    release?.name ||
    commitMessages[0] ||
    request.description ||
    "the latest build";
  const supportingChange =
    commitMessages[1] || release?.body || github?.description || launchChange;
  const productArea = github
    ? inferProductArea([
        github.description,
        github.readme,
        github.recentSummary,
        ...commitMessages,
        release?.body || ""
      ])
    : inferProductArea([request.description, request.goal]);

  return {
    analyticsAudience: Boolean(analytics && (analytics.sessions || 0) >= 50),
    analyticsConnected: Boolean(analytics),
    analyticsSummary: analytics?.summary || "Analytics not connected.",
    budgetSol: request.budgetSol,
    commitMessages,
    daysRemaining,
    goal: request.goal,
    jobId,
    launchChange,
    productArea,
    productName: github ? humanizeRepoName(github.name) : request.gameName,
    repoSummary: github?.recentSummary || request.description,
    repository: github?.fullName || request.gameName,
    supportingChange,
    websiteCta: website?.primaryCta || "",
    websitePromise: website?.promise || "",
    websiteRead: Boolean(website),
    websiteSummary: website
      ? `The website promises "${website.promise}" for ${website.audience}.`
      : "Website not analysed."
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

function selectWinningBid(bids: Bid[], context: SpecialistJobContext) {
  const evaluations = bids.map((bid) => evaluateBid(bid, context));
  const totals = new Map(
    evaluations.map((evaluation) => [evaluation.bidId, evaluation.total])
  );
  const ranked = [...bids].sort((a, b) => {
    const scoreDiff = (totals.get(b.id) || 0) - (totals.get(a.id) || 0);

    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    return a.priceSol - b.priceSol;
  });
  const preferredBid = ranked[0];
  const eligible = ranked.filter((bid) => bid.priceSol <= context.budgetSol);
  const cheapestBid = [...bids].sort((a, b) => a.priceSol - b.priceSol)[0];
  const blocked = eligible.length === 0;
  const winningBid = eligible[0] || cheapestBid;
  const constrainedByBudget = !blocked && winningBid.id !== preferredBid.id;
  const remainingBudgetSol = Number(
    (context.budgetSol - winningBid.priceSol).toFixed(3)
  );

  return {
    budgetStatus: {
      blocked,
      constrainedByBudget,
      message: budgetMessage({
        blocked,
        budgetSol: context.budgetSol,
        preferredBid,
        winningBid
      }),
      remainingBudgetSol,
      requestedBudgetSol: context.budgetSol,
      selectedPriceSol: winningBid.priceSol
    },
    selection: {
      evaluations,
      reason: selectionReason({
        constrainedByBudget,
        context,
        preferredBid,
        winningBid
      })
    },
    winningBid
  };
}

function evaluateBid(bid: Bid, context: SpecialistJobContext): BidEvaluation {
  const agent = getSpecialistAgent(bid.specialistId);
  const budgetFit =
    bid.priceSol > context.budgetSol
      ? 0
      : 1 +
        Math.min(
          1,
          (context.budgetSol - bid.priceSol) / Math.max(context.budgetSol, 0.01)
        );
  const goalFit = goalAffinity(bid.specialistId, context.goal);
  const repoFit = repoWebsiteAffinity(bid.specialistId, context);
  const deliveryFit =
    bid.deliveryDays > context.daysRemaining
      ? 0.2
      : Math.min(1 + (context.daysRemaining - bid.deliveryDays) / 14, 2);
  const capabilityFit = Math.min(
    matchedCapabilities(agent, context).length * 0.7,
    2
  );

  return {
    bidId: bid.id,
    budgetFit: round2(budgetFit),
    capabilityFit: round2(capabilityFit),
    deliveryFit: round2(deliveryFit),
    goalFit: round2(goalFit),
    repoFit: round2(repoFit),
    specialistId: bid.specialistId,
    total: round2(budgetFit + goalFit + repoFit + deliveryFit + capabilityFit)
  };
}

function goalAffinity(specialistId: SpecialistId, goal: string) {
  const text = goal.toLowerCase();

  if (specialistId === "tournament") {
    return /(signup|waitlist|launch|urgent|deadline|week|event)/.test(text)
      ? 2
      : 1;
  }

  if (specialistId === "creator-outreach") {
    return /(creator|clip|video|content|awareness|audience|views|proof)/.test(
      text
    )
      ? 2
      : 0.9;
  }

  if (specialistId === "referral") {
    return /(referral|invite|viral|share|friend|loop)/.test(text) ? 2 : 0.6;
  }

  return /(community|discord|trust|retention|members)/.test(text) ? 2 : 0.7;
}

function repoWebsiteAffinity(
  specialistId: SpecialistId,
  context: SpecialistJobContext
) {
  const area = context.productArea.toLowerCase();
  const freshShip = context.commitMessages.length > 0 ? 1 : 0.3;

  if (specialistId === "tournament") {
    let fit = freshShip * 1.2;

    if (/(onboarding|signup|gameplay|player|game)/.test(area)) {
      fit += 0.6;
    }

    if (context.websiteRead) {
      fit += 0.2;
    }

    return Math.min(fit, 2);
  }

  if (specialistId === "creator-outreach") {
    let fit = freshShip * 0.8;

    if (/(game|player|gameplay|visual)/.test(area)) {
      fit += 0.8;
    }

    if (context.websiteRead) {
      fit += 0.2;
    }

    return Math.min(fit, 2);
  }

  if (specialistId === "referral") {
    let fit = context.analyticsAudience ? 1.8 : 0.5;

    if (/(waitlist|signup)/.test(area)) {
      fit += 0.2;
    }

    return Math.min(fit, 2);
  }

  let fit = 0.8;

  if (/(community|discord)/.test(area)) {
    fit += 0.8;
  }

  if (context.websiteRead && context.websitePromise) {
    fit += 0.3;
  }

  return Math.min(fit, 2);
}

function neededCapabilities(context: SpecialistJobContext) {
  const goal = context.goal.toLowerCase();
  const area = context.productArea.toLowerCase();
  const tags = new Set<string>(["launch-threads"]);

  if (/(signup|waitlist|launch|urgent|deadline|week|fast)/.test(goal)) {
    tags.add("launch-events");
    tags.add("urgency-copy");
  }

  if (/(creator|clip|video|content|awareness|audience|views)/.test(goal)) {
    tags.add("creator-briefs");
    tags.add("outreach-lists");
    tags.add("clip-strategy");
  }

  if (/(referral|invite|viral|share|friend|loop)/.test(goal)) {
    tags.add("invite-loops");
    tags.add("reward-ladders");
  }

  if (/(community|discord|trust|retention|members)/.test(goal)) {
    tags.add("community-briefs");
    tags.add("moderator-notes");
    tags.add("founder-replies");
  }

  if (/(onboarding|signup|first)/.test(area)) {
    tags.add("launch-events");
    tags.add("urgency-copy");
  }

  if (/(game|player|gameplay)/.test(area)) {
    tags.add("clip-strategy");
  }

  return [...tags];
}

function matchedCapabilities(
  agent: SpecialistAgent,
  context: SpecialistJobContext
) {
  const needed = neededCapabilities(context);

  return agent.capabilities.filter((capability) =>
    needed.includes(capability)
  );
}

function selectionReason({
  constrainedByBudget,
  context,
  preferredBid,
  winningBid
}: {
  constrainedByBudget: boolean;
  context: SpecialistJobContext;
  preferredBid: Bid;
  winningBid: Bid;
}) {
  const agent = getSpecialistAgent(winningBid.specialistId);
  const matched = matchedCapabilities(agent, context);
  const deliveryLine =
    winningBid.deliveryDays <= context.daysRemaining
      ? `${winningBid.deliveryDays}-day delivery lands inside the ${context.daysRemaining}-day deadline`
      : `${winningBid.deliveryDays}-day delivery is the closest fit to the ${context.daysRemaining}-day deadline`;
  const parts = [
    `the ${formatSol(winningBid.priceSol)} bid fits the ${formatSol(
      context.budgetSol
    )} budget`,
    goalReasonLine(winningBid.specialistId, context),
    repoReasonLine(winningBid.specialistId, context),
    deliveryLine,
    matched.length > 0
      ? `its capabilities (${matched.join(", ")}) cover what this job needs`
      : `its capabilities are the closest fit on the marketplace`
  ];
  const base = `I selected ${agent.name} because ${parts.join("; ")}.`;

  if (constrainedByBudget) {
    const preferredAgent = getSpecialistAgent(preferredBid.specialistId);

    return `${base} ${preferredAgent.name} scored higher on fit but its ${formatSol(
      preferredBid.priceSol
    )} bid exceeded the budget.`;
  }

  return base;
}

function goalReasonLine(
  specialistId: SpecialistId,
  context: SpecialistJobContext
) {
  const goal = `your goal "${context.goal}"`;

  if (specialistId === "tournament") {
    return `${goal} needs urgency, and a time-boxed event creates a real deadline`;
  }

  if (specialistId === "creator-outreach") {
    return `${goal} needs visible proof, which creator sessions provide`;
  }

  if (specialistId === "referral") {
    return `${goal} compounds fastest through invites from existing users`;
  }

  return `${goal} is served by calm, founder-led communication`;
}

function repoReasonLine(
  specialistId: SpecialistId,
  context: SpecialistJobContext
) {
  const base = `the repository shows ${lowerFirst(
    shortenText(context.launchChange, 70)
  )} (${context.productArea})`;

  if (specialistId === "referral" && context.analyticsAudience) {
    return `${base}, and analytics already shows an audience to loop`;
  }

  if (context.websiteRead && context.websiteCta) {
    return `${base}, with ${context.websiteCta} on the site to receive traffic`;
  }

  return base;
}

function budgetMessage({
  blocked,
  budgetSol,
  preferredBid,
  winningBid
}: {
  blocked: boolean;
  budgetSol: number;
  preferredBid: Bid;
  winningBid: Bid;
}) {
  const winnerName = getSpecialistAgent(winningBid.specialistId).name;

  if (blocked) {
    return `Your budget is ${formatSol(
      budgetSol
    )}. The cheapest specialist costs ${formatSol(
      winningBid.priceSol
    )}, so increase budget before payment.`;
  }

  if (winningBid.id !== preferredBid.id) {
    const preferredName = getSpecialistAgent(preferredBid.specialistId).name;

    return `Your budget is ${formatSol(
      budgetSol
    )}. I selected ${winnerName} because ${preferredName} costs ${formatSol(
      preferredBid.priceSol
    )} and exceeds the budget.`;
  }

  return `Budget fits selected specialist. ${formatSol(
    budgetSol - winningBid.priceSol
  )} remains after the contract amount.`;
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

function humanizeRepoName(name: string) {
  return name
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function shortenText(value: string, max: number) {
  const text = value.trim().replace(/\s+/g, " ");

  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, max).trim()}…`;
}

function lowerFirst(value: string) {
  if (!value) {
    return "the latest update";
  }

  return value.charAt(0).toLowerCase() + value.slice(1);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

function trimNumber(value: number) {
  return Number(value.toFixed(3)).toString();
}
