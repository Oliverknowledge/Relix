import type { SpecialistAgentAdapter } from "@/app/lib/specialist-sdk";

// Specialist ids are open-ended so third parties can publish their own seller
// agents. The built-ins keep stable ids; published agents get generated
// ids at publish time.
export type SpecialistId = string;

export type BuiltInSpecialistId = "tournament" | "referral" | "community";

export const BUILT_IN_SPECIALIST_IDS: BuiltInSpecialistId[] = [
  "tournament",
  "referral",
  "community"
];

export function isBuiltInSpecialist(id: SpecialistId): id is BuiltInSpecialistId {
  return (BUILT_IN_SPECIALIST_IDS as string[]).includes(id);
}

export type SpecialistAgentStatus = "active" | "paused";

export type SpecialistJobContext = {
  analyticsAudience: boolean;
  analyticsConnected: boolean;
  analyticsSummary: string;
  budgetSol: number;
  commitMessages: string[];
  daysRemaining: number;
  goal: string;
  jobId: string;
  // The founder's real call-to-action URL (waitlist/signup/site), used so
  // delivered posts carry a clickable link instead of a "[waitlist link]"
  // placeholder. Empty when the founder gave no URL. Optional in the type so
  // job contexts transported over CoralOS (which may predate this field) stay
  // valid; readers must treat it as possibly undefined.
  launchUrl?: string;
  launchChange: string;
  productArea: string;
  productName: string;
  repoSummary: string;
  repository: string;
  supportingChange: string;
  websiteCta: string;
  websitePromise: string;
  websiteRead: boolean;
  websiteSummary: string;
};

export type Bid = {
  // Structured strategy fields, alongside the free-text reasoning/risk. All
  // four are derived deterministically from job context already computed
  // elsewhere in this file — never invented numbers or predictions.
  channel: string;
  createdAt: string;
  deliverables: string[];
  deliveryDays: number;
  id: string;
  jobId: string;
  priceSol: number;
  reasoning: string;
  risk: string;
  specialistId: SpecialistId;
  successMetric: string;
  targetAudience: string;
  timing: string;
};

export type SpecialistDeliveryBlock = {
  id: string;
  kind: "tweet" | "note" | "reply" | "follow-up";
  label: string;
  text: string;
};

export type SpecialistDeliverySection = {
  blocks: SpecialistDeliveryBlock[];
  id: string;
  title: string;
};

// Audience Research is advice, not a postable asset — no Publish/Schedule,
// no fake traction. Every field is deterministically derived from the same
// job context every other delivery block uses; candidate communities are
// always labelled "candidate"/"search", never "verified".
export type AudienceSegment = {
  launchAngle: string;
  name: string;
  painPoint: string;
  whyTheyCare: string;
};

export type AudienceChannel = {
  firstAction: string;
  name: string;
  platform: "Reddit" | "X" | "Discord" | "Indie Hackers" | "Other";
  risk: string;
  searchQueryOrUrl?: string;
  suggestedPostAngle: string;
  whyRelevant: string;
};

export type AudienceObjection = {
  founderReply: string;
  objection: string;
};

export type AudienceResearch = {
  channels: AudienceChannel[];
  first72HoursPlan: string[];
  objections: AudienceObjection[];
  segments: AudienceSegment[];
  summary: string;
};

export type SpecialistDelivery = {
  // Only present for specialists with the audience-research capability.
  audienceResearch?: AudienceResearch;
  // Same structured strategy fields as Bid — carried through from bid to
  // delivery so the founder sees a consistent strategy, not just assets.
  channel: string;
  report: string;
  sections: SpecialistDeliverySection[];
  specialistId: SpecialistId;
  successMetric: string;
  targetAudience: string;
  timing: string;
};

export type SpecialistAgent = {
  avatar: string;
  averageDeliveryDays: number;
  averageRating: number;
  basePriceSol: number;
  capabilities: string[];
  createdAt: string;
  deliveryDays: number;
  description: string;
  id: SpecialistId;
  jobsCompleted: number;
  lastHiredAt: string | null;
  model: string;
  monthlyEarnings: number[];
  name: string;
  ownerName: string;
  ownerWallet: string;
  prompt: string;
  recentClients: string[];
  status: SpecialistAgentStatus;
  totalEarnedSol: number;
  version: string;
};

export type SpecialistRecentJob = {
  amountSol: number;
  client: string;
  completedAt: string;
};

export type SpecialistReputation = {
  averageRating: number;
  jobsCompleted: number;
  lastHiredAt: string | null;
  recentJobs: SpecialistRecentJob[];
  totalEarnedSol: number;
};

const tournamentAgent: SpecialistAgent = {
  id: "tournament",
  name: "Tournament Specialist",
  ownerName: "Kenji Sato",
  ownerWallet: "DfzySb4cMTR1v5xuDWATsTcMJ3RvsSxGhmJuTHeNd69M",
  capabilities: [
    "tournament-design",
    "prize-payouts",
    "launch-threads",
    "urgency-copy",
    "distribution-plan"
  ],
  basePriceSol: 0.75,
  deliveryDays: 5,
  model: "claude-haiku-4-5",
  version: "1.4.2",
  prompt:
    "You are Tournament Specialist, an independent seller agent on the Relix marketplace. Package the newest shipped change into a time-boxed launch tournament: event framing, rules, a launch thread, and a founder handoff plan. Anchor every claim to a commit, release, or README line, and never invent traction numbers.",
  status: "active",
  createdAt: "2026-02-11T09:30:00.000Z",
  jobsCompleted: 21,
  totalEarnedSol: 8.4,
  averageRating: 4.9,
  lastHiredAt: "2026-06-28T15:20:00.000Z",
  avatar: "🏆",
  averageDeliveryDays: 4.8,
  description:
    "Runs launch tournaments that turn a fresh product change into a time-boxed competitive moment with a hard deadline.",
  monthlyEarnings: [0.9, 1.4, 1.6, 1.5, 1.6, 1.4],
  recentClients: ["Nimbus", "Fernwood", "Tidepool"]
};

