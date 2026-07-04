import type { Bid, SpecialistJobContext } from "@/app/lib/specialist-agents";

// How this campaign's buyer/seller coordination was actually performed. Surfaced
// to the UI so the Protocol Proof panel can state the truth for each run.
//   "coralos"        — local Coral Server runtime (dev/VM host)
//   "coralos-hosted" — remote hosted CoralOS backend (Vercel -> backend /market)
//   "local-fallback" — CoralOS not used; local in-process bidding
export type CoordinationMode = "coralos" | "coralos-hosted" | "local-fallback";

// A collected bid plus which CoralOS seller agent produced it.
export type CoralCollectedBid = {
  bid: Bid;
  sellerName: string;
  specialistId: string;
};

// The job file Relix writes for a session, keyed by the Coral session id and
// read by the launched agents. Kept minimal and fully serializable.
export type CoralMarketJob = {
  jobContext: SpecialistJobContext;
  jobId: string;
  sellers: { name: string; specialistId: string }[];
};

// The judge-facing proof of a CoralOS-coordinated round, surfaced on the plan
// so the Protocol Proof panel and timeline can show real ids for this run.
export type CoralProof = {
  bidIds: string[];
  buyerAgent: string;
  jobId: string;
  namespace: string;
  sellerAgents: string[];
  serverUrl: string;
  sessionId: string;
  threadId: string;
};

// The result of a real CoralOS market round: the session/thread ids and the
// bids the buyer collected from the seller agents over the market protocol.
export type CoralMarketResult = {
  bidIds: string[];
  bids: CoralCollectedBid[];
  buyerAgent: string;
  jobId: string;
  namespace: string;
  sellerAgents: string[];
  serverUrl: string;
  sessionId: string;
  threadId: string;
};
