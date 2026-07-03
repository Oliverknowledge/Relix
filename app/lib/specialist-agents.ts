import type { SpecialistAgentAdapter } from "@/app/lib/specialist-sdk";

export type SpecialistId =
  | "creator-outreach"
  | "tournament"
  | "referral"
  | "community";

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
  createdAt: string;
  deliverables: string[];
  deliveryDays: number;
  id: string;
  jobId: string;
  priceSol: number;
  reasoning: string;
  risk: string;
  specialistId: SpecialistId;
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
  report: string;
  sections: SpecialistDeliverySection[];
  specialistId: SpecialistId;
};

export type SpecialistAgent = {
  averageRating: number;
  basePriceSol: number;
  capabilities: string[];
  createdAt: string;
  deliveryDays: number;
  id: SpecialistId;
  jobsCompleted: number;
  lastHiredAt: string | null;
  model: string;
  name: string;
  ownerName: string;
  ownerWallet: string;
  prompt: string;
  status: SpecialistAgentStatus;
  totalEarnedSol: number;
  version: string;
};

export type SpecialistReputation = {
  averageRating: number;
  jobsCompleted: number;
  lastHiredAt: string | null;
  totalEarnedSol: number;
};

const creatorOutreachAgent: SpecialistAgent = {
  id: "creator-outreach",
  name: "Creator Outreach Specialist",
  ownerName: "Mara Voss",
  ownerWallet: "5Hge1MAUcB6X5ZjukBSgtHyg7eYgsLqs3qzpLKhAkBLq",
  capabilities: [
    "creator-briefs",
    "playtest-programs",
    "outreach-lists",
    "clip-strategy"
  ],
  basePriceSol: 0.55,
  deliveryDays: 4,
  model: "claude-opus-4-8",
  version: "2.1.0",
  prompt:
    "You are Creator Outreach Specialist, an independent seller agent on the Relix marketplace. Read the founder's repository context and turn the most visible product change into a creator playtest sprint: a creator brief, an outreach angle the founder can approve, and a playtest schedule. Only propose creators whose audience matches the product area, and never contact anyone before founder approval.",
  status: "active",
  createdAt: "2026-03-05T14:00:00.000Z",
  jobsCompleted: 14,
  totalEarnedSol: 6.8,
  averageRating: 4.6,
  lastHiredAt: "2026-06-21T09:00:00.000Z"
};

const tournamentAgent: SpecialistAgent = {
  id: "tournament",
  name: "Tournament Specialist",
  ownerName: "Kenji Sato",
  ownerWallet: "5QQFQFaUnTMNsqqk8nKyqpqJM822LGV16uRScEhC4gV2",
  capabilities: [
    "launch-events",
    "tournament-design",
    "launch-threads",
    "urgency-copy"
  ],
  basePriceSol: 0.75,
  deliveryDays: 5,
  model: "claude-sonnet-5",
  version: "1.4.2",
  prompt:
    "You are Tournament Specialist, an independent seller agent on the Relix marketplace. Package the newest shipped change into a time-boxed launch tournament: event framing, rules, a launch thread, and a founder handoff plan. Anchor every claim to a commit, release, or README line, and never invent traction numbers.",
  status: "active",
  createdAt: "2026-02-11T09:30:00.000Z",
  jobsCompleted: 0,
  totalEarnedSol: 0,
  averageRating: 0,
  lastHiredAt: null
};

const referralAgent: SpecialistAgent = {
  id: "referral",
  name: "Referral Specialist",
  ownerName: "Priya Raman",
  ownerWallet: "tSU6Ddrekpgw4YV2gHTvxmXEJfPcGrCxwFT7BTGfBzs",
  capabilities: [
    "invite-loops",
    "reward-ladders",
    "abuse-review",
    "retention-hooks"
  ],
  basePriceSol: 0.42,
  deliveryDays: 3,
  model: "claude-haiku-4-5-20251001",
  version: "1.0.8",
  prompt:
    "You are Referral Specialist, an independent seller agent on the Relix marketplace. Design a simple invite loop for early users: invite framing, a reward ladder with caps, and an abuse review checklist. Recommend activation only after a launch beat has produced a seed audience, and flag any reward that could attract bot signups.",
  status: "active",
  createdAt: "2026-04-18T10:15:00.000Z",
  jobsCompleted: 8,
  totalEarnedSol: 3.1,
  averageRating: 4.2,
  lastHiredAt: "2026-06-15T13:00:00.000Z"
};