const referralAgent: SpecialistAgent = {
  id: "referral",
  name: "Referral Specialist",
  ownerName: "Priya Raman",
  ownerWallet: "DfzySb4cMTR1v5xuDWATsTcMJ3RvsSxGhmJuTHeNd69M",
  capabilities: [
    "invite-loops",
    "reward-ladders",
    "distribution-plan",
    "audience-research"
  ],
  basePriceSol: 0.42,
  deliveryDays: 3,
  model: "claude-haiku-4-5",
  version: "1.0.8",
  prompt:
    "You are Referral Specialist, an independent seller agent on the Relix marketplace. Design a simple invite loop for early users: invite framing, a reward ladder with caps, and an abuse review checklist. Recommend activation only after a launch beat has produced a seed audience, and flag any reward that could attract bot signups. Because this specialist has Audience research capability, include an Audience Research section before final launch assets. Identify high-intent audience segments, candidate subreddits, X search terms or communities, likely objections, and the first 72-hour distribution plan. Do not invent fake traction or verified community data. Label suggestions as candidates unless verified.",
  status: "active",
  createdAt: "2026-04-18T10:15:00.000Z",
  jobsCompleted: 8,
  totalEarnedSol: 3.1,
  averageRating: 4.2,
  lastHiredAt: "2026-06-15T13:00:00.000Z",
  avatar: "🔗",
  averageDeliveryDays: 3.2,
  description:
    "Designs capped invite loops with abuse checks that compound a seed audience into steady signups.",
  monthlyEarnings: [0, 0, 0.5, 0.9, 1.0, 0.7],
  recentClients: ["Loopline", "Bramble"]
};

const communityAgent: SpecialistAgent = {
  id: "community",
  name: "Community Launch Specialist",
  ownerName: "Diego Fuentes",
  ownerWallet: "DfzySb4cMTR1v5xuDWATsTcMJ3RvsSxGhmJuTHeNd69M",
  capabilities: ["community-briefs", "founder-replies", "distribution-plan"],
  basePriceSol: 0.35,
  deliveryDays: 4,
  model: "claude-haiku-4-5",
  version: "3.2.1",
  prompt:
    "You are Community Launch Specialist, an independent seller agent on the Relix marketplace. Prepare founder-led community copy for the launch window: a community brief, moderator notes, and calm founder reply prompts. Keep the tone specific and grounded in what the repository actually shipped, and never announce features that are not in the code.",
  status: "active",
  createdAt: "2026-05-27T16:45:00.000Z",
  jobsCompleted: 11,
  totalEarnedSol: 4.4,
  averageRating: 4.8,
  lastHiredAt: "2026-06-26T18:30:00.000Z",
  avatar: "🫂",
  averageDeliveryDays: 4.1,
  description:
    "Writes calm, founder-led community launches that build trust without hype or invented claims.",
  monthlyEarnings: [0, 0, 0, 0.8, 1.8, 1.8],
  recentClients: ["Hearthside", "Cindermark", "Quiethold"]
};

export const tournamentSpecialist: SpecialistAgentAdapter = {
  metadata() {
    return tournamentAgent;
  },
  async bid(request) {
    return tournamentBid(request);
  },
  async deliver(job) {
    return tournamentDelivery(job.request);
  }
};

export const referralSpecialist: SpecialistAgentAdapter = {
  metadata() {
    return referralAgent;
  },
  async bid(request) {
    return referralBid(request);
  },
  async deliver(job) {
    return referralDelivery(job.request);
  }
};

export const communityLaunchSpecialist: SpecialistAgentAdapter = {
  metadata() {
    return communityAgent;
  },
  async bid(request) {
    return communityBid(request);
  },
  async deliver(job) {
    return communityDelivery(job.request);
  }
};

// The built-in seller agents. `specialistRegistry` stays built-in only so
// server-side reputation seeding is stable; published agents are registered at
// runtime into the lookup maps below.
export const specialistAdapters: SpecialistAgentAdapter[] = [
  tournamentSpecialist,
  referralSpecialist,
  communityLaunchSpecialist
];

export const specialistRegistry: SpecialistAgent[] = specialistAdapters.map(
  (adapter) => adapter.metadata()
);

const adaptersById = new Map<SpecialistId, SpecialistAgentAdapter>();

function indexAdapter(adapter: SpecialistAgentAdapter) {
  adaptersById.set(adapter.metadata().id, adapter);
}

specialistAdapters.forEach(indexAdapter);

/**
 * Register a published seller agent so it can bid, be selected, and deliver
 * alongside the built-in specialists. Called client-side after fetching
 * published agents and immediately after a new one is published.
 */
export function registerPublishedSpecialist(agent: SpecialistAgent) {
  indexAdapter(createGenericSpecialistAdapter(agent));
}

export function registerPublishedSpecialists(agents: SpecialistAgent[]) {
  agents.forEach(registerPublishedSpecialist);
}

export function getSpecialistAgent(id: SpecialistId): SpecialistAgent {
  return adaptersById.get(id)?.metadata() as SpecialistAgent;
}

export function getSpecialistAdapter(id: SpecialistId): SpecialistAgentAdapter {
  return adaptersById.get(id) as SpecialistAgentAdapter;
}

export function listActiveSpecialistAdapters(): SpecialistAgentAdapter[] {
  return [...adaptersById.values()].filter(
    (adapter) => adapter.metadata().status === "active"
  );
}

export function listActiveSpecialistAgents(): SpecialistAgent[] {
  return listActiveSpecialistAdapters().map((adapter) => adapter.metadata());
}

export function seedReputationFor(agent: SpecialistAgent): SpecialistReputation {
  return {
    averageRating: agent.averageRating,
    jobsCompleted: agent.jobsCompleted,
    lastHiredAt: agent.lastHiredAt,
    recentJobs: [],
    totalEarnedSol: agent.totalEarnedSol
  };
}

export function avatarInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  return initials || "S";
}

/**
 * Wraps any SpecialistAgent (typically a freshly published one that only has
 * metadata and a prompt) in an adapter that produces a grounded bid and
 * delivery from its capabilities and the job context.
 */
export function createGenericSpecialistAdapter(
  agent: SpecialistAgent
): SpecialistAgentAdapter {
  return {
    metadata() {
      return agent;
    },
    async bid(request) {
      return genericBid(agent, request);
    },
    async deliver(job) {
      return genericDelivery(agent, job.request);
    }
  };
}

