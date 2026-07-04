import type { ReactNode } from "react";
import type { CampaignPlan, PaymentResult } from "@/app/lib/campaign";
import { getSpecialistAgent } from "@/app/lib/specialist-agents";
import { getRelixEscrowConfig } from "@/app/lib/relix-escrow";

// Judge-facing panel: states, for THIS run, exactly how the marketplace was
// coordinated and how it settles on Solana. When CoralOS ran, it shows the real
// session/thread/bid ids from the Coral market protocol; otherwise it says
// plainly that CoralOS was not used and the local fallback ran.
export function ProtocolProofPanel({
  plan,
  payment
}: {
  plan: CampaignPlan;
  payment: PaymentResult | null;
}) {
  const hosted = plan.coordinationMode === "coralos-hosted";
  const coral =
    plan.coordinationMode === "coralos" || hosted ? plan.coralProof : undefined;
  const escrow = getRelixEscrowConfig();
  const programId = escrow.ok ? escrow.programId.toBase58() : null;
  const awardedSpecialist = getSpecialistAgent(plan.winningBid.specialistId);

  return (
    <div className="rounded-[2rem] border hairline bg-white p-6 soft-shadow sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#a1a1aa]">
            Protocol Proof
          </p>
          <h3 className="mt-1 text-lg font-semibold text-[#18181b]">
            Market coordination & settlement
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#71717a]">
            CoralOS coordinates; Anchor settles. This run&apos;s ledger for the
            chain job → bid → award → escrow funded → delivery → release/refund.
            CoralOS holds no keys and moves no money; founder approval is the
            release gate.
          </p>
        </div>
        <ModeBadge mode={plan.coordinationMode} />
      </div>

      <StrongBanner mode={plan.coordinationMode} />

      {/* Coordination layer */}
      <Section title="CoralOS market coordination">
        <Row label="Coordination mode">
          {plan.coordinationMode === "coralos-hosted"
            ? "CoralOS runtime (hosted backend)"
            : plan.coordinationMode === "coralos"
              ? "CoralOS runtime (local Coral Server)"
              : "Local fallback — CoralOS was not used for this run."}
        </Row>
        <Row label="CoralOS runtime connected">{coral ? "Yes" : "No"}</Row>
        <Row label="Buyer agent">Growth Employee{coral ? ` · "${coral.buyerAgent}"` : ""}</Row>
        <Row label="Seller agents">
          Tournament / Referral / Community
          {coral ? ` · ${coral.sellerAgents.join(", ")}` : ""}
        </Row>
        {coral ? (
          <>
            <Row label={hosted ? "Hosted CoralOS backend" : "CoralOS server"}>
              {coral.serverUrl}
            </Row>
            <Mono label="CoralOS job / session id" value={coral.jobId} />
            <Mono label="CoralOS thread id" value={coral.threadId} />
            <Mono label="CoralOS bid ids" value={coral.bidIds.join("\n")} />
          </>
        ) : (
          <p className="mt-1 text-xs leading-5 text-[#a1a1aa]">
            CoralOS was unavailable (missing runtime/env, or running on Vercel),
            so bids were produced by Relix&apos;s local in-process specialists.
            The bid, selection, and settlement below are still real.
          </p>
        )}
        <Mono
          label="Awarded bid id"
          value={`${plan.winningBid.id}  (${awardedSpecialist?.name ?? plan.winningBid.specialistId})`}
        />
      </Section>

      {/* Settlement layer */}
      <Section title="Anchor escrow settlement (Solana devnet)">
        <Row label="Settlement status">{settlementStatusLabel(payment)}</Row>
        {programId ? <Mono label="Escrow program id" value={programId} /> : null}
        {payment ? (
          <>
            <Mono label="Escrow account" value={payment.escrowAccount} explorer={payment.initializeExplorerUrl} />
            <Mono label="Escrow vault PDA" value={payment.vault} />
            <Mono label="Founder wallet" value={payment.founderWallet} />
            <Mono label="Specialist owner wallet" value={payment.specialistWallet} />
            <Mono label="Relix treasury wallet" value={payment.treasuryWallet} />
            <Row label="Total locked">{payment.settlementSol} SOL</Row>
            <Row label="Specialist payout">{payment.specialistAmountSol} SOL</Row>
            <Row label="Treasury fee">{payment.treasuryFeeSol} SOL</Row>
            {payment.initializeSignature ? (
              <Mono
                label="Init (lock) tx signature"
                value={payment.initializeSignature}
                explorer={payment.initializeExplorerUrl}
              />
            ) : null}
            {payment.releaseSignature ? (
              <Mono
                label="Release tx signature"
                value={payment.releaseSignature}
                explorer={payment.releaseExplorerUrl}
              />
            ) : null}
            {payment.refundSignature ? (
              <Mono
                label="Refund tx signature"
                value={payment.refundSignature}
                explorer={payment.refundExplorerUrl}
              />
            ) : null}
          </>
        ) : (
          <p className="mt-1 text-xs leading-5 text-[#a1a1aa]">
            Not funded yet — lock funds to settle the awarded bid on devnet.
          </p>
        )}
      </Section>

      <p className="mt-5 text-xs leading-5 text-[#a1a1aa]">
        CoralOS coordinates the buyer/seller agents; it moves no money. All
        settlement is real Solana devnet escrow via the Relix Anchor program. The
        award/escrow/settlement rows are Relix protocol records linked to the
        CoralOS session — not messages on the Coral Server.
      </p>
    </div>
  );
}

