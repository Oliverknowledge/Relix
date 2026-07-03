import { PublicKey } from "@solana/web3.js";

// Settlement is devnet-only. The endpoint in app/providers.tsx is hardcoded to
// clusterApiUrl("devnet") and the explorer link below pins ?cluster=devnet.
export const DEMO_SETTLEMENT_SOL = 0.02;
export const LOW_BALANCE_SOL = 0.05;
export const FAUCET_URL = "https://faucet.solana.com/";

export function settlementAmountFor(contractAmountSol: number) {
  return Number(Math.min(contractAmountSol, DEMO_SETTLEMENT_SOL).toFixed(3));
}

export function explorerUrl(signature: string) {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

/**
 * Returns the parsed PublicKey when `address` is a valid Solana public key,
 * or null when it is not. Used before settlement and when specialists are
 * published, so payment never targets a malformed owner wallet.
 */
export function parseSolanaAddress(address: string): PublicKey | null {
  try {
    return new PublicKey(address.trim());
  } catch {
    return null;
  }
}
