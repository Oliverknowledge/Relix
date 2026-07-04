"use client";

import { useEffect, useState } from "react";
import {
  PRIZE_MAX_PLACE,
  PRIZE_TIERS,
  PRIZE_TOTAL_CAP_SOL
} from "@/app/lib/prize-pool";

type PrizeRecord = {
  amountSol: number;
  createdAt: string;
  place: number;
  signature: string;
};

type PrizeState = {
  paidTotalSol: number;
  prizes: PrizeRecord[];
  treasury: string | null;
};

export function PrizePayoutCard({
  campaignId,
  founderWallet,
  onPrizePaid,
  repository,
  specialistId,
  specialistName
}: {
  campaignId: string;
  founderWallet: string | null;
  onPrizePaid?: () => void;
  repository: string;
  specialistId: string;
  specialistName: string;
}) {
  const [state, setState] = useState<PrizeState>({
    paidTotalSol: 0,
    prizes: [],
    treasury: null
  });
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSignature, setLastSignature] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ campaignId, specialistId });

    fetch(`/api/agent/prize?${params.toString()}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: PrizeState | null) => {
        if (cancelled || !data) {
          return;
        }
        setState({
          paidTotalSol: data.paidTotalSol ?? 0,
          prizes: Array.isArray(data.prizes) ? data.prizes : [],
          treasury: data.treasury ?? null
        });
      })
      .catch(() => {
        // Non-fatal: the card still renders and the payout button retries.
      });

    return () => {
      cancelled = true;
    };
  }, [campaignId, specialistId]);

  const paidCount = state.prizes.length;
  const capped = paidCount >= PRIZE_MAX_PLACE;
  const nextTier = PRIZE_TIERS[paidCount] ?? null;

  const payNext = async () => {
    if (!founderWallet) {
      setError("Connect a devnet wallet to receive the prize payout.");
      return;
    }

    setPaying(true);
    setError(null);

    try {
      const response = await fetch("/api/agent/prize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          recipient: founderWallet,
          repository,
          specialistId,
          specialistName
        })
      });
      const data = (await response.json()) as PrizeState & {
        error?: string;
        signature?: string;
      };

      if (!response.ok) {
        setError(data.error || "Could not settle the prize on-chain.");
        return;
      }

      setState({
        paidTotalSol: data.paidTotalSol ?? 0,
        prizes: Array.isArray(data.prizes) ? data.prizes : [],
        treasury: data.treasury ?? state.treasury
      });
      setLastSignature(data.signature ?? null);
      onPrizePaid?.();
    } catch {
      setError("Network error while settling the prize. Try again.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="rounded-[2rem] border hairline bg-white p-6 soft-shadow sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#a1a1aa]">
            ⛓ On-chain capability · prize payouts
          </p>
          <h3 className="mt-1 text-lg font-semibold text-[#18181b]">
            {specialistName} awards tournament prizes on-chain
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#71717a]">
            When the tournament ends, the agent treasury signs each capped prize
            payout on Solana devnet — no human approval — and pays the winner
            wallet directly. In this demo the prize lands in your connected
            wallet so you can watch the balance rise.
          </p>
        </div>
        <span className="whitespace-nowrap rounded-full bg-[#f4f4f5] px-3 py-1 text-xs font-medium text-[#52525b]">
          {state.paidTotalSol} / {PRIZE_TOTAL_CAP_SOL} SOL paid
        </span>
      </div>

      <ol className="mt-5 grid gap-2">
        {PRIZE_TIERS.map((tier) => {
          const paidRecord = state.prizes.find(
            (prize) => prize.place === tier.place
          );
          const isNext = !paidRecord && tier.place === paidCount + 1;

          return (
            <li
              className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-sm ${
                paidRecord
                  ? "border-transparent bg-[#f0fdf4] text-[#166534]"
                  : isNext
                    ? "hairline bg-white text-[#18181b]"
                    : "border-transparent bg-[#fafafa] text-[#a1a1aa]"
              }`}
              key={tier.place}
            >
              <span className="font-medium">
                {paidRecord ? "✓ " : ""}
                {tier.label}
              </span>
              <span className="flex items-center gap-3">
                <span className="tabular-nums">{tier.amountSol} SOL</span>
                {paidRecord ? (
                  <a
                    className="underline underline-offset-2 hover:no-underline"
                    href={`https://explorer.solana.com/tx/${paidRecord.signature}?cluster=devnet`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Explorer
                  </a>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>

      {error ? (
        <p className="mt-4 rounded-2xl bg-[#fef2f2] px-4 py-3 text-sm leading-6 text-[#b91c1c]">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          className="rounded-full bg-[#0a0a0a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#27272a] disabled:opacity-50"
          disabled={paying || capped || !founderWallet}
          onClick={() => void payNext()}
          type="button"
        >
          {capped
            ? "All prizes paid"
            : paying
              ? "Settling on-chain…"
              : nextTier
                ? `Pay ${nextTier.label} prize (${nextTier.amountSol} SOL)`
                : "Pay next prize"}
        </button>
        {lastSignature ? (
          <a
            className="text-sm font-medium text-[#2563eb] underline underline-offset-2 hover:no-underline"
            href={`https://explorer.solana.com/tx/${lastSignature}?cluster=devnet`}
            rel="noreferrer"
            target="_blank"
          >
            View last payout on Explorer
          </a>
        ) : null}
      </div>

      {state.treasury ? (
        <p className="mt-4 break-all text-xs leading-5 text-[#a1a1aa]">
          Agent treasury (payer): {state.treasury}
        </p>
      ) : null}
    </div>
  );
}