// Maps the on-chain escrow state to the four judge-facing settlement statuses.
function settlementStatusLabel(payment: PaymentResult | null): string {
  if (!payment) {
    return "Not funded";
  }
  if (payment.status === "locked") {
    return "Funded (locked in vault)";
  }
  if (payment.status === "released") {
    return "Released (specialist + treasury paid)";
  }
  if (payment.status === "refunded") {
    return "Refunded to founder";
  }
  return payment.status;
}

// Prominent, honest one-line verdict for the current run.
function StrongBanner({ mode }: { mode: CampaignPlan["coordinationMode"] }) {
  const isCoral = mode !== "local-fallback";
  const message =
    mode === "coralos-hosted"
      ? "Hosted CoralOS backend active — buyer/seller coordination ran through CoralOS."
      : mode === "coralos"
        ? "CoralOS path active — local runtime — buyer/seller coordination ran through CoralOS."
        : "Local fallback active — CoralOS was not used for this run.";
  return (
    <div
      className={`mt-5 rounded-2xl px-4 py-3 text-sm font-medium ${
        isCoral ? "bg-[#ecfdf5] text-[#065f46]" : "bg-[#fef2f2] text-[#b91c1c]"
      }`}
    >
      {message}
    </div>
  );
}

function ModeBadge({ mode }: { mode: CampaignPlan["coordinationMode"] }) {
  const isCoral = mode !== "local-fallback";
  const label =
    mode === "coralos-hosted"
      ? "Coordination mode: Hosted CoralOS"
      : mode === "coralos"
        ? "Coordination mode: CoralOS runtime"
        : "Coordination mode: Local fallback";
  return (
    <span
      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
        isCoral ? "bg-[#ecfdf5] text-[#047857]" : "bg-[#fffbeb] text-[#b45309]"
      }`}
    >
      {label}
    </span>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#a1a1aa]">
        {title}
      </p>
      <dl className="mt-3 grid gap-2">{children}</dl>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl border hairline px-4 py-2.5 text-sm">
      <dt className="text-[#71717a]">{label}</dt>
      <dd className="text-right font-medium text-[#18181b]">{children}</dd>
    </div>
  );
}

function Mono({ label, value, explorer }: { label: string; value: string; explorer?: string }) {
  return (
    <div className="rounded-2xl border hairline px-4 py-2.5 text-sm">
      <dt className="text-[#71717a]">{label}</dt>
      <dd className="mt-1 break-all font-mono text-xs leading-5 text-[#18181b] whitespace-pre-wrap">
        {value}
        {explorer ? (
          <>
            {" "}
            <Explorer href={explorer}>view</Explorer>
          </>
        ) : null}
      </dd>
    </div>
  );
}

function Explorer({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-[#2563eb] underline underline-offset-2 hover:no-underline"
    >
      {children}
    </a>
  );
}
