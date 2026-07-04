import { NextResponse, type NextRequest } from "next/server";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { appendActivity } from "@/app/lib/activity-store";
import {
  ensureTreasuryFunded,
  getTreasuryAddress,
  payFromTreasury
} from "@/app/lib/agent-treasury";
import {
  REWARD_LADDER_MAX_RUNG,
  REWARD_LADDER_TOTAL_CAP_SOL,
  nextRewardRung
} from "@/app/lib/reward-ladder";
import { appendReward, listRewards } from "@/app/lib/reward-store";
import { explorerUrl, parseSolanaAddress } from "@/app/lib/wallet";

type RewardBody = {
  campaignId?: string;
  recipient?: string;
  repository?: string;
  specialistId?: string;
  specialistName?: string;
};

export async function GET(request: NextRequest) {
  const campaignId = request.nextUrl.searchParams.get("campaignId");
  const specialistId = request.nextUrl.searchParams.get("specialistId");

  if (!campaignId || !specialistId) {
    return NextResponse.json({ rewards: [] });
  }

  const rewards = await listRewards(campaignId, specialistId);

  return NextResponse.json({
    maxRung: REWARD_LADDER_MAX_RUNG,
    paidTotalSol: paidTotal(rewards),
    rewards,
    totalCapSol: REWARD_LADDER_TOTAL_CAP_SOL,
    treasury: await safeTreasuryAddress()
  });
}

export async function POST(request: NextRequest) {
  let body: RewardBody;
  try {
    body = (await request.json()) as RewardBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const campaignId = body.campaignId?.trim();
  const specialistId = body.specialistId?.trim();
  const recipientRaw = body.recipient?.trim();

  if (!campaignId || !specialistId || !recipientRaw) {
    return NextResponse.json(
      { error: "campaignId, specialistId and recipient are required." },
      { status: 400 }
    );
  }

  const recipient = parseSolanaAddress(recipientRaw);
  if (!recipient) {
    return NextResponse.json(
      { error: "Recipient is not a valid Solana address." },
      { status: 400 }
    );
  }

  // The store is the source of truth for the cap: count prior rungs, then only
  // ever pay the next one. The client cannot skip rungs or exceed the cap.
  const paid = await listRewards(campaignId, specialistId);
  const rung = nextRewardRung(paid.length);

  if (!rung) {
    return NextResponse.json(
      {
        error: `Reward ladder is capped at ${REWARD_LADDER_MAX_RUNG} rungs (${REWARD_LADDER_TOTAL_CAP_SOL} SOL). Nothing more to pay.`
      },
      { status: 409 }
    );
  }

  const lamports = Math.round(rung.amountSol * LAMPORTS_PER_SOL);

  try {
    await ensureTreasuryFunded(lamports);
    const { signature, slot } = await payFromTreasury(recipient, lamports);

    const record = await appendReward({
      amountSol: rung.amountSol,
      campaignId,
      createdAt: new Date().toISOString(),
      id: `reward-${campaignId}-${specialistId}-${rung.rung}`,
      recipient: recipientRaw,
      rung: rung.rung,
      signature,
      specialistId
    });

    const specialistName = body.specialistName?.trim() || "Referral Specialist";
    await appendActivity([
      {
        campaign_id: campaignId,
        created_at: record.createdAt,
        id: `activity-${record.id}`,
        repository: body.repository?.trim() || "",
        status: "done",
        text: `${specialistName} reward ladder paid ${rung.amountSol} SOL (rung ${rung.rung}/${REWARD_LADDER_MAX_RUNG}) to ${shortWallet(recipientRaw)} on Solana devnet — agent-signed, no human approval.`
      }
    ]);

    const rewards = await listRewards(campaignId, specialistId);

    return NextResponse.json({
      amountSol: rung.amountSol,
      explorerUrl: explorerUrl(signature),
      maxRung: REWARD_LADDER_MAX_RUNG,
      paidTotalSol: paidTotal(rewards),
      recipient: recipientRaw,
      rewards,
      rung: rung.rung,
      signature,
      slot,
      totalCapSol: REWARD_LADDER_TOTAL_CAP_SOL,
      treasury: await safeTreasuryAddress()
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not settle the reward on-chain."
      },
      { status: 502 }
    );
  }
}

function paidTotal(rewards: { amountSol: number }[]): number {
  return Number(
    rewards.reduce((total, reward) => total + reward.amountSol, 0).toFixed(3)
  );
}

function shortWallet(address: string): string {
  return address.length > 12
    ? `${address.slice(0, 4)}…${address.slice(-4)}`
    : address;
}

async function safeTreasuryAddress(): Promise<string | null> {
  try {
    return await getTreasuryAddress();
  } catch {
    return null;
  }
}