function genericBid(agent: SpecialistAgent, context: SpecialistJobContext): Bid {
  const change = shorten(context.launchChange, 80);
  const capabilityText = agent.capabilities.slice(0, 3).join(", ");
  const research = hasAudienceResearchCapability(agent.capabilities);

  return {
    ...genericStrategyFields(agent, context),
    createdAt: new Date().toISOString(),
    deliverables: genericDeliverables(agent),
    deliveryDays: agent.deliveryDays,
    id: bidIdFor(context.jobId, agent.id),
    jobId: context.jobId,
    priceSol: priceFromBudget(context.budgetSol, 0.3, agent.basePriceSol),
    reasoning: `${agent.name} specialises in ${
      capabilityText || "growth work"
    }. For "${change}" I would focus on ${
      context.productArea
    }, point people at ${ctaOr(context)}, and aim the work at ${goalFocus(
      context.goal
    )}.${research ? ` I'll also map who's most likely to care and where to reach them first — candidate subreddits and X search terms, not a guessed list.` : ""}`,
    risk: research
      ? `This is a newer published seller, so it has less marketplace history than established specialists. Audience research is grounded in your repo and goal, but candidate communities are unverified — you should confirm fit before posting.`
      : `This is a newer published seller, so it has less marketplace history than established specialists. The plan stays grounded in ${context.repository} and your goal to limit that risk.`,
    specialistId: agent.id
  };
}

function genericDelivery(
  agent: SpecialistAgent,
  context: SpecialistJobContext
): SpecialistDelivery {
  const change = shorten(context.launchChange, 90);
  const focus = goalFocus(context.goal);
  const cta = ctaOr(context);
  const capabilityText = agent.capabilities.join(", ") || "growth work";

  return {
    ...genericStrategyFields(agent, context),
    report: `${agent.name} prepared a launch pack for "${shorten(
      context.launchChange,
      70
    )}" using its ${capabilityText} capabilities, grounded in ${
      context.repository
    } and your goal of ${focus}.`,
    sections: [
      {
        blocks: [
          {
            id: "specialist-brief",
            kind: "note",
            label: "Specialist brief",
            text: [
              `Seller: ${agent.name} v${agent.version}, owned by ${agent.ownerName}.`,
              `Capabilities applied: ${capabilityText}.`,
              `What shipped: ${shorten(context.launchChange, 110)} (${context.repository}).`,
              `Why it matters: recent work centres on ${context.productArea}.`,
              context.websiteRead
                ? `Website read: "${shorten(context.websitePromise, 80)}" — traffic goes to ${cta}.`
                : `Where to send people: ${cta}.`,
              context.analyticsConnected
                ? `Analytics: ${context.analyticsSummary}`
                : `Analytics not connected, so this launch is also the first read on interest.`,
              `Campaign goal: ${focus}.`
            ].join("\n")
          }
        ],
        id: "specialist-brief",
        title: "Specialist Brief"
      },
      launchThreadSection([
        `${context.productName} shipped ${lowerFirst(
          change
        )} — and ${agent.name} is putting it in front of the right people.`,
        `Why it matters: the recent work is about ${context.productArea}, the part new users judge first. Start at ${cta}.`,
        `This launch is aimed at ${focus}. Try the newest build and tell us where it still feels rough.`
      ]),
      {
        blocks: [
          {
            id: "generic-reply-0",
            kind: "reply",
            label: "Why should I try it now?",
            text: `Because the latest ${context.productName} work is focused on ${context.productArea}. This launch points people at ${cta} instead of making a broad claim.`
          },
          {
            id: "generic-reply-1",
            kind: "reply",
            label: "What changed?",
            text: `${shorten(
              context.launchChange,
              120
            )}. The recent commits centre on ${context.productArea}.`
          },
          {
            id: "generic-reply-2",
            kind: "reply",
            label: "Is this live?",
            text: `The assets are ready for founder review. Nothing is posted or sent without approval.`
          }
        ],
        id: "generic-replies",
        title: "Founder Replies"
      },
      followUpSection(
        `Follow-up for ${context.productName}: what we learned about ${context.productArea} from the launch window, and where ${focus} landed. Specifics tomorrow.`
      )
    ],
    ...(hasAudienceResearchCapability(agent.capabilities)
      ? { audienceResearch: audienceResearchSection(agent, context) }
      : {}),
    specialistId: agent.id
  };
}

function genericDeliverables(agent: SpecialistAgent) {
  const fromCapabilities = agent.capabilities
    .slice(0, 3)
    .map((capability) => capabilityLabel(capability));
  const research = hasAudienceResearchCapability(agent.capabilities)
    ? ["Audience research"]
    : [];

  return [
    ...new Set([...fromCapabilities, ...research, "Launch thread", "Follow-up post"])
  ];
}

function capabilityLabel(capability: string) {
  const words = capability.replace(/[-_]+/g, " ").trim();

  return words.charAt(0).toUpperCase() + words.slice(1);
}

export const specialistWallets = Object.fromEntries(
  specialistRegistry.map((agent) => [agent.id, agent.ownerWallet])
) as Record<SpecialistId, string>;

function tournamentBid(context: SpecialistJobContext): Bid {
  const agent = tournamentAgent;
  const change = shorten(context.launchChange, 80);
  const rushed = context.daysRemaining <= agent.deliveryDays;
  const deliveryDays = rushed
    ? Math.max(2, context.daysRemaining - 1)
    : agent.deliveryDays;
  const analyticsLine = context.analyticsConnected
    ? ` ${context.analyticsSummary} — a deadline gives those visitors a reason to convert now.`
    : "";

  return {
    ...tournamentStrategyFields(context, deliveryDays),
    createdAt: new Date().toISOString(),
    deliverables: [
      "Launch thread",
      "Tournament announcement",
      "Tournament rules",
      "Founder replies",
      "Follow-up post"
    ],
    deliveryDays,
    id: bidIdFor(context.jobId, agent.id),
    jobId: context.jobId,
    priceSol: priceFromBudget(context.budgetSol, 0.38, agent.basePriceSol),
    reasoning: `The repository just shipped "${change}" — a playable reason to show up this week. A time-boxed tournament turns it into a deadline, which is the fastest route to ${goalFocus(
      context.goal
    )}, and the event page hands players straight to ${ctaOr(
      context
    )}.${analyticsLine}${
      rushed
        ? ` With ${context.daysRemaining} days left, I compressed delivery to fit before the deadline.`
        : ""
    }`,
    risk: `If the update is not visibly different in the first session, an event can feel thin. The rules therefore anchor scoring to ${context.productArea}, not to hype.`,
    specialistId: agent.id
  };
}

