export const DEMO_SETTLEMENT_SOL = 0.02;
export const LOW_BALANCE_SOL = 0.05;
export const FAUCET_URL = "https://faucet.solana.com/";

export function settlementAmountFor(contractAmountSol: number) {
  return Number(Math.min(contractAmountSol, DEMO_SETTLEMENT_SOL).toFixed(3));
}

export function explorerUrl(signature: string) {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}
