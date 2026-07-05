import Link from "next/link";
import { MarketActivityTimeline } from "@/app/components/market-activity";
import { ProofJsonBlock } from "@/app/components/proof-json";
import { ProtocolProofPanel } from "@/app/components/protocol-proof";
import { listMarketEvents } from "@/app/lib/market-event-store";
import {
  getProofReceipt,
  type ProofReceipt,
  type ProofReceiptBid
} from "@/app/lib/proof-store";
import {
  getSpecialistAgent,
  registerPublishedSpecialists
} from "@/app/lib/specialist-agents";
import { listPublishedSpecialists } from "@/app/lib/specialist-store";

// Judge/developer verification page, separate from the founder workflow on
// "/". Server-rendered from the persisted proof receipt + market-event
// ledger so the URL works cold, with no wallet or session required to view
// it. See app/lib/proof-store.ts for how the receipt is written.
export default async function ProofPage({
  params
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;

  // Same pattern as app/api/campaign/plan/route.ts — published specialists are
  // registered at runtime so getSpecialistAgent can resolve their names here.
  registerPublishedSpecialists(await listPublishedSpecialists());

  const [receipt, events] = await Promise.all([
    getProofReceipt(campaignId),
    listMarketEvents(campaignId)
  ]);

  if (!receipt) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 pb-24 pt-28 sm:px-8">
        <p className="text-sm font-medium text-[#71717a]">Proof receipt</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#0a0a0a]">
          No proof receipt found for this campaign.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-[#71717a]">
          A receipt is written the moment the Growth Employee plans a job. Run
          a campaign from the Relix home page, then open this link again.
        </p>
        <Link
          className="mt-6 inline-block rounded-full bg-[#0a0a0a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#27272a]"
          href="/"
        >
          Back to Relix
        </Link>
      </main>
    );
  }

  const awardedBidId = receipt.awardedBidId || receipt.recommendedBidId;
  const awardedBid = receipt.bids.find((bid) => bid.id === awardedBidId);
  const awardedAgent = awardedBid
    ? getSpecialistAgent(awardedBid.specialistId)
    : undefined;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 pb-24 pt-28 sm:px-8">
      <p className="text-sm font-medium text-[#71717a]">Proof receipt</p>
      <h1 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-[#0a0a0a] sm:text-5xl">
        {receipt.repository || "Relix campaign"}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-[#52525b]">
        CoralOS coordinated the buyer/seller market. Anchor settled escrow on
        Solana devnet. Founder approval was the safety release gate.
      </p>
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#71717a]">
        <span>
          Campaign:{" "}
          <span className="font-mono text-[#27272a]">{receipt.campaignId}</span>
        </span>
        <span>
          Goal: <span className="text-[#27272a]">{receipt.goal}</span>
        </span>
        <span>
          Budget: <span className="text-[#27272a]">{receipt.budgetSol} SOL</span>
        </span>
        <span>
          Created:{" "}
          <span className="text-[#27272a]">
            {new Date(receipt.createdAt).toLocaleString()}
          </span>
        </span>
        <span>
          Updated:{" "}
          <span className="text-[#27272a]">
            {new Date(receipt.updatedAt).toLocaleString()}
          </span>
        </span>
        {awardedAgent ? (
          <span>
            Awarded:{" "}
            <span className="text-[#27272a]">{awardedAgent.name}</span>
          </span>
        ) : null}
      </div>

      <div className="mt-8">
        <ProtocolProofPanel
          events={events}
          payment={receipt.payment || null}
          plan={{
            coordinationMode: receipt.coordinationMode,
            coralProof: receipt.coralProof,
            winningBid: {
              id: awardedBidId,
              specialistId: awardedBid?.specialistId || ""
            }
          }}
          readiness={receipt.readiness || null}
        />
      </div>

      <div className="mt-6">
        <SpecialistMarketSection awardedBidId={awardedBidId} receipt={receipt} />
      </div>

      <div className="mt-6">
        <MarketActivityTimeline events={events} />
      </div>

      <div className="mt-6">
        <ProofJsonBlock json={JSON.stringify(receipt, null, 2)} />
      </div>
    </main>
  );
}

function SpecialistMarketSection({
  awardedBidId,
  receipt
}: {
  awardedBidId: string;
  receipt: ProofReceipt;
}) {
  if (receipt.bids.length === 0) {
    return null;
  }

  return (
    <div className="rounded-[2rem] border hairline bg-white p-6 soft-shadow sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#a1a1aa]">
        Specialist market
      </p>
      <h3 className="mt-1 text-lg font-semibold text-[#18181b]">
        {receipt.bids.length} seller agent{receipt.bids.length === 1 ? "" : "s"}{" "}
        bid on this job
      </h3>
      <div className="mt-4 grid gap-3">
        {receipt.bids.map((bid) => (
          <SpecialistBidRow
            awarded={bid.id === awardedBidId}
            bid={bid}
            key={bid.id}
          />
        ))}
      </div>
    </div>
  );
}

function SpecialistBidRow({
  awarded,
  bid
}: {
  awarded: boolean;
  bid: ProofReceiptBid;
}) {
  const agent = getSpecialistAgent(bid.specialistId);
  const muted = awarded ? "text-[#a1a1aa]" : "text-[#71717a]";

  return (
    <div
      className={`rounded-2xl border hairline p-4 text-sm ${
        awarded ? "bg-[#0a0a0a] text-white" : "bg-white text-[#0a0a0a]"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">
          {agent?.name || bid.specialistId}
          {awarded ? " · Awarded" : ""}
        </p>
        <p className={muted}>
          {bid.priceSol} SOL · ~{bid.deliveryDays}-day ETA
        </p>
      </div>
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <p>
          <span className={muted}>Audience: </span>
          {bid.targetAudience}
        </p>
        <p>
          <span className={muted}>Channel: </span>
          {bid.channel}
        </p>
        <p>
          <span className={muted}>Timing: </span>
          {bid.timing}
        </p>
        <p>
          <span className={muted}>Success metric: </span>
          {bid.successMetric}
        </p>
      </div>
      <p
        className={`mt-3 text-xs leading-5 ${
          awarded ? "text-[#d4d4d8]" : "text-[#52525b]"
        }`}
      >
        {bid.reasoning}
      </p>
      <p
        className={`mt-1 text-xs leading-5 ${
          awarded ? "text-[#fecaca]" : "text-[#b91c1c]"
        }`}
      >
        Risk: {bid.risk}
      </p>
    </div>
  );
}