function referralBid(context: SpecialistJobContext): Bid {
  const agent = referralAgent;
  const change = shorten(context.launchChange, 80);
  const audienceLine = context.analyticsAudience
    ? `Your analytics show an audience already arriving — ${lowerFirst(
        context.analyticsSummary
      )} — and a loop compounds that traffic toward ${goalFocus(
        context.goal
      )}.`
    : context.analyticsConnected
      ? `Your analytics show little existing traffic, so I priced a small loop that should start only after your first launch beat.`
      : `Analytics is not connected, so I priced a small loop seeded by the first users who arrive for ${lowerFirst(
          change
        )}.`;

  return {
    ...referralStrategyFields(context, agent.deliveryDays),
    createdAt: new Date().toISOString(),
    deliverables: [
      "Referral mechanics",
      "Reward copy",
      "Abuse checks",
      "Invite messages",
      "Audience research",
      "Follow-up post"
    ],
    deliveryDays: agent.deliveryDays,
    id: bidIdFor(context.jobId, agent.id),
    jobId: context.jobId,
    priceSol: priceFromBudget(context.budgetSol, 0.26, agent.basePriceSol),
    reasoning: `Every signup from ${ctaOr(
      context
    )} can invite the next one. ${audienceLine} I'll also map the highest-intent audience segments and candidate channels so the loop starts with people who are actually likely to invite others.`,
    risk: `Referral rewards attract bots before they attract fans, so the mechanics ship with caps and an abuse checklist. This loop works best as the second beat, after something announces ${lowerFirst(
      change
    )}. Candidate audience channels are unverified — confirm activity before posting.`,
    specialistId: agent.id
  };
}

function communityBid(context: SpecialistJobContext): Bid {
  const agent = communityAgent;
  const change = shorten(context.launchChange, 80);
  const websiteLine = context.websiteRead
    ? ` The site already promises "${shorten(
        context.websitePromise,
        70
      )}", so every reply can point back to it.`
    : "";

  return {
    ...communityStrategyFields(context, agent.deliveryDays),
    createdAt: new Date().toISOString(),
    deliverables: [
      "Community announcement",
      "Moderator note",
      "FAQ replies",
      "Launch thread",
      "Follow-up post"
    ],
    deliveryDays: agent.deliveryDays,
    id: bidIdFor(context.jobId, agent.id),
    jobId: context.jobId,
    priceSol: priceFromBudget(context.budgetSol, 0.24, agent.basePriceSol),
    reasoning: `Calm, founder-led communication around "${change}" builds trust that outlasts a spike. I write the announcement, moderator note, and FAQ so every answer stays anchored to ${context.productArea}.${websiteLine}`,
    risk: `Community posts convert slower than events, so ${goalFocus(
      context.goal
    )} needs patience on this route. If the deadline is tight, pair it with a louder first beat.`,
    specialistId: agent.id
  };
}

function tournamentDelivery(context: SpecialistJobContext): SpecialistDelivery {
  const change = shorten(context.launchChange, 90);
  const eventDays = Math.min(5, Math.max(2, context.daysRemaining - 2));
  const focus = goalFocus(context.goal);
  const cta = ctaOr(context);

  return {
    ...tournamentStrategyFields(context, eventDays),
    report: `I packaged "${shorten(
      context.launchChange,
      70
    )}" into a ${eventDays}-day tournament aimed at ${focus}. Rules, announcement, thread, and founder replies are ready for review.`,
    sections: [
      launchThreadSection([
        `${context.productName} tournament is on. We just shipped ${lowerFirst(
          change
        )} — so we are putting it to the test for ${eventDays} days.`,
        `Why now: the recent work is all about ${context.productArea}, and the first session decides everything. Entry starts at ${cta}.`,
        `Rules are simple and ${focus} is the finish line. How to enter and full rules below.`
      ]),
      {
        blocks: [
          {
            id: "tournament-announcement",
            kind: "tweet",
            label: "Announcement",
            text: clampTweet(
              `Announcing the ${context.productName} launch tournament: ${eventDays} days, one focus — ${context.productArea}. Built on ${lowerFirst(
                change
              )}. Winners get featured in the follow-up post.`
            )
          }
        ],
        id: "tournament-announcement",
        title: "Tournament Announcement"
      },
      {
        blocks: [
          {
            id: "tournament-rules",
            kind: "note",
            label: "Rules",
            text: [
              `Format: ${eventDays}-day open event with rolling entry.`,
              `How to enter: use ${cta}, then try the newest build — ${shorten(
                context.launchChange,
                80
              )}.`,
              `Scoring: judged on ${context.productArea}, the thing the latest commits actually improved.`,
              `Window: closes ${eventDays} days after the announcement, inside the ${context.daysRemaining}-day campaign deadline.`,
              `Prizes: winner and runner-up are featured in the follow-up post and the next launch note.`,
              `Fair play: one entry per player; organiser decisions are final.`
            ].join("\n")
          }
        ],
        id: "tournament-rules",
        title: "Tournament Rules"
      },
      {
        blocks: [
          {
            id: "tournament-reply-0",
            kind: "reply",
            label: "Why should I join now?",
            text: `Because the tournament runs on the newest build — ${lowerFirst(
              change
            )}. Day-one players set the pace, and the event only counts while the window is open.`
          },
          {
            id: "tournament-reply-1",
            kind: "reply",
            label: "What changed?",
            text: `${shorten(
              context.launchChange,
              120
            )}. Recent commits centre on ${context.productArea}, and the event exists to stress-test exactly that.`
          },
          {
            id: "tournament-reply-2",
            kind: "reply",
            label: "Is this live?",
            text: `The bracket opens when the founder approves. Assets are ready; nothing posts without sign-off.`
          }
        ],
        id: "tournament-replies",
        title: "Founder Replies"
      },
      followUpSection(
        `The ${context.productName} tournament wrapped. What we learned about ${context.productArea}, who won, and what ships next — plus where ${focus} landed. Recap thread tomorrow.`
      ),
      distributionPlanSection(context)
    ],
    ...(hasAudienceResearchCapability(tournamentAgent.capabilities)
      ? { audienceResearch: audienceResearchSection(tournamentAgent, context) }
      : {}),
    specialistId: "tournament"
  };
}