const communityAgent: SpecialistAgent = {
  id: "community",
  name: "Community Launch Specialist",
  ownerName: "Diego Fuentes",
  ownerWallet: "HU7aj5D7psSLs92CBwXDutTQVjcGoppD9TQoe4hPssWe",
  capabilities: [
    "community-briefs",
    "moderator-notes",
    "founder-replies",
    "tone-guides"
  ],
  basePriceSol: 0.35,
  deliveryDays: 4,
  model: "claude-fable-5",
  version: "3.2.1",
  prompt:
    "You are Community Launch Specialist, an independent seller agent on the Relix marketplace. Prepare founder-led community copy for the launch window: a community brief, moderator notes, and calm founder reply prompts. Keep the tone specific and grounded in what the repository actually shipped, and never announce features that are not in the code.",
  status: "active",
  createdAt: "2026-05-27T16:45:00.000Z",
  jobsCompleted: 11,
  totalEarnedSol: 4.4,
  averageRating: 4.8,
  lastHiredAt: "2026-06-26T18:30:00.000Z"
};

export const creatorOutreachSpecialist: SpecialistAgentAdapter = {
  metadata() {
    return creatorOutreachAgent;
  },
  async bid(request) {
    return creatorOutreachBid(request);
  },
  async deliver(job) {
    return creatorOutreachDelivery(job.request);
  }
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

export const specialistAdapters: SpecialistAgentAdapter[] = [
  creatorOutreachSpecialist,
  tournamentSpecialist,
  referralSpecialist,
  communityLaunchSpecialist
];

export const specialistRegistry: SpecialistAgent[] = specialistAdapters.map(
  (adapter) => adapter.metadata()
);

const agentsById = Object.fromEntries(
  specialistRegistry.map((agent) => [agent.id, agent])
) as Record<SpecialistId, SpecialistAgent>;

const adaptersById = Object.fromEntries(
  specialistAdapters.map((adapter) => [adapter.metadata().id, adapter])
) as Record<SpecialistId, SpecialistAgentAdapter>;

export function getSpecialistAgent(id: SpecialistId): SpecialistAgent {
  return agentsById[id];
}

export function getSpecialistAdapter(id: SpecialistId): SpecialistAgentAdapter {
  return adaptersById[id];
}

export function listActiveSpecialistAdapters(): SpecialistAgentAdapter[] {
  return specialistAdapters.filter(
    (adapter) => adapter.metadata().status === "active"
  );
}

export function listActiveSpecialistAgents(): SpecialistAgent[] {
  return specialistRegistry.filter((agent) => agent.status === "active");
}

export function seedReputationFor(agent: SpecialistAgent): SpecialistReputation {
  return {
    averageRating: agent.averageRating,
    jobsCompleted: agent.jobsCompleted,
    lastHiredAt: agent.lastHiredAt,
    totalEarnedSol: agent.totalEarnedSol
  };
}

export const specialistWallets = Object.fromEntries(
  specialistRegistry.map((agent) => [agent.id, agent.ownerWallet])
) as Record<SpecialistId, string>;

function creatorOutreachBid(context: SpecialistJobContext): Bid {
  const agent = agentsById["creator-outreach"];
  const change = shorten(context.launchChange, 80);
  const audienceLine = context.analyticsConnected
    ? context.analyticsAudience
      ? `Your analytics show real traffic, so creator clips convert warm visitors instead of cold ones.`
      : `Your analytics show little traffic yet, so borrowed creator audiences are the fastest honest reach.`
    : `Without analytics connected, creator clips double as your first proof of interest.`;

  return {
    createdAt: new Date().toISOString(),
    deliverables: [
      "Creator brief",
      "Creator shortlist template",
      "Outreach messages",
      "Follow-up messages",
      "Launch thread"
    ],
    deliveryDays: context.websiteRead
      ? agent.deliveryDays
      : agent.deliveryDays + 1,
    id: bidIdFor(context.jobId, agent.id),
    jobId: context.jobId,
    priceSol: priceFromBudget(context.budgetSol, 0.32, agent.basePriceSol),
    reasoning: `"${change}" is the kind of change creators can show on camera. I would brief a shortlist around ${context.productArea}, point their viewers at ${ctaOr(
      context
    )}, and let clips carry ${goalFocus(context.goal)}. ${audienceLine}`,
    risk: `Creator replies usually take 24 to 48 hours, so this is slower than a launch event. If nobody confirms by day two, the fallback is founder-recorded clips of ${lowerFirst(
      change
    )}.`,
    specialistId: agent.id
  };
}

function tournamentBid(context: SpecialistJobContext): Bid {
  const agent = agentsById.tournament;
  const change = shorten(context.launchChange, 80);
  const rushed = context.daysRemaining <= agent.deliveryDays;
  const analyticsLine = context.analyticsConnected
    ? ` ${context.analyticsSummary} — a deadline gives those visitors a reason to convert now.`
    : "";

  return {
    createdAt: new Date().toISOString(),
    deliverables: [
      "Launch thread",
      "Tournament announcement",
      "Tournament rules",
      "Founder replies",
      "Follow-up post"
    ],
    deliveryDays: rushed
      ? Math.max(2, context.daysRemaining - 1)
      : agent.deliveryDays,
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
  const agent = agentsById.referral;
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
  const agent = agentsById.community;
  const change = shorten(context.launchChange, 80);
  const websiteLine = context.websiteRead
    ? ` The site already promises "${shorten(
        context.websitePromise,
        70
      )}", so every reply can point back to it.`
    : "";

  return {
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

function creatorOutreachDelivery(
  context: SpecialistJobContext
): SpecialistDelivery {
  const change = shorten(context.launchChange, 90);
  const focus = goalFocus(context.goal);
  const cta = ctaOr(context);

  return {
    report: `I turned "${shorten(
      context.launchChange,
      70
    )}" into a creator playtest sprint: brief, shortlist template, outreach and follow-up messages, plus a launch thread for your own channel.`,
    sections: [
      {
        blocks: [
          {
            id: "creator-brief",
            kind: "note",
            label: "Creator brief",
            text: [
              `What shipped: ${shorten(context.launchChange, 110)}.`,
              `Why it matters: recent ${context.repository} work centres on ${context.productArea} — the part a first-time viewer actually experiences.`,
              `What to show on camera: a first session on the newest build, unedited hesitations included.`,
              `Where to send viewers: ${cta}.`,
              `Campaign goal: ${focus}. No paid bots, no fake engagement, founder reviews before anything goes public.`
            ].join("\n")
          }
        ],
        id: "creator-brief",
        title: "Creator Brief"
      },
      {
        blocks: [
          {
            id: "creator-shortlist",
            kind: "note",
            label: "Shortlist template",
            text: [
              `Columns: Creator / Reach / Fit / Status / Notes.`,
              `Fit test 1: audience overlaps with ${context.productArea}.`,
              `Fit test 2: has shown products like ${context.productName} on camera before.`,
              `Fit test 3: comments show viewers who try things, not just watch.`,
              `Aim for 8 to 10 names; expect 2 to 3 confirmations in the first 48 hours.`
            ].join("\n")
          }
        ],
        id: "creator-shortlist",
        title: "Creator Shortlist Template"
      },
      {
        blocks: [
          {
            id: "outreach-message-0",
            kind: "reply",
            label: "Outreach DM — short",
            text: `Hi — I work with ${context.productName} (${context.repository}). We just shipped ${lowerFirst(
              change
            )} and I think your audience would genuinely enjoy a first look. Open to a short playtest this week? Founder approves everything before it goes anywhere.`
          },
          {
            id: "outreach-message-1",
            kind: "reply",
            label: "Outreach DM — playtest angle",
            text: `Hi — inviting a small group of creators to playtest ${context.productName} before the wider push. The newest build is focused on ${context.productArea}, so a first-session video writes itself. No script, no edits required — just your honest run at ${cta}.`
          }
        ],
        id: "outreach-messages",
        title: "Outreach Messages"
      },
      {
        blocks: [
          {
            id: "follow-up-message-0",
            kind: "reply",
            label: "Follow-up — day 2",
            text: `Quick nudge on the ${context.productName} playtest — the window closes soon because the campaign is aimed at ${focus}. Happy to send a build link or answer anything first.`
          },
          {
            id: "follow-up-message-1",
            kind: "reply",
            label: "Follow-up — close the loop",
            text: `Closing the shortlist for this round of ${context.productName} playtests. If the timing is wrong, no problem — flagging that the next window opens after this launch beat ships.`
          }
        ],
        id: "follow-up-messages",
        title: "Follow-up Messages"
      },
      launchThreadSection([
        `We are opening ${context.productName} to a small group of creators this week. The newest build ships ${lowerFirst(
          change
        )} — and we want honest first sessions on camera.`,
        `Why creators first: the recent work is about ${context.productArea}, and that is judged in the first minute of play. Clips beat claims.`,
        `Want in, or want to watch? Start at ${cta}. Every playtest pushes us toward ${focus}.`
      ])
    ],
    specialistId: "creator-outreach"
  };
}

function referralDelivery(context: SpecialistJobContext): SpecialistDelivery {
  const change = shorten(context.launchChange, 90);
  const focus = goalFocus(context.goal);
  const cta = ctaOr(context);

  return {
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

function priceFromBudget(budget: number, share: number, floor: number) {
  return Number(Math.max(floor, budget * share).toFixed(2));
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
