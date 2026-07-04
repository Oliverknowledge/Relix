import { promises as fs } from "fs";
import { dataDirectory, dataPath } from "@/app/lib/data-path";
import {
  persistentKvAvailable,
  readJsonFromKv,
  writeJsonToKv
} from "@/app/lib/kv-json-store";
import { isMarketEventType, type MarketEvent } from "@/app/lib/market-events";

// Persistence for the market-activity timeline. Mirrors the published-specialist
// store: durable Vercel KV / Upstash Redis when configured, local JSON otherwise
// — so the timeline survives a refresh in either environment. Payment fields
// (txSignature/explorerUrl) are stored verbatim for when settlement is added.

const dataFile = dataPath("market-events.json");
const kvKey = "market-events";

export async function listMarketEvents(
  campaignId?: string
): Promise<MarketEvent[]> {
  const events = await readEvents();
  const filtered = campaignId
    ? events.filter((event) => event.campaignId === campaignId)
    : events;

  return filtered.sort((a, b) => a.seq - b.seq);
}

export async function appendMarketEvents(
  incoming: MarketEvent[]
): Promise<MarketEvent[]> {
  const current = await readEvents();
  const existingIds = new Set(current.map((event) => event.id));
  const additions = incoming.filter((event) => !existingIds.has(event.id));

  if (additions.length > 0) {
    await writeEvents([...current, ...additions]);
  }

  return additions;
}

/**
 * Coerces an unknown payload into a valid MarketEvent, or null when required
 * fields are missing. Keeps the API route defensive without duplicating the
 * type shape.
 */
export function sanitizeMarketEvent(value: unknown): MarketEvent | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const type = typeof record.type === "string" ? record.type : "";

  if (
    typeof record.id !== "string" ||
    typeof record.campaignId !== "string" ||
    typeof record.repository !== "string" ||
    typeof record.message !== "string" ||
    typeof record.createdAt !== "string" ||
    typeof record.seq !== "number" ||
    !isMarketEventType(type)
  ) {
    return null;
  }

  return {
    actor: normalizeActor(record.actor),
    agentName: optionalString(record.agentName),
    campaignId: record.campaignId,
    createdAt: record.createdAt,
    explorerUrl: optionalString(record.explorerUrl),
    id: record.id,
    message: record.message,
    repository: record.repository,
    seq: record.seq,
    solAmount:
      typeof record.solAmount === "number" ? record.solAmount : undefined,
    txSignature: optionalString(record.txSignature),
    type,
    walletAddress: optionalString(record.walletAddress)
  };
}

function normalizeActor(value: unknown): MarketEvent["actor"] {
  const actors = ["founder", "growth_employee", "marketplace", "seller", "system"];

  return typeof value === "string" && actors.includes(value)
    ? (value as MarketEvent["actor"])
    : "system";
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

async function readEvents(): Promise<MarketEvent[]> {
  if (persistentKvAvailable()) {
    const events = await readJsonFromKv<MarketEvent[]>(kvKey);

    return Array.isArray(events) ? events : [];
  }

  try {
    const data = await fs.readFile(dataFile, "utf8");
    const parsed = JSON.parse(data) as MarketEvent[];

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }

    throw error;
  }
}

async function writeEvents(events: MarketEvent[]) {
  if (persistentKvAvailable()) {
    await writeJsonToKv(kvKey, events);
    return;
  }

  await fs.mkdir(dataDirectory(), { recursive: true });
  await fs.writeFile(dataFile, `${JSON.stringify(events, null, 2)}\n`, "utf8");
}