function referralDelivery(context: SpecialistJobContext): SpecialistDelivery {
  const change = shorten(context.launchChange, 90);
  const focus = goalFocus(context.goal);
  const cta = ctaOr(context);

  return {
    ...referralStrategyFields(context, referralAgent.deliveryDays),
    report: `I designed an invite loop that turns each signup from ${cta} into the next one, sized for ${focus} and grounded in ${lowerFirst(
      change
    )}.`,
    sections: [
      {
        blocks: [
          {
            id: "referral-mechanics",
            kind: "note",
            label: "Mechanics",
            text: [
              `Loop: user signs up via ${cta} → gets a personal invite link → invited friend tries the newest build (${shorten(
                context.launchChange,
                70
              )}) → both unlock the reward.`,
              `Target: ${focus}; the loop pays for itself only if invited users actually reach ${context.productArea}.`,
              `Trigger: activate after the first launch post, not before — an empty loop reads as spam.`,
              `Cap: rewards stop at 5 successful invites per user to keep the ladder honest.`
            ].join("\n")
          }
        ],
        id: "referral-mechanics",
        title: "Referral Mechanics"
      },
      {
        blocks: [
          {
            id: "reward-copy",
            kind: "note",
            label: "Reward copy",
            text: `Bring a friend into ${context.productName}. When they finish their first session on the new build, you both unlock early-supporter status — capped, tracked, and honoured in the follow-up post. No points for empty signups: the invite counts when they actually reach ${context.productArea}.`
          }
        ],
        id: "reward-copy",
        title: "Reward Copy"
      },
      {
        blocks: [
          {
            id: "abuse-checks",
            kind: "note",
            label: "Abuse checklist",
            text: [
              `Reject invites where inviter and invitee share a device or wallet fingerprint.`,
              `Hold rewards until the invited user completes a real first session, not just the signup form.`,
              `Flag disposable email domains and burst signups from one source.`,
              `Cap per-user rewards (5) and review the top of the ladder manually before paying anything out.`,
              `Kill switch: pause the loop if invited-user retention drops far below organic.`
            ].join("\n")
          }
        ],
        id: "abuse-checks",
        title: "Abuse Checks"
      },
      {
        blocks: [
          {
            id: "invite-message-0",
            kind: "tweet",
            label: "Invite message — direct",
            text: clampTweet(
              `I am in ${context.productName} early — they just shipped ${lowerFirst(
                change
              )}. My invite link gets us both early-supporter status when you finish a first session: ${cta}.`
            )
          },
          {
            id: "invite-message-1",
            kind: "tweet",
            label: "Invite message — casual",
            text: clampTweet(
              `Trying ${context.productName} since the latest update (${lowerFirst(
                shorten(context.launchChange, 60)
              )}). If you join through my link we both get counted as early supporters. Takes one session.`
            )
          }
        ],
        id: "invite-messages",
        title: "Invite Messages"
      },
      followUpSection(
        `Invite loop update for ${context.productName}: real numbers on how many invites became first sessions, what that did for ${focus}, and the one thing we are changing in the reward ladder next week.`
      ),
      distributionPlanSection(context)
    ],
    ...(hasAudienceResearchCapability(referralAgent.capabilities)
      ? { audienceResearch: audienceResearchSection(referralAgent, context) }
      : {}),
    specialistId: "referral"
  };
}

function communityDelivery(context: SpecialistJobContext): SpecialistDelivery {
  const change = shorten(context.launchChange, 90);
  const focus = goalFocus(context.goal);
  const cta = ctaOr(context);

  return {
    ...communityStrategyFields(context, communityAgent.deliveryDays),
    report: `I wrote the founder-led community pack for "${shorten(
      context.launchChange,
      70
    )}": announcement, moderator note, FAQ replies, launch thread, and the follow-up.`,
    sections: [
      {
        blocks: [
          {
            id: "community-announcement",
            kind: "note",
            label: "Announcement",
            text: `${context.productName} update, from the founder: we shipped ${lowerFirst(
              change
            )}. The recent work is focused on ${context.productArea} — the part you feel in your first minutes. It is live for everyone via ${cta}. Tell us where it still feels rough; this window is for ${focus}, and honest friction reports move us faster than praise.`
          }
        ],
        id: "community-announcement",
        title: "Community Announcement"
      },
      {
        blocks: [
          {
            id: "moderator-note",
            kind: "note",
            label: "Moderator note",
            text: [
              `What shipped: ${shorten(context.launchChange, 110)} (${context.repository}).`,
              `Expected questions: what changed, whether progress carries over, and how to report bugs.`,
              `Tone: specific and calm — point to ${context.productArea} improvements, never promise features that are not in the repo.`,
              `Escalate to the founder: pricing questions, partnership offers, anything about ${focus} numbers.`,
              `Pin the announcement for the launch window, then swap in the follow-up post.`
            ].join("\n")
          }
        ],
        id: "moderator-note",
        title: "Moderator Note"
      },
      {
        blocks: [
          {
            id: "faq-reply-0",
            kind: "reply",
            label: "What actually changed?",
            text: `${shorten(
              context.launchChange,
              120
            )}. If you look at the recent commits, the theme is ${context.productArea} — that is where you will notice the difference first.`
          },
          {
            id: "faq-reply-1",
            kind: "reply",
            label: "Where do I start?",
            text: `Start at ${cta}. The newest build is the default, so your first session already includes the update.`
          },
          {
            id: "faq-reply-2",
            kind: "reply",
            label: "How do I help?",
            text: `Two ways: try the update and tell us where it feels rough, and if it lands for you, share it — this window is aimed at ${focus}.`
          }
        ],
        id: "faq-replies",
        title: "FAQ Replies"
      },
      launchThreadSection([
        `A quieter kind of launch post: ${context.productName} shipped ${lowerFirst(
          change
        )}, and the community gets it first.`,
        `The recent work is about ${context.productArea}. We would rather fix real friction than collect empty applause — that is what this window is for.`,
        `If it works for you, bring one person who would like it. Start at ${cta}.`
      ]),
      followUpSection(
        `One week after the ${context.productName} announcement: what the community flagged about ${context.productArea}, what we fixed, and where ${focus} stands. Thread with specifics tomorrow.`
      ),
      distributionPlanSection(context)
    ],
    ...(hasAudienceResearchCapability(communityAgent.capabilities)
      ? { audienceResearch: audienceResearchSection(communityAgent, context) }
      : {}),
    specialistId: "community"
  };
}

function launchThreadSection(texts: string[]): SpecialistDeliverySection {
  return {
    blocks: texts.map((text, index) => ({
      id: `thread-${index}`,
      kind: "tweet" as const,
      label: `Tweet ${index + 1}`,
      text: clampTweet(text)
    })),
    id: "launch-thread",
    title: "Launch Thread"
  };
}

function followUpSection(text: string): SpecialistDeliverySection {
  return {
    blocks: [
      {
        id: "follow-up-post",
        kind: "follow-up",
        label: "Follow-up post",
        text: clampTweet(text)
      }
    ],
    id: "follow-up-post",
    title: "Follow-up Post"
  };
}

type LaunchCategory = "crypto-web3" | "game" | "dev-tool" | "consumer-web";

