export const cheapClaudeModelOptions = [
  {
    description: "Lowest cost. Good for focused, high-volume specialists.",
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5"
  },
  {
    description: "Stronger reasoning while still in the lower-cost range.",
    id: "claude-sonnet-5",
    label: "Claude Sonnet 5"
  },
  {
    description: "Stable lower-cost Sonnet option for broader campaign work.",
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6"
  }
] as const;

export type CheapClaudeModelId = (typeof cheapClaudeModelOptions)[number]["id"];

export const cheapClaudeModelIds = cheapClaudeModelOptions.map(
  (option) => option.id
);

export function isCheapClaudeModel(model: string): model is CheapClaudeModelId {
  return cheapClaudeModelIds.includes(model as CheapClaudeModelId);
}

export function cheapClaudeModelLabel(model: string) {
  return (
    cheapClaudeModelOptions.find((option) => option.id === model)?.label ||
    model
  );
}
