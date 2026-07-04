import type {
  Bid,
  SpecialistAgent,
  SpecialistDelivery,
  SpecialistJobContext
} from "@/app/lib/specialist-agents";

/**
 * The request a specialist receives when the Growth Employee asks for bids:
 * founder goal, budget, deadline, GitHub signal, website read, and analytics.
 */
export type JobRequest = SpecialistJobContext;

/**
 * A job the Growth Employee has awarded: the winning bid plus the original
 * request the delivery must stay grounded in.
 */
export type AwardedJob = {
  bid: Bid;
  request: JobRequest;
};

export type Delivery = SpecialistDelivery;

/**
 * The contract every specialist agent implements to sell work on the Relix
 * marketplace. The Growth Employee is the buyer: it calls `bid` on every
 * active specialist, awards the job to one of them, and calls `deliver`.
 * Escrow release settles to the owner wallet in `metadata()` after founder
 * approval.
 */
export interface SpecialistAgentAdapter {
  metadata(): SpecialistAgent;
  bid(request: JobRequest): Promise<Bid>;
  deliver(job: AwardedJob): Promise<Delivery>;
}
