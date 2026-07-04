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
  const coral = plan.coordinationMode === "coralos" ? plan.coralProof : undefined;
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
            When available, buyer/seller coordination runs over CoralOS;
            settlement runs separately on Solana devnet through the Relix Anchor
            escrow.
          </p>
        </div>
        <ModeBadge mode={plan.coordinationMode} />
      </div>

      {/* Coordination layer */}
      <Section title="CoralOS market coordination">
        <Row label="Coordination mode">
          {coral
            ? "CoralOS runtime (Coral Server)"
            : "Local fallback — CoralOS was not used for this run."}
        </Row>
        <Row label="Buyer agent">Growth Employee{coral ? ` · "${coral.buyerAgent}"` : ""}</Row>
        <Row label="Seller agents">
          Tournament / Referral / Community
          {coral ? ` · ${coral.sellerAgents.join(", ")}` : ""}
        </Row>
        {coral ? (
          <>
            <Row label="CoralOS server">{coral.serverUrl}</Row>
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
        {programId ? <Mono label="Escrow program id" value={programId} /> : null}
        {payment ? (
          <>
            <Mono label="Escrow account" value={payment.escrowAccount} explorer={payment.initializeExplorerUrl} />
            <Mono label="Escrow vault PDA" value={payment.vault} />
            <Mono label="Founder wallet" value={payment.founderWallet} />
            <Mono label="Specialist owner wallet" value={payment.specialistWallet} />
            <Mono label="Relix treasury wallet" value={payment.treasuryWallet} />
            <Row label="Settlement status">
              <span className="capitalize">{payment.status}</span>
              {payment.status === "released"
                ? ` · ${payment.specialistAmountSol} SOL to specialist, ${payment.treasuryFeeSol} SOL to treasury`
                : payment.status === "locked"
                  ? ` · ${payment.settlementSol} SOL locked in vault`
                  : ""}
            </Row>
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              {payment.initializeExplorerUrl ? (
                <Explorer href={payment.initializeExplorerUrl}>Lock tx</Explorer>
              ) : null}
              {payment.releaseExplorerUrl ? (
                <Explorer href={payment.releaseExplorerUrl}>Release tx</Explorer>
              ) : null}
              {payment.refundExplorerUrl ? (
                <Explorer href={payment.refundExplorerUrl}>Refund tx</Explorer>
              ) : null}
            </div>
          </>
        ) : (
          <p className="mt-1 text-xs leading-5 text-[#a1a1aa]">
            No escrow yet — lock funds to settle the awarded bid on devnet.
          </p>
        )}
      </Section>
    </div>
  );
}

function ModeBadge({ mode }: { mode: CampaignPlan["coordinationMode"] }) {
  const isCoral = mode === "coralos";
  return (
    <span
      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
        isCoral
          ? "bg-[#ecfdf5] text-[#047857]"
          : "bg-[#fffbeb] text-[#b45309]"
      }`}
    >
      {isCoral ? "Coordination mode: CoralOS runtime" : "Coordination mode: Local fallback"}
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
