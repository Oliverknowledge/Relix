// The reward ladder is the one specialist capability that settles real value
// on-chain. The Referral Specialist owns the `reward-ladders` capability, and
// this config makes that deliverable executable: each rung pays a capped devnet
// reward from the agent treasury to a referrer wallet. Shared by the API route
// (server, source of truth for the cap) and the delivery UI.

export const REWARD_LADDER_CAPABILITY = "reward-ladders";

export type RewardRung = {
  amountSol: number;
  label: string;
  rung: number;
};

// A capped, escalating ladder. Amounts stay small so the whole ladder is
// devnet-payable and the treasury airdrop covers it comfortably.
export const REWARD_LADDER_RUNGS: RewardRung[] = [
  { rung: 1, amountSol: 0.01, label: "1st confirmed invite" },
  { rung: 2, amountSol: 0.02, label: "2nd confirmed invite" },
  { rung: 3, amountSol: 0.03, label: "3rd confirmed invite" },
  { rung: 4, amountSol: 0.04, label: "4th confirmed invite" },
  { rung: 5, amountSol: 0.05, label: "5th confirmed invite (ladder capped)" }
];

export const REWARD_LADDER_MAX_RUNG = REWARD_LADDER_RUNGS.length;

export const REWARD_LADDER_TOTAL_CAP_SOL = Number(
  REWARD_LADDER_RUNGS.reduce((total, rung) => total + rung.amountSol, 0).toFixed(
    3
  )
);

export function rewardRung(rung: number): RewardRung | null {
  return REWARD_LADDER_RUNGS.find((entry) => entry.rung === rung) ?? null;
}

/**
 * Given how many rungs have already been paid, returns the next rung to pay,
 * or null when the ladder is fully capped. This is the abuse cap made real:
 * the server refuses to pay past `REWARD_LADDER_MAX_RUNG`.
 */
export function nextRewardRung(paidCount: number): RewardRung | null {
  if (paidCount >= REWARD_LADDER_MAX_RUNG) {
    return null;
  }

  return rewardRung(paidCount + 1);
}

export function hasRewardLadder(capabilities: string[]): boolean {
  return capabilities.includes(REWARD_LADDER_CAPABILITY);
}
