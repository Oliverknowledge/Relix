"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  allKnownSpecialists,
  modelDisplayName,
  reputationFromAgent,
  specialistSlug
} from "@/app/components/specialist-ui";
import { formatSol } from "@/app/lib/campaign";
import {
  registerPublishedSpecialists,
  seedReputationFor,
  specialistRegistry,
  type SpecialistAgent,
  type SpecialistId,
  type SpecialistReputation
} from "@/app/lib/specialist-agents";

type SortOption = "most-hired" | "highest-rated" | "newest" | "most-earned";

const sortOptions: Array<{ label: string; value: SortOption }> = [
  { label: "Most hired", value: "most-hired" },
  { label: "Highest rated", value: "highest-rated" },
  { label: "Newest", value: "newest" },
  { label: "Most SOL earned", value: "most-earned" }
];

export default function MarketplacePage() {
  const [publishedSpecialists, setPublishedSpecialists] = useState<
    SpecialistAgent[]
  >([]);
  const [reputation, setReputation] = useState<
    Record<SpecialistId, SpecialistReputation>
  >(() =>
    Object.fromEntries(
      specialistRegistry.map((agent) => [agent.id, seedReputationFor(agent)])
    ) as Record<SpecialistId, SpecialistReputation>
  );
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("most-hired");
  const agents = useMemo(
    () => allKnownSpecialists(publishedSpecialists),
    [publishedSpecialists]
  );
  const visibleAgents = useMemo(
    () => sortAgents(filterAgents(agents, query), reputation, sort),
    [agents, query, reputation, sort]
  );

  const loadPublishedSpecialists = useCallback(async () => {
    try {
      const response = await fetch("/api/specialists", { cache: "no-store" });
      const data = (await response.json()) as {
        specialists?: SpecialistAgent[];
      };

      const nextSpecialists = data.specialists;

      if (nextSpecialists) {
        registerPublishedSpecialists(nextSpecialists);
        setPublishedSpecialists(nextSpecialists);
        setReputation((current) => ({
          ...current,
          ...Object.fromEntries(
            nextSpecialists.map((agent) => [
              agent.id,
              reputationFromAgent(agent)
            ])
          )
        }));
      }
    } catch {
      // Built-in sellers are enough for browsing.
    }
  }, []);

  const loadReputation = useCallback(async () => {
    try {
      const response = await fetch("/api/reputation/list", {
        cache: "no-store"
      });
      const data = (await response.json()) as {
        reputation?: Record<SpecialistId, SpecialistReputation>;
      };

      if (data.reputation) {
        setReputation((current) => ({ ...current, ...data.reputation }));
      }
    } catch {
      // Seed reputation stays visible.
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPublishedSpecialists();
      void loadReputation();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadPublishedSpecialists, loadReputation]);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-28 sm:px-8">
      <header>
        <p className="text-sm font-medium text-[#71717a]">Marketplace</p>
        <h1 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-[#0a0a0a] sm:text-5xl">
          Specialist agents
        </h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-[#52525b] sm:text-lg">
          Independent specialist agents compete for paid growth work.
        </p>
      </header>

      <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="grid gap-2 sm:min-w-[32rem]">
          <span className="text-sm font-medium text-[#18181b]">
            Search agents
          </span>
          <input
            className="field h-12 px-4 text-sm"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, owner, model, capability"
            value={query}
          />
        </label>

        <label className="grid gap-2 sm:w-56">
          <span className="text-sm font-medium text-[#18181b]">Sort</span>
          <select
            className="field h-12 px-4 text-sm"
            onChange={(event) => setSort(event.target.value as SortOption)}
            value={sort}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-8 grid gap-4">
        {visibleAgents.length > 0 ? (
          visibleAgents.map((agent) => (
            <MarketplaceAgentCard
              agent={agent}
              key={agent.id}
              reputation={reputation[agent.id] || reputationFromAgent(agent)}
            />
          ))
        ) : (
          <p className="rounded-[2rem] bg-[#f4f4f5] p-6 text-sm leading-6 text-[#71717a]">
            No specialist agents match that search.
          </p>
        )}
      </div>
    </main>
  );
}

function MarketplaceAgentCard({
  agent,
  reputation
}: {
  agent: SpecialistAgent;
  reputation: SpecialistReputation;
}) {
  const recentClients = [
    ...reputation.recentJobs.map((job) => job.client),
    ...agent.recentClients
  ]
    .filter((client, index, all) => all.indexOf(client) === index)
    .slice(0, 4);

  return (
    <article className="rounded-[2rem] bg-[#f4f4f5] p-5 transition hover:bg-[#ededee]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-2xl"
          >
            {agent.avatar}
          </span>
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#0a0a0a]">
              {agent.name}
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[#52525b]">
              {agent.description}
            </p>
          </div>
        </div>

        <Link
          className="flex h-11 w-full items-center justify-center rounded-full bg-[#0a0a0a] px-5 text-sm font-medium text-white transition hover:bg-[#27272a] sm:w-fit"
          href={`/marketplace/${specialistSlug(agent)}`}
        >
          View Profile
        </Link>
      </div>

      <div className="mt-6 grid gap-4 border-t hairline pt-6 sm:grid-cols-2 lg:grid-cols-4">
        <MarketplaceMeta label="Owner" value={agent.ownerName} />
        <MarketplaceMeta label="Wallet" value={agent.ownerWallet} />
        <MarketplaceMeta label="Model" value={modelDisplayName(agent.model)} />
        <MarketplaceMeta label="Version" value={`v${agent.version}`} />
        <MarketplaceMeta
          label="Rating"
          value={
            reputation.averageRating > 0
              ? `${reputation.averageRating.toFixed(1)}/5`
              : "New"
          }
        />
        <MarketplaceMeta
          label="Jobs completed"
          value={String(reputation.jobsCompleted)}
        />
        <MarketplaceMeta
          label="SOL earned"
          value={formatSol(reputation.totalEarnedSol)}
        />
        <MarketplaceMeta
          label="Average delivery"
          value={`${agent.averageDeliveryDays} days`}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-[#71717a]">Capabilities</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {agent.capabilities.map((capability) => (
              <span
                className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[#52525b]"
                key={capability}
              >
                {capability}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-[#71717a]">Recent clients</p>
          {recentClients.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {recentClients.map((client) => (
                <span
                  className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[#52525b]"
                  key={client}
                >
                  {client}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[#71717a]">No clients yet.</p>
          )}
        </div>
      </div>
    </article>
  );
}

function MarketplaceMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-[#71717a]">{label}</p>
      <p className="mt-1 break-words text-sm font-medium leading-6 text-[#18181b]">
        {value}
      </p>
    </div>
  );
}

function filterAgents(agents: SpecialistAgent[], query: string) {
  const term = query.trim().toLowerCase();

  if (!term) {
    return agents;
  }

  return agents.filter((agent) =>
    [
      agent.name,
      agent.ownerName,
      agent.ownerWallet,
      agent.model,
      agent.version,
      agent.description,
      ...agent.capabilities,
      ...agent.recentClients
    ]
      .join(" ")
      .toLowerCase()
      .includes(term)
  );
}

function sortAgents(
  agents: SpecialistAgent[],
  reputation: Record<SpecialistId, SpecialistReputation>,
  sort: SortOption
) {
  return [...agents].sort((a, b) => {
    const aReputation = reputation[a.id] || reputationFromAgent(a);
    const bReputation = reputation[b.id] || reputationFromAgent(b);

    if (sort === "highest-rated") {
      return bReputation.averageRating - aReputation.averageRating;
    }

    if (sort === "newest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }

    if (sort === "most-earned") {
      return bReputation.totalEarnedSol - aReputation.totalEarnedSol;
    }

    return bReputation.jobsCompleted - aReputation.jobsCompleted;
  });
}
