// Capabilities whose output the app actually acts on: reward-ladders and
// prize-payouts settle on-chain, most others become real X assets the
// founder can publish, and distribution-plan / audience-research are
// deliberately advice-only (Copy/Edit, no Schedule/Publish) — a specialist
// never advertises work the app does not execute, publish, or clearly label
// as founder-executed research.
export const specialistCapabilityOptions = [
  {
    description: "Write concise X launch threads grounded in product changes.",
    id: "launch-threads",
    label: "Launch threads"
  },
  {
    description: "Create time-sensitive campaign copy for short launch windows.",
    id: "urgency-copy",
    label: "Urgency copy"
  },
  {
    description: "Package a release into a time-boxed launch event with an announcement thread.",
    id: "tournament-design",
    label: "Tournament design"
  },
  {
    description: "Pay capped tournament prizes on-chain from the agent treasury.",
    id: "prize-payouts",
    label: "Prize payouts"
  },
  {
    description: "Write invite messages for waitlists and early users.",
    id: "invite-loops",
    label: "Invite loops"
  },
  {
    description: "Pay capped referral rewards on-chain from the agent treasury.",
    id: "reward-ladders",
    label: "Reward ladders"
  },
  {
    description: "Draft calm founder replies for common launch questions.",
    id: "founder-replies",
    label: "Founder replies"
  },
  {
    description: "Prepare community launch announcements for founder-led updates.",
    id: "community-briefs",
    label: "Community briefs"
  },
  {
    description:
      "Turn the launch into a concrete where-to-post plan: the founder's own channels, canonical venues matched to the product, a search strategy for niche communities, and a 72-hour posting sequence.",
    id: "distribution-plan",
    label: "Distribution plan"
  },
  {
    description:
      "Finds high-intent audiences, communities, channels, objections, and launch angles for a shipped product update.",
    id: "audience-research",
    label: "Audience research"
  }
] as const;

export type SpecialistCapabilityId =
  (typeof specialistCapabilityOptions)[number]["id"];

export const specialistCapabilityIds = specialistCapabilityOptions.map(
  (option) => option.id
);

export function isSpecialistCapabilityId(
  capability: string
): capability is SpecialistCapabilityId {
  return specialistCapabilityIds.includes(capability as SpecialistCapabilityId);
}

export function specialistCapabilityLabel(capability: string) {
  return (
    specialistCapabilityOptions.find((option) => option.id === capability)
      ?.label || capability
  );
}

// Capabilities whose output settles real value on Solana devnet. These are
// badged across the app so an on-chain action is never mistaken for copy.
export const ON_CHAIN_CAPABILITY_IDS = ["reward-ladders", "prize-payouts"];

export function isOnChainCapability(capability: string): boolean {
  return ON_CHAIN_CAPABILITY_IDS.includes(capability);
}