// Classifies the product from the repo signal so the distribution plan can
// suggest venues that actually fit. Deliberately conservative: it only reads
// the founder's own repo text, and every venue it maps to is a well-known,
// stable launch destination — never an invented niche community.
function inferLaunchCategory(context: SpecialistJobContext): LaunchCategory {
  const hay = [
    context.productArea,
    context.repoSummary,
    context.productName,
    ...context.commitMessages
  ]
    .join(" ")
    .toLowerCase();

  if (/\b(solana|wallet|on-?chain|web3|crypto|token|nft|anchor|devnet|escrow|ethereum)\b/.test(hay)) {
    return "crypto-web3";
  }
  if (/\b(game|gameplay|player|tournament|unity|level|quest|multiplayer|arcade)\b/.test(hay)) {
    return "game";
  }
  if (/\b(api|sdk|cli|developer|library|framework|open[\s-]?source|self[\s-]?host|compiler|typescript|rust|golang)\b/.test(hay)) {
    return "dev-tool";
  }
  return "consumer-web";
}

// Canonical, well-known launch venues. Every entry here is a real, stable
// destination a founder can verify in one click — Product Hunt, Show HN,
// dev.to, itch.io, and named-but-canonical subreddits. The plan text is
// explicit that Relix has no live data on these and the founder must verify
// fit; niche targeting is handled by a search strategy, never a fabricated
// list of specific small communities.
function launchVenuesFor(
  category: LaunchCategory
): { how: string; name: string }[] {
  const universal = [
    {
      how: "submit the night before, launch at 12:01am PT, and line up your network for early upvotes and comments",
      name: "Product Hunt"
    },
    {
      how: 'title it "Show HN: <product> — <one line>", post Tue–Thu around 9am ET, and reply to every comment yourself',
      name: "Hacker News (Show HN)"
    }
  ];
  const byCategory: Record<LaunchCategory, { how: string; name: string }[]> = {
    "crypto-web3": [
      {
        how: "share in the ecosystem Discords and X spaces you are already active in — genuine builds get reposted by ecosystem accounts",
        name: "Ecosystem Discords / X spaces you already belong to"
      },
      {
        how: "read each subreddit's self-promo rules first, and lead with what shipped, not a token",
        name: "r/solana, r/CryptoCurrency, r/ethdev"
      }
    ],
    game: [
      {
        how: "post a short clip or GIF of the newest build; each subreddit enforces strict self-promo rules, so read them first",
        name: "itch.io, r/IndieGaming, r/playmygame"
      },
      {
        how: "use the #showcase or #self-promo channels with a clip and one clear ask",
        name: "Game Discords you are already in"
      }
    ],
    "dev-tool": [
      {
        how: "write a short build-in-public post about the problem and the shipped fix",
        name: "dev.to and Indie Hackers (Show IH)"
      },
      {
        how: "read each subreddit's self-promo rules, lead with the technical problem you solved, and link last",
        name: "r/SideProject, r/programming"
      }
    ],
    "consumer-web": [
      {
        how: "frame the post around the user problem, not the feature list",
        name: "Indie Hackers and subreddits your users actually read"
      },
      {
        how: "offer an early look to two or three creators whose audience matches your users",
        name: "Niche newsletters / creators in your space"
      }
    ]
  };

  return [...universal, ...byCategory[category]];
}

// The Distribution Plan: turns "Channel: X launch thread" into a concrete,
// honest where-to-post plan. Grounded in the founder's own channels + real
// launch venues, with a search strategy (not a fabricated list) for niche
// communities, and an explicit disclaimer that Relix has no live data on the
// venues. Notes only — the founder executes this, like the community brief.
function distributionPlanSection(
  context: SpecialistJobContext
): SpecialistDeliverySection {
  const link = context.launchUrl?.trim() || "your signup link";
  const category = inferLaunchCategory(context);
  const venues = launchVenuesFor(category);
  const primaryVenue = venues[0].name;
  const secondaryVenue = venues[1].name;
  const focus = goalFocus(context.goal);

  return {
    blocks: [
      {
        id: "distribution-own",
        kind: "note",
        label: "1. Start with your own channels (highest intent)",
        text: [
          "Your own audience converts best — spend the first push here before anything else:",
          "- Post the launch thread from your connected X account, then reply to every response within the first 2 hours (early replies drive reach).",
          `- Send the announcement to your existing list and anyone who already signed up at ${link}.`,
          `- Ask 5–10 people who already use ${context.productName} to repost or comment in the first hour — a cold thread rarely moves on its own.`
        ].join("\n")
      },
      {
        id: "distribution-venues",
        kind: "note",
        label: "2. Canonical venues that fit this product",
        text: [
          "Well-known launch destinations for this kind of product. Relix has no live data on these — verify each one's current rules and fit before posting:",
          ...venues.map((venue) => `- ${venue.name} — ${venue.how}.`)
        ].join("\n")
      },
      {
        id: "distribution-niche",
        kind: "note",
        label: "3. Find niche communities (search, don't guess)",
        text: [
          "The communities where your users already gather are worth more than any generic feed — find them yourself instead of trusting a guessed list:",
          `- Search Reddit for "site:reddit.com ${context.productArea}" and look for subreddits with recent activity and founder-friendly self-promo rules.`,
          `- Search X and Google for "${context.productArea} discord" and "${context.productArea} community", then join the active ones before you post.`,
          "- One relevant community you are genuinely part of beats ten drive-by posts."
        ].join("\n")
      },
      {
        id: "distribution-cadence",
        kind: "note",
        label: "4. Posting sequence — first 72 hours",
        text: [
          "Sequence it; don't blast every channel at once:",
          `- Day 1 AM: X launch thread + ${primaryVenue} + email your list.`,
          "- Day 1 (all day): reply to every comment and quote within 2 hours.",
          `- Day 2: ${secondaryVenue}; repost the thread with your best early reply pinned on top.`,
          `- Day 3: 2–3 niche communities you verified; share the follow-up post with early signs of ${focus}.`
        ].join("\n")
      }
    ],
    id: "distribution-plan",
    title: "Distribution Plan"
  };
}

const AUDIENCE_RESEARCH_CAPABILITY_ID = "audience-research";

export function hasAudienceResearchCapability(capabilities: string[]): boolean {
  return capabilities.includes(AUDIENCE_RESEARCH_CAPABILITY_ID);
}

type AudienceNiche = "consumer-web" | "crypto-web3" | "dev-tool" | "education" | "game";

