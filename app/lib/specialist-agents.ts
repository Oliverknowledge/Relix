export type SpecialistId =
  | "creator-outreach"
  | "tournament"
  | "referral"
  | "community";

export type SpecialistAgentStatus = "active" | "paused";

export type SpecialistAgent = {
  basePriceSol: number;
  capabilities: string[];
  createdAt: string;
  deliveryDays: number;
  id: SpecialistId;
  model: string;
  name: string;
  ownerName: string;
  ownerWallet: string;
  prompt: string;
  status: SpecialistAgentStatus;
  version: string;
};

export const specialistRegistry: SpecialistAgent[] = [
  {
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
    createdAt: "2026-03-05T14:00:00.000Z"
  },
  {
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
    createdAt: "2026-02-11T09:30:00.000Z"
  },
  {
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
    createdAt: "2026-04-18T10:15:00.000Z"
  },
  {
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
    createdAt: "2026-05-27T16:45:00.000Z"
  }
];

const agentsById = Object.fromEntries(
  specialistRegistry.map((agent) => [agent.id, agent])
) as Record<SpecialistId, SpecialistAgent>;

export function getSpecialistAgent(id: SpecialistId): SpecialistAgent {
  return agentsById[id];
}

export function listActiveSpecialistAgents(): SpecialistAgent[] {
  return specialistRegistry.filter((agent) => agent.status === "active");
}

export const specialistWallets = Object.fromEntries(
  specialistRegistry.map((agent) => [agent.id, agent.ownerWallet])
) as Record<SpecialistId, string>;
