import {
  listActiveSpecialistAdapters,
  type Bid,
  type SpecialistJobContext
} from "@/app/lib/specialist-agents";
import { runCoralMarket, CoralUnavailableError } from "@/app/lib/coralos/client";
import type { BidCollectionResult } from "@/app/lib/campaign";

// Server-only bid collector. CoralOS is the PRIMARY path: the buyer/seller
// coordination for the built-in specialists happens over the Coral market
// protocol. Any additional active specialists (e.g. published third-party
// sellers, which are not yet Coral registry agents) still bid locally and are
// merged in. If CoralOS is disabled, unreachable, or times out, the whole round
// falls back to local in-process bidding, and the plan is labeled accordingly.
export async function collectMarketBids(
  jobContext: SpecialistJobContext
): Promise<BidCollectionResult> {
  const adapters = listActiveSpecialistAdapters();
  const activeIds = new Set(adapters.map((a) => a.metadata().id));

  try {
    const result = await runCoralMarket(jobContext);
    const coralBids: Bid[] = result.bids
      .filter((b) => activeIds.has(b.specialistId))
      .map((b) => b.bid);

    if (coralBids.length === 0) {
      throw new CoralUnavailableError("no active CoralOS bids for this round");
    }

    // Bid any active specialist CoralOS did not cover (non-built-in sellers).
    const covered = new Set(coralBids.map((b) => b.specialistId));
    const extraBids = await Promise.all(
      adapters
        .filter((a) => !covered.has(a.metadata().id))
        .map((a) => a.bid(jobContext))
    );

    return {
      bids: [...coralBids, ...extraBids],
      coordinationMode: "coralos",
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
  } catch (error) {
    if (!(error instanceof CoralUnavailableError)) {
      // Unexpected error from the Coral path — still fall back so the demo
      // never breaks, but surface it in server logs for debugging.
      console.error("[coralos] unexpected market error, using local fallback:", error);
    }
    const bids = await Promise.all(adapters.map((a) => a.bid(jobContext)));
    return { bids, coordinationMode: "local-fallback" };
  }
}