// Separate from inferLaunchCategory (used by distributionPlanSection) so this
// never changes that function's behaviour. Adds an "education" bucket since
// student/study products are common and deserve their own candidates.
function inferAudienceNiche(context: SpecialistJobContext): AudienceNiche {
  const hay = [
    context.productArea,
    context.repoSummary,
    context.productName,
    context.websiteSummary,
    ...context.commitMessages
  ]
    .join(" ")
    .toLowerCase();

  if (
    /\b(stud(y|ying|ent|ents)|exam|revis|school|university|6th[\s-]?form|homework|flashcard|gcse|a[\s-]?level)\b/.test(
      hay
    )
  ) {
    return "education";
  }
  if (/\b(solana|wallet|on-?chain|web3|crypto|token|nft|anchor|devnet|escrow|ethereum)\b/.test(hay)) {
    return "crypto-web3";
  }
  if (/\b(game|gameplay|player|tournament|unity|level|quest|multiplayer|arcade)\b/.test(hay)) {
    return "game";
  }
  if (/\b(api|sdk|cli|developer|library|framework|open[\s-]?source|self[\s-]?host|compiler|typescript|rust|golang)\b/.test(hay)) {
    return "dev-tool";
  }
  return "consumer-web";
}

// Well-known, stable subreddits per niche — the same rigor as
// launchVenuesFor's canonical venues. Anything more specific than this stays
// a search query (see audienceResearchSection), never a guessed niche
// subreddit name Relix cannot verify.
function candidateSubreddits(niche: AudienceNiche): { name: string; why: string }[] {
  const byNiche: Record<AudienceNiche, { name: string; why: string }[]> = {
    "consumer-web": [
      {
        name: "r/SideProject",
        why: "General early-adopter audience for new consumer products."
      },
      {
        name: "r/Entrepreneur",
        why: "Founders and early users who follow new product launches."
      }
    ],
    "crypto-web3": [
      {
        name: "r/solana",
        why: "Active builder and user audience for Solana-native products."
      },
      {
        name: "r/CryptoCurrency",
        why: "Large, broad crypto audience — read self-promo rules first."
      }
    ],
    "dev-tool": [
      {
        name: "r/SideProject",
        why: "Builders looking for new tools, feedback, and early users."
      },
      { name: "r/programming", why: "Technical audience that reads past the headline." }
    ],
    education: [
      {
        name: "r/GetStudying",
        why: "Students actively looking for study systems and accountability tools."
      },
      {
        name: "r/productivity",
        why: "Broad productivity audience that shares new tools and workflows."
      }
    ],
    game: [
      {
        name: "r/IndieGaming",
        why: "Indie-friendly audience that engages with new builds and clips."
      },
      {
        name: "r/playmygame",
        why: "Built specifically for founders sharing a playable build for feedback."
      }
    ]
  };

  return byNiche[niche];
}

// Deterministic, honest audience research: every field comes from the
// founder's own repo/website/goal context — the same facts every other
// delivery block uses (see jobFacts in campaign-ai.ts). Deliberately excluded
// from the AI rewrite pass in generateDelivery (campaign-ai.ts only rewrites
// `report` and section block text, never this field), so it can never be
// rewritten into a fabricated claim.
function audienceResearchSection(
  agent: SpecialistAgent,
  context: SpecialistJobContext
): AudienceResearch {
  const niche = inferAudienceNiche(context);
  const cta = ctaOr(context);
  const focus = goalFocus(context.goal);
  const change = shorten(context.launchChange, 80);
  const subreddits = candidateSubreddits(niche);

  const segments: AudienceSegment[] = [
    {
      launchAngle: `Lead with what shipped: ${lowerFirst(change)}, and point straight at ${cta}.`,
      name: `People already searching for ${context.productArea}`,
      painPoint: `They're actively looking for a better way to handle ${context.productArea} and will judge the first session hard.`,
      whyTheyCare: `The newest work is built for exactly this — the highest-intent audience for ${focus}.`
    },
    {
      launchAngle: "Frame it as a build-in-public update: what changed, why, and what you learned shipping it.",
      name: "Founders and builders who follow build-in-public updates",
      painPoint: "They want proof of real progress, not a feature announcement with no substance behind it.",
      whyTheyCare: `${context.repository} shipping something real and visible is itself the story for this group.`
    },
    {
      launchAngle: "Skip the pitch — ask a direct question about the pain point, and mention the fix only once someone engages.",
      name: "Skeptics who've tried similar tools before and churned",
      painPoint: "Past tools over-promised, so they need evidence, not enthusiasm.",
      whyTheyCare: "Winning this group over converts into the most durable users if the product genuinely delivers."
    }
  ];

  const redditChannels: AudienceChannel[] = subreddits.map((sub) => ({
    firstAction: `Read ${sub.name}'s self-promo rules, then post once you can answer the community's questions directly.`,
    name: sub.name,
    platform: "Reddit",
    risk: "Self-promotion reads as spam here without a genuine answer to the community's actual problem — lead with the problem, not the product.",
    suggestedPostAngle: `"${shorten(context.launchChange, 70)}" framed as a lesson learned, not an announcement.`,
    whyRelevant: sub.why
  }));

  const nicheSearchChannel: AudienceChannel = {
    firstAction: "Search this exact query, join 1-2 active results, then post only after engaging with a few real threads.",
    name: "Candidate channel — search, don't guess",
    platform: "Reddit",
    risk: "Relix has no live data on niche subreddits — verify activity and self-promo rules before posting.",
    searchQueryOrUrl: `site:reddit.com ${context.productArea}`,
    suggestedPostAngle: `Answer the community's actual question, then mention ${cta} only if it directly answers it.`,
    whyRelevant: `Small, active communities around ${context.productArea} usually convert better than one large subreddit.`
  };

  const xChannels: AudienceChannel[] = [
    {
      firstAction: "Search this term, reply genuinely to 3-5 recent posts before posting your own.",
      name: `Search: "${context.productArea}"`,
      platform: "X",
      risk: "Cold replies read as spam without genuine engagement first — reply before you post.",
      searchQueryOrUrl: context.productArea,
      suggestedPostAngle: "Reply with a specific answer to their exact problem, then mention what shipped only if relevant.",
      whyRelevant: `Surfaces people actively talking about ${context.productArea} right now — not a guessed audience.`
    },
    {
      firstAction: "Follow 5-10 accounts in this cluster, engage for a day, then post the launch thread.",
      name: `Audience cluster: builders sharing ${context.productArea} progress`,
      platform: "X",
      risk: "This is an inferred cluster, not a verified list — confirm relevance before relying on it.",
      suggestedPostAngle: `Build-in-public framing: what shipped, why, and the ${focus} it's aimed at.`,
      whyRelevant: "This audience already follows and reshares genuine shipping updates in this space."
    }
  ];

  const channels = [...redditChannels, nicheSearchChannel, ...xChannels].slice(0, 5);

  const objections: AudienceObjection[] = [
    {
      founderReply: `${shorten(context.launchChange, 100)}. That's what changed — try it and tell us where it still feels rough.`,
      objection: "Is this just another app that will be abandoned in a few months?"
    },
    {
      founderReply: `${
        context.websiteRead
          ? `The site is explicit about what this does: "${shorten(context.websitePromise, 70)}."`
          : "It's a focused fix for one real problem, not a rebrand of an old idea."
      } Start at ${cta} and judge the first session yourself.`,
      objection: "Why should I switch from what I already use?"
    },
    {
      founderReply: `No invented numbers here — ${
        context.analyticsConnected ? context.analyticsSummary : "this launch is also the first real read on interest"
      }. Judge it from the shipped change, not a claim.`,
      objection: "Are these just made-up growth numbers?"
    }
  ];

  const first72HoursPlan = [
    `Hour 1: post in the channel closest to "${segments[0].name}", using the angle above — reply to every comment within 2 hours.`,
    "Day 1: search the X term above and reply genuinely to 3-5 real posts before posting your own.",
    "Day 2: post in the first candidate subreddit; read its rules first and lead with the problem, not the product.",
    "Day 3: revisit the niche search query, join anything active, and share the follow-up post with early signal — not invented numbers."
  ];

  return {
    channels,
    first72HoursPlan,
    objections,
    segments,
    summary: `${agent.name} mapped who is most likely to care about ${lowerFirst(
      change
    )}, where to reach them first, and the objections to expect — grounded in ${context.repository} and your goal of ${focus}. No invented traction, no verified-community claims.`
  };
}

