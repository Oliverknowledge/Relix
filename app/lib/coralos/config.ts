// CoralOS runtime configuration. CoralOS is the primary market-coordination
// path when a Coral Server is reachable and configured; otherwise Relix falls
// back to local in-process bidding (clearly labeled in the UI and README).
//
// This requires a running Coral Server (a JVM process) and the Relix agent
// bundle on a Java-capable host, so it is a LOCAL demo path — it does not run
// on Vercel, where the app honestly reports "Local fallback".

export type CoralConfig = {
  apiKey: string;
  buyer: CoralAgentRef;
  namespace: string;
  sellers: CoralSellerRef[];
  serverUrl: string;
};

export type CoralAgentRef = {
  graphName: string;
  registryName: string;
  version: string;
};

export type CoralSellerRef = CoralAgentRef & {
  specialistId: string;
};

// The three built-in specialists are published to the Coral registry as seller
// agents (see scripts/coralos + ~/.coral/agents). Their graph name is the Relix
// specialist id so bids map straight back onto the app's Bid type.
const BUILT_IN_SELLERS: CoralSellerRef[] = [
  { specialistId: "tournament", graphName: "tournament", registryName: "relix-seller-tournament", version: "0.1.0" },
  { specialistId: "referral", graphName: "referral", registryName: "relix-seller-referral", version: "0.1.0" },
  { specialistId: "community", graphName: "community", registryName: "relix-seller-community", version: "0.1.0" }
];

/**
 * Returns the CoralOS config, or null when CoralOS is not enabled/reachable
 * from this environment (missing env, or running on Vercel). A null result
 * means the caller uses the labeled local fallback.
 */
export function getCoralConfig(): CoralConfig | null {
  // Never attempt the JVM coordination path on Vercel/serverless.
  if (process.env.VERCEL) {
    return null;
  }

  const enabled = process.env.RELIX_CORALOS_ENABLED === "1";
  const apiKey = process.env.CORAL_API_KEY;
  if (!enabled || !apiKey) {
    return null;
  }

  return {
    apiKey,
    serverUrl: process.env.CORAL_SERVER_URL || "http://localhost:5555",
    namespace: process.env.CORAL_NAMESPACE || "relix",
    buyer: { graphName: "buyer", registryName: "relix-buyer", version: "0.1.0" },
    sellers: BUILT_IN_SELLERS
  };
}

export const CORAL_BUILT_IN_SELLER_IDS = BUILT_IN_SELLERS.map((s) => s.specialistId);
