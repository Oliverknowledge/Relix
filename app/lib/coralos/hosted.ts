import { CoralUnavailableError } from "@/app/lib/coralos/client";
import type { CoralCollectedBid, CoralMarketResult } from "@/app/lib/coralos/types";
import type { SpecialistJobContext } from "@/app/lib/specialist-agents";

// Optional REMOTE coordination path. When CORAL_MARKET_URL + RELIX_MARKET_TOKEN
// are set (e.g. on Vercel), Relix calls a hosted CoralOS backend that runs the
// whole market round inside its own container (Coral Server + agents + shared
// filesystem) and returns the bids + proof as JSON. This never runs the JVM or
// touches escrow — it is purely buyer/seller coordination over the hosted
// CoralOS runtime, with the same fallback guarantees as the local path.

// Strict wall-clock budget for the hosted round. A launched market round is a
// few seconds; this leaves headroom while staying under typical serverless
// limits so a slow/hung backend still falls back cleanly.
const HOSTED_TIMEOUT_MS = 25000;

export type HostedMarketConfig = {
  marketUrl: string;
  token: string;
};

/**
 * Returns the hosted-backend config, or null when it is not configured (so the
 * caller uses the local CoralOS path / local fallback instead).
 */
export function getHostedMarketConfig(): HostedMarketConfig | null {
  const marketUrl = process.env.CORAL_MARKET_URL?.trim();
  const token = process.env.RELIX_MARKET_TOKEN?.trim();
  if (!marketUrl || !token) {
    return null;
  }
  return { marketUrl, token };
}

type HostedMarketResponse = {
  bids?: CoralCollectedBid[];
  buyerAgent?: string;
  bidIds?: string[];
  jobId?: string;
  namespace?: string;
  sellerAgents?: string[];
  serverUrl?: string;
  sessionId?: string;
  threadId?: string;
};

/**
 * Runs one CoralOS market round on the hosted backend. Returns the collected
 * bids and CoralOS proof ids exactly like the local path.
 *
 * @throws CoralUnavailableError if the backend is not configured, unreachable,
 *   times out, or returns no bids — so the caller falls back to local bidding.
 */
export async function runHostedCoralMarket(
  jobContext: SpecialistJobContext
): Promise<CoralMarketResult> {
  const config = getHostedMarketConfig();
  if (!config) {
    throw new CoralUnavailableError("Hosted CoralOS backend is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HOSTED_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(config.marketUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`
      },
      body: JSON.stringify({ jobContext }),
      signal: controller.signal
    });
  } catch (error) {
    throw new CoralUnavailableError(
      `Hosted CoralOS backend unreachable: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new CoralUnavailableError(
      `Hosted CoralOS backend ${config.marketUrl} -> ${response.status} ${await response
        .text()
        .catch(() => "")}`
    );
  }

  let data: HostedMarketResponse;
  try {
    data = (await response.json()) as HostedMarketResponse;
  } catch {
    throw new CoralUnavailableError("Hosted CoralOS backend returned invalid JSON");
  }

  const bids = data.bids ?? [];
  if (
    !data.sessionId ||
    !data.threadId ||
    !Array.isArray(bids) ||
    bids.length === 0
  ) {
    throw new CoralUnavailableError("Hosted CoralOS backend returned no bids");
  }

  return {
    sessionId: data.sessionId,
    threadId: data.threadId,
    jobId: data.jobId ?? data.sessionId,
    namespace: data.namespace ?? "relix",
    buyerAgent: data.buyerAgent ?? "buyer",
    sellerAgents: data.sellerAgents ?? bids.map((b) => b.sellerName),
    // Report the public hosted backend URL as the "server" so the proof panel
    // shows where coordination ran (not the container-internal localhost).
    serverUrl: config.marketUrl,
    bids,
    bidIds: data.bidIds ?? bids.map((b) => b.bid.id)
  };
}
