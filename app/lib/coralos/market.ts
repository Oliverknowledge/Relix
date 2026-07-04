import {
  listActiveSpecialistAdapters,
  type Bid,
  type SpecialistJobContext
} from "@/app/lib/specialist-agents";
import { runCoralMarket, CoralUnavailableError } from "@/app/lib/coralos/client";
import {
  getHostedMarketConfig,
  runHostedCoralMarket
} from "@/app/lib/coralos/hosted";
import type { CoralMarketResult, CoordinationMode } from "@/app/lib/coralos/types";
import type { BidCollectionResult } from "@/app/lib/campaign";

type Adapter = ReturnType<typeof listActiveSpecialistAdapters>[number];

// Server-only bid collector. Coordination is attempted in this order, each
// gated by env and each falling through cleanly to the next:
//   1. Hosted CoralOS backend  (CORAL_MARKET_URL + RELIX_MARKET_TOKEN)  -> "coralos-hosted"
//   2. Local Coral Server      (RELIX_CORALOS_ENABLED + CORAL_API_KEY)  -> "coralos"
//   3. Local in-process bids   (always available)                      -> "local-fallback"
// Built-in specialists coordinate over CoralOS; any other active specialist
// (e.g. published third-party sellers) still bids locally and is merged in.
export async function collectMarketBids(
  jobContext: SpecialistJobContext
): Promise<BidCollectionResult> {
  const adapters = listActiveSpecialistAdapters();
  const activeIds = new Set(adapters.map((a) => a.metadata().id));

  // 1. Hosted CoralOS backend (only when configured, e.g. on Vercel).
  if (getHostedMarketConfig()) {
    try {
      const result = await runHostedCoralMarket(jobContext);
      return toCollection(result, "coralos-hosted", adapters, activeIds, jobContext);
    } catch (error) {
      logUnexpected("hosted CoralOS", error);
    }
  }

  // 2. Local Coral Server runtime.
  try {
    const result = await runCoralMarket(jobContext);
    return toCollection(result, "coralos", adapters, activeIds, jobContext);
  } catch (error) {
    logUnexpected("local CoralOS", error);
  }

  // 3. Local in-process bidding.
  const bids = await Promise.all(adapters.map((a) => a.bid(jobContext)));
  return { bids, coordinationMode: "local-fallback" };
}

// Maps a CoralOS market result (local or hosted) into the plan's bid list +
// proof, merging local bids for any active specialist CoralOS did not cover.
async function toCollection(
  result: CoralMarketResult,
  coordinationMode: CoordinationMode,
  adapters: Adapter[],
  activeIds: Set<string>,
  jobContext: SpecialistJobContext
): Promise<BidCollectionResult> {
  const coralBids: Bid[] = result.bids
    .filter((b) => activeIds.has(b.specialistId))
    .map((b) => b.bid);

  if (coralBids.length === 0) {
    throw new CoralUnavailableError("no active CoralOS bids for this round");
  }

  const covered = new Set(coralBids.map((b) => b.specialistId));
  const extraBids = await Promise.all(
    adapters.filter((a) => !covered.has(a.metadata().id)).map((a) => a.bid(jobContext))
  );

  return {
    bids: [...coralBids, ...extraBids],
    coordinationMode,
    coralProof: {
      sessionId: result.sessionId,
      threadId: result.threadId,
      namespace: result.namespace,
      jobId: result.jobId,
      buyerAgent: result.buyerAgent,
      sellerAgents: result.sellerAgents,
      serverUrl: result.serverUrl,
      bidIds: result.bidIds
    }
  };
}

function logUnexpected(label: string, error: unknown) {
  // Expected "unavailable" conditions are silent (they just fall through);
  // anything else is logged so the fallback is debuggable, but never thrown.
  if (!(error instanceof CoralUnavailableError)) {
    console.error(`[coralos] unexpected ${label} error, falling through:`, error);
  }
}
