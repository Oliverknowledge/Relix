// The second on-chain capability. The Tournament Specialist's tournament design
// ends in a real prize: this config makes that prize a capped, agent-signed
// devnet payout to a winner wallet, mirroring the reward ladder. Shared by the
// API route (server, source of truth for the cap) and the delivery UI.

export const PRIZE_PAYOUT_CAPABILITY = "prize-payouts";

export type PrizeTier = {
  amountSol: number;
  label: string;
  place: number;
};

// A small, capped prize pool paid top-down. Amounts stay devnet-payable so the
// treasury airdrop covers the whole pool.
export const PRIZE_TIERS: PrizeTier[] = [
  { place: 1, amountSol: 0.05, label: "1st place" },
  { place: 2, amountSol: 0.03, label: "2nd place" },
  { place: 3, amountSol: 0.02, label: "3rd place" }
];

export const PRIZE_MAX_PLACE = PRIZE_TIERS.length;

export const PRIZE_TOTAL_CAP_SOL = Number(
  PRIZE_TIERS.reduce((total, tier) => total + tier.amountSol, 0).toFixed(3)
);

export function prizeTier(place: number): PrizeTier | null {
  return PRIZE_TIERS.find((tier) => tier.place === place) ?? null;
}

/**
 * Given how many places have already been paid, returns the next place to pay,
 * or null when the pool is fully awarded. The server refuses to pay past
 * `PRIZE_MAX_PLACE`.
 */
export function nextPrizeTier(paidCount: number): PrizeTier | null {
  if (paidCount >= PRIZE_MAX_PLACE) {
    return null;
  }

  return prizeTier(paidCount + 1);
}

export function hasPrizePayouts(capabilities: string[]): boolean {
  return capabilities.includes(PRIZE_PAYOUT_CAPABILITY);
}