function bidIdFor(jobId: string, specialistId: SpecialistId) {
  return `bid-${jobId}-${specialistId}`;
}

// The bid price starts at the specialist's base rate (floor) and takes a small
// premium from the founder's budget, capped at 1.2x the base rate. The cap
// keeps the real settlement amount in a devnet-payable range while still
// reflecting the specialist's actual price rather than a fixed demo figure.
function priceFromBudget(budget: number, share: number, floor: number) {
  const withPremium = Math.max(floor, budget * share);

  return Number(Math.min(withPremium, floor * 1.2).toFixed(3));
}

function ctaOr(context: SpecialistJobContext) {
  return context.websiteCta || "the signup path";
}

function goalFocus(goal: string) {
  const match = goal.match(/\d[\d,]*[^.!?]*/);

  if (match) {
    return match[0].trim();
  }

  const cleaned = goal.trim().replace(/[.!?]+$/, "");

  return cleaned ? lowerFirst(cleaned) : "the growth goal";
}

// Structured strategy fields shared by Bid and SpecialistDelivery. Always
// derived from job context the app already computed — never a fabricated
// number. successMetric in particular is always the founder's own stated
// goal, not a specialist's prediction of results.
type StrategyFields = Pick<
  Bid,
  "channel" | "successMetric" | "targetAudience" | "timing"
>;

function goalSuccessMetric(context: SpecialistJobContext) {
  return `Measured against your goal: ${goalFocus(context.goal)}`;
}

function timingLine(
  deliveryDays: number,
  daysRemaining: number,
  startNote: string
) {
  return deliveryDays >= daysRemaining
    ? `${startNote}; compressed to ~${deliveryDays} days to close inside your ${daysRemaining}-day deadline`
    : `${startNote}; delivers in ~${deliveryDays} days, inside your ${daysRemaining}-day deadline`;
}

function tournamentStrategyFields(
  context: SpecialistJobContext,
  deliveryDays: number
): StrategyFields {
  return {
    channel: `X launch thread + tournament announcement, entry via ${ctaOr(context)}`,
    successMetric: goalSuccessMetric(context),
    targetAudience: `Competitive players and fans around ${context.productArea} who need a deadline to come back`,
    timing: timingLine(
      deliveryDays,
      context.daysRemaining,
      "Opens as soon as you approve"
    )
  };
}

function referralStrategyFields(
  context: SpecialistJobContext,
  deliveryDays: number
): StrategyFields {
  return {
    channel: `Personal invite links on X/DM, seeded from users who arrive via ${ctaOr(context)}`,
    successMetric: goalSuccessMetric(context),
    targetAudience: context.analyticsAudience
      ? `Your existing signups already arriving via ${ctaOr(context)} — turned into inviters`
      : `Early users who arrive via ${ctaOr(context)} once the first launch beat lands`,
    timing: `Activates after your first launch post, not before; delivers in ~${deliveryDays} days, inside your ${context.daysRemaining}-day deadline`
  };
}

function communityStrategyFields(
  context: SpecialistJobContext,
  deliveryDays: number
): StrategyFields {
  return {
    channel: `Community announcement + founder-led replies, anchored at ${ctaOr(context)}`,
    successMetric: goalSuccessMetric(context),
    targetAudience: `Existing community members and followers — a trust-building audience, not cold traffic`,
    timing: `Starts within ~${deliveryDays} days and stays live through the full ${context.daysRemaining}-day window (built for patience, not a spike)`
  };
}

function genericStrategyFields(
  agent: SpecialistAgent,
  context: SpecialistJobContext
): StrategyFields {
  const channel = agent.capabilities.includes("invite-loops")
    ? `Invite links shared by users who arrive via ${ctaOr(context)}`
    : agent.capabilities.includes("community-briefs")
      ? `Community announcement anchored at ${ctaOr(context)}`
      : `X launch thread, entry via ${ctaOr(context)}`;

  return {
    channel,
    successMetric: goalSuccessMetric(context),
    targetAudience: `People arriving via ${ctaOr(context)}, matched to this seller's ${
      agent.capabilities.slice(0, 2).join(" and ") || "growth"
    } focus`,
    timing: timingLine(
      agent.deliveryDays,
      context.daysRemaining,
      "Starts once approved"
    )
  };
}

function shorten(value: string, max: number) {
  const text = value.trim().replace(/\s+/g, " ");

  if (!text) {
    return "the latest update";
  }

  if (text.length <= max) {
    return text;
  }

  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");

  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).trim()}…`;
}

function lowerFirst(value: string) {
  if (!value) {
    return "the latest update";
  }

  return value.charAt(0).toLowerCase() + value.slice(1);
}

function clampTweet(text: string) {
  if (text.length <= 280) {
    return text;
  }

  return `${text.slice(0, 277).trimEnd()}…`;
}
