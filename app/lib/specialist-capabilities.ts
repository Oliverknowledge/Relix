export const specialistCapabilityOptions = [
  {
    description: "Package a release or product update into a launch moment.",
    id: "launch-events",
    label: "Launch events"
  },
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
    description: "Design tournaments or competitive events around a new build.",
    id: "tournament-design",
    label: "Tournament design"
  },
  {
    description: "Prepare creator-facing briefs for playtests and launches.",
    id: "creator-briefs",
    label: "Creator briefs"
  },
  {
    description: "Plan creator playtest programs before outreach begins.",
    id: "playtest-programs",
    label: "Playtest programs"
  },
  {
    description: "Build targeted outreach lists for creators or communities.",
    id: "outreach-lists",
    label: "Outreach lists"
  },
  {
    description: "Turn gameplay or product changes into short-form clips.",
    id: "clip-strategy",
    label: "Clip strategy"
  },
  {
    description: "Design invite loops for waitlists and early users.",
    id: "invite-loops",
    label: "Invite loops"
  },
  {
    description: "Create capped reward ladders for referral campaigns.",
    id: "reward-ladders",
    label: "Reward ladders"
  },
  {
    description: "Review referral mechanics for bot or abuse risk.",
    id: "abuse-review",
    label: "Abuse review"
  },
  {
    description: "Add retention hooks after the first launch touch.",
    id: "retention-hooks",
    label: "Retention hooks"
  },
  {
    description: "Prepare community launch briefs for founder-led updates.",
    id: "community-briefs",
    label: "Community briefs"
  },
  {
    description: "Write moderation notes for campaign or launch periods.",
    id: "moderator-notes",
    label: "Moderator notes"
  },
  {
    description: "Draft calm founder replies for common launch questions.",
    id: "founder-replies",
    label: "Founder replies"
  },
  {
    description: "Define tone rules so campaign copy stays consistent.",
    id: "tone-guides",
    label: "Tone guides"
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
