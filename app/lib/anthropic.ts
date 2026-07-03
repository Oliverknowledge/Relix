// Server-only. Never import this from a client component — it reads the
// ANTHROPIC_API_KEY and would leak the SDK into the browser bundle. It is
// imported only by route handlers under app/api/campaign/*.
import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function claudeConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient() {
  if (!client) {
    client = new Anthropic();
  }

  return client;
}

/**
 * Runs one specialist/buyer agent turn and parses a JSON object out of the
 * reply. Kept deliberately uniform across the four specialist models
 * (Opus 4.8, Sonnet 5, Haiku 4.5, Fable 5): no `thinking`/`effort`/sampling
 * params, since those have per-model constraints. The caller always has a
 * deterministic fallback, so any error (missing key, refusal, bad JSON) is
 * surfaced as a thrown error for the route to catch.
 */
export async function generateAgentJSON<T>({
  maxTokens = 1400,
  model,
  prompt,
  system
}: {
  maxTokens?: number;
  model: string;
  prompt: string;
  system: string;
}): Promise<T> {
  const response = await getClient().messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }]
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  return parseJsonObject<T>(text);
}

function parseJsonObject<T>(text: string): T {
  const withoutFences = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Agent did not return a JSON object.");
  }

  return JSON.parse(withoutFences.slice(start, end + 1)) as T;
}
