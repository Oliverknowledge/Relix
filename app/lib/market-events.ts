// The visible, agentic transaction lifecycle of a marketplace hire. Each event
// is a typed, persisted record so the "Market Activity" timeline can replay the
// negotiation between the Growth Employee (buyer agent) and the specialist
// seller agents. Payment/escrow is intentionally NOT modelled here yet — the
// txSignature/explorerUrl fields exist so settlement events can be added later
// without a schema change.

export type MarketEventType =
  | "GROWTH_GOAL_CREATED"
  | "PRODUCT_CONTEXT_READ"
  | "LAUNCH_OPPORTUNITY_FOUND"
  | "SPECIALIST_JOB_POSTED"
  | "MARKETPLACE_NOTIFIED"
  | "SELLER_AGENT_BID_RECEIVED"
  | "GROWTH_EMPLOYEE_RECOMMENDED_SPECIALIST"
  | "FOUNDER_SELECTED_SPECIALIST"
  | "SPECIALIST_DELIVERY_RECEIVED"
  | "CAMPAIGN_ACTIVE";

// Who acted. Drives the role framing in the UI so it is obvious that the Growth
// Employee is the buyer and the specialists are competing sellers.
export type MarketEventActor =
  | "founder"
  | "growth_employee"
  | "marketplace"
  | "seller"
  | "system";

export type MarketEvent = {
  actor: MarketEventActor;
  agentName?: string;
  campaignId: string;
  createdAt: string;
  explorerUrl?: string;
  id: string;
  message: string;
  repository: string;
  seq: number;
  solAmount?: number;
  txSignature?: string;
  type: MarketEventType;
  walletAddress?: string;
};

export const MARKET_EVENT_TYPES: MarketEventType[] = [
  "GROWTH_GOAL_CREATED",
  "PRODUCT_CONTEXT_READ",
  "LAUNCH_OPPORTUNITY_FOUND",
  "SPECIALIST_JOB_POSTED",
  "MARKETPLACE_NOTIFIED",
  "SELLER_AGENT_BID_RECEIVED",
  "GROWTH_EMPLOYEE_RECOMMENDED_SPECIALIST",
  "FOUNDER_SELECTED_SPECIALIST",
  "SPECIALIST_DELIVERY_RECEIVED",
  "CAMPAIGN_ACTIVE"
];

// Default actor per event type, so callers only supply the data that varies.
export const MARKET_EVENT_ACTOR: Record<MarketEventType, MarketEventActor> = {
  GROWTH_GOAL_CREATED: "founder",
  PRODUCT_CONTEXT_READ: "growth_employee",
  LAUNCH_OPPORTUNITY_FOUND: "growth_employee",
  SPECIALIST_JOB_POSTED: "growth_employee",
  MARKETPLACE_NOTIFIED: "marketplace",
  SELLER_AGENT_BID_RECEIVED: "seller",
  GROWTH_EMPLOYEE_RECOMMENDED_SPECIALIST: "growth_employee",
  FOUNDER_SELECTED_SPECIALIST: "founder",
  SPECIALIST_DELIVERY_RECEIVED: "seller",
  CAMPAIGN_ACTIVE: "system"
};

export const MARKET_ACTOR_LABEL: Record<MarketEventActor, string> = {
  founder: "Founder",
  growth_employee: "Growth Employee · buyer agent",
  marketplace: "Marketplace",
  seller: "Seller agent",
  system: "System"
};

export function isMarketEventType(value: string): value is MarketEventType {
  return (MARKET_EVENT_TYPES as string[]).includes(value);
}

// A market event before it is assigned an id/seq/timestamp — what emit sites
// supply. `actor` defaults from the type when omitted.
export type MarketEventDraft = {
  actor?: MarketEventActor;
  agentName?: string;
  explorerUrl?: string;
  message: string;
  solAmount?: number;
  txSignature?: string;
  type: MarketEventType;
  walletAddress?: string;
};

/**
 * Materialises drafts into full, ordered events. `startSeq` keeps sequence
 * numbers monotonic across separate emit batches within one campaign, so the
 * timeline order is stable regardless of timestamp collisions.
 */
export function buildMarketEvents(
  campaignId: string,
  repository: string,
  drafts: MarketEventDraft[],
  startSeq: number
): MarketEvent[] {
  const now = Date.now();

  return drafts.map((draft, index) => {
    const seq = startSeq + index;

    return {
      actor: draft.actor ?? MARKET_EVENT_ACTOR[draft.type],
      agentName: draft.agentName,
      campaignId,
      createdAt: new Date(now + index).toISOString(),
      explorerUrl: draft.explorerUrl,
      id: `${campaignId}-${seq}-${draft.type}`,
      message: draft.message,
      repository,
      seq,
      solAmount: draft.solAmount,
      txSignature: draft.txSignature,
      type: draft.type,
      walletAddress: draft.walletAddress
    };
  });
}
