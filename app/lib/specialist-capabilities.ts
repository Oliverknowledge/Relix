// Only capabilities whose output the app actually acts on are listed here:
// reward-ladders settles on-chain, and the rest become real X assets the
// founder can publish. Note-only "plan" capabilities were removed so a
// specialist never advertises work the app does not execute or publish.
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
