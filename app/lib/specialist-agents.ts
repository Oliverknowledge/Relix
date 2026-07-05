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

export type SpecialistDelivery = {
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
    "urgency-copy"
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
  capabilities: ["invite-loops", "reward-ladders"],
  basePriceSol: 0.42,
  deliveryDays: 3,
  model: "claude-haiku-4-5",
  version: "1.0.8",
  prompt:
    "You are Referral Specialist, an independent seller agent on the Relix marketplace. Design a simple invite loop for early users: invite framing, a reward ladder with caps, and an abuse review checklist. Recommend activation only after a launch beat has produced a seed audience, and flag any reward that could attract bot signups.",
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
  capabilities: ["community-briefs", "founder-replies"],
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
    )}.`,
    risk: `This is a newer published seller, so it has less marketplace history than established specialists. The plan stays grounded in ${context.repository} and your goal to limit that risk.`,
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
    specialistId: agent.id
  };
}

function genericDeliverables(agent: SpecialistAgent) {
  const fromCapabilities = agent.capabilities
    .slice(0, 3)
    .map((capability) => capabilityLabel(capability));

  return [...new Set([...fromCapabilities, "Launch thread", "Follow-up post"])];
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
      "Follow-up post"
    ],
    deliveryDays: agent.deliveryDays,
    id: bidIdFor(context.jobId, agent.id),
    jobId: context.jobId,
    priceSol: priceFromBudget(context.budgetSol, 0.26, agent.basePriceSol),
    reasoning: `Every signup from ${ctaOr(
      context
    )} can invite the next one. ${audienceLine}`,
    risk: `Referral rewards attract bots before they attract fans, so the mechanics ship with caps and an abuse checklist. This loop works best as the second beat, after something announces ${lowerFirst(
      change
    )}.`,
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
      )
    ],
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
      )
    ],
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
      )
    ],
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
