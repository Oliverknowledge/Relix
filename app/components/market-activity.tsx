import type { ReactNode } from "react";
import {
  MARKET_ACTOR_LABEL,
  type MarketEvent,
  type MarketEventActor
} from "@/app/lib/market-events";

// Per-actor visual treatment. The buyer (Growth Employee) and the seller agents
// get distinct, consistent colours so the competition for the paid job reads at
// a glance.
const ACTOR_STYLE: Record<
  MarketEventActor,
  { dot: string; tag: string; rail: string }
> = {
  founder: {
    dot: "bg-[#0a0a0a]",
    tag: "bg-[#0a0a0a] text-white",
    rail: "border-[#0a0a0a]"
  },
  growth_employee: {
    dot: "bg-[#4f46e5]",
    tag: "bg-[#eef2ff] text-[#4338ca]",
    rail: "border-[#c7d2fe]"
  },
  marketplace: {
    dot: "bg-[#d97706]",
    tag: "bg-[#fffbeb] text-[#b45309]",
    rail: "border-[#fde68a]"
  },
  seller: {
    dot: "bg-[#7c3aed]",
    tag: "bg-[#f5f3ff] text-[#6d28d9]",
    rail: "border-[#ddd6fe]"
  },
  system: {
    dot: "bg-[#52525b]",
    tag: "bg-[#f4f4f5] text-[#52525b]",
    rail: "border-[#e4e4e7]"
  }
};

export function MarketActivityTimeline({
  events,
  footer,
  limit
}: {
  events: MarketEvent[];
  // Optional: render only the most recent `limit` events (main page's compact
  // "pulse" view). The proof page passes no limit and gets the full ledger.
  footer?: ReactNode;
  limit?: number;
}) {
  if (events.length === 0) {
    return null;
  }

  const ordered = [...events].sort((a, b) => a.seq - b.seq);
  const bidCount = ordered.filter(
    (event) => event.type === "SELLER_AGENT_BID_RECEIVED"
  ).length;
  const visible =
    typeof limit === "number" && limit > 0 ? ordered.slice(-limit) : ordered;
  const truncated = visible.length < ordered.length;

  return (
    <section className="rounded-[2rem] border hairline bg-white p-6 soft-shadow sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#a1a1aa]">
            Market activity · agent transaction
          </p>
          <h3 className="mt-1 text-lg font-semibold text-[#18181b]">
            The Growth Employee is buying growth work from seller agents
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#71717a]">
            The <span className="font-medium text-[#4338ca]">Growth Employee</span>{" "}
            (buyer agent) posts a paid job; independent{" "}
            <span className="font-medium text-[#6d28d9]">seller agents</span>{" "}
            compete with bids; the buyer recommends one and the founder makes the
            hire.
          </p>
        </div>
        <span className="whitespace-nowrap rounded-full bg-[#f4f4f5] px-3 py-1 text-xs font-medium text-[#52525b]">
          {bidCount} bid{bidCount === 1 ? "" : "s"} · {ordered.length} events
        </span>
      </div>

      {truncated ? (
        <p className="mt-3 text-xs text-[#a1a1aa]">
          Showing the latest {visible.length} of {ordered.length} events.
        </p>
      ) : null}

      <ol className="mt-6 grid gap-0">
        {visible.map((event, index) => {
          const style = ACTOR_STYLE[event.actor];
          const isLast = index === visible.length - 1;

          return (
            <li className="relative flex gap-4 pb-5 last:pb-0" key={event.id}>
              <div className="relative flex flex-col items-center">
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`}
                />
                {!isLast ? (
                  <span
                    aria-hidden="true"
                    className={`mt-1 w-px flex-1 border-l ${style.rail}`}
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${style.tag}`}
                  >
                    {MARKET_ACTOR_LABEL[event.actor]}
                  </span>
                  <code className="rounded bg-[#f4f4f5] px-1.5 py-0.5 text-[10px] font-medium tracking-tight text-[#52525b]">
                    {event.type}
                  </code>
                  <span className="text-[11px] tabular-nums text-[#a1a1aa]">
                    {formatTime(event.createdAt)}
                  </span>
                </div>

                <p className="mt-1.5 text-sm leading-6 text-[#27272a]">
                  {event.message}
                </p>

                {hasMeta(event) ? (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#71717a]">
                    {event.agentName ? (
                      <span>
                        Agent:{" "}
                        <span className="font-medium text-[#52525b]">
                          {event.agentName}
                        </span>
                      </span>
                    ) : null}
                    {event.coralSessionId ? (
                      <span>
                        CoralOS session:{" "}
                        <span className="font-mono text-[#52525b]">
                          {shortWallet(event.coralSessionId)}
                        </span>
                      </span>
                    ) : null}
                    {event.coralThreadId ? (
                      <span>
                        CoralOS thread:{" "}
                        <span className="font-mono text-[#52525b]">
                          {shortWallet(event.coralThreadId)}
                        </span>
                      </span>
                    ) : null}
                    {event.bidId ? (
                      <span>
                        Bid:{" "}
                        <span className="font-mono text-[#52525b]">
                          {event.bidId}
                        </span>
                      </span>
                    ) : null}
                    {typeof event.solAmount === "number" ? (
                      <span>
                        Amount:{" "}
                        <span className="font-medium tabular-nums text-[#52525b]">
                          {event.solAmount} SOL
                        </span>
                      </span>
                    ) : null}
                    {event.walletAddress ? (
                      <span>
                        Wallet:{" "}
                        <span className="font-mono text-[#52525b]">
                          {shortWallet(event.walletAddress)}
                        </span>
                      </span>
                    ) : null}
                    {event.txSignature ? (
                      <span>
                        Tx:{" "}
                        <span className="font-mono text-[#52525b]">
                          {shortWallet(event.txSignature)}
                        </span>
                      </span>
                    ) : null}
                    {event.explorerUrl ? (
                      <a
                        className="font-medium text-[#2563eb] underline underline-offset-2 hover:no-underline"
                        href={event.explorerUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        View on Solana Explorer
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {footer ? <div className="mt-5">{footer}</div> : null}
    </section>
  );
}

function hasMeta(event: MarketEvent): boolean {
  return Boolean(
    event.agentName ||
      typeof event.solAmount === "number" ||
      event.walletAddress ||
      event.txSignature ||
      event.explorerUrl ||
      event.bidId ||
      event.coralSessionId ||
      event.coralThreadId
  );
}

function shortWallet(value: string): string {
  return value.length > 12
    ? `${value.slice(0, 4)}…${value.slice(-4)}`
    : value;
}

function formatTime(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}
