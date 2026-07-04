import { NextResponse, type NextRequest } from "next/server";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { appendActivity } from "@/app/lib/activity-store";
import {
  ensureTreasuryFunded,
  getTreasuryAddress,
  payFromTreasury
} from "@/app/lib/agent-treasury";
import {
  PRIZE_MAX_PLACE,
  PRIZE_TOTAL_CAP_SOL,
  nextPrizeTier
} from "@/app/lib/prize-pool";
import { appendPrize, listPrizes } from "@/app/lib/prize-store";
import { explorerUrl, parseSolanaAddress } from "@/app/lib/wallet";

type PrizeBody = {
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
    return NextResponse.json({ prizes: [] });
  }

  const prizes = await listPrizes(campaignId, specialistId);

  return NextResponse.json({
    maxPlace: PRIZE_MAX_PLACE,
    paidTotalSol: paidTotal(prizes),
    prizes,
    totalCapSol: PRIZE_TOTAL_CAP_SOL,
    treasury: await safeTreasuryAddress()
  });
}

export async function POST(request: NextRequest) {
  let body: PrizeBody;
  try {
    body = (await request.json()) as PrizeBody;
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

  // The store is the source of truth for the cap: count prior places, then only
  // ever pay the next one. The client cannot skip places or exceed the pool.
  const paid = await listPrizes(campaignId, specialistId);
  const tier = nextPrizeTier(paid.length);

  if (!tier) {
    return NextResponse.json(
      {
        error: `Prize pool is capped at ${PRIZE_MAX_PLACE} places (${PRIZE_TOTAL_CAP_SOL} SOL). Nothing more to pay.`
      },
      { status: 409 }
    );
  }

  const lamports = Math.round(tier.amountSol * LAMPORTS_PER_SOL);

  try {
    await ensureTreasuryFunded(lamports);
    const { signature, slot } = await payFromTreasury(recipient, lamports);

    const record = await appendPrize({
      amountSol: tier.amountSol,
      campaignId,
      createdAt: new Date().toISOString(),
      id: `prize-${campaignId}-${specialistId}-${tier.place}`,
      place: tier.place,
      recipient: recipientRaw,
      signature,
      specialistId
    });

    const specialistName = body.specialistName?.trim() || "Tournament Specialist";
    await appendActivity([
      {
        campaign_id: campaignId,
        created_at: record.createdAt,
        id: `activity-${record.id}`,
        repository: body.repository?.trim() || "",
        status: "done",
        text: `${specialistName} paid the ${tier.label} prize of ${tier.amountSol} SOL to ${shortWallet(recipientRaw)} on Solana devnet — agent-signed, no human approval.`
      }
    ]);

    const prizes = await listPrizes(campaignId, specialistId);

    return NextResponse.json({
      amountSol: tier.amountSol,
      explorerUrl: explorerUrl(signature),
      maxPlace: PRIZE_MAX_PLACE,
      paidTotalSol: paidTotal(prizes),
      place: tier.place,
      prizes,
      recipient: recipientRaw,
      signature,
      slot,
      totalCapSol: PRIZE_TOTAL_CAP_SOL,
      treasury: await safeTreasuryAddress()
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not settle the prize on-chain."
      },
      { status: 502 }
    );
  }
}

function paidTotal(prizes: { amountSol: number }[]): number {
  return Number(
    prizes.reduce((total, prize) => total + prize.amountSol, 0).toFixed(3)
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
