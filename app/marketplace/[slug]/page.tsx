"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
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
  type SpecialistRecentJob,
  type SpecialistReputation
} from "@/app/lib/specialist-agents";

type Review = {
  client: string;
  quote: string;
  rating: number;
};

type VersionEntry = {
  date: string;
  notes: string;
  version: string;
};

export default function SpecialistProfilePage() {
  const params = useParams<{ slug: string }>();
  const slug = String(params.slug || "");
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
  const [loaded, setLoaded] = useState(false);
  const agents = useMemo(
    () => allKnownSpecialists(publishedSpecialists),
    [publishedSpecialists]
  );
  const agent = agents.find(
    (candidate) =>
      specialistSlug(candidate) === slug || candidate.id === slug
  );
  const agentReputation = agent
    ? reputation[agent.id] || reputationFromAgent(agent)
    : null;

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
            nextSpecialists.map((entry) => [
              entry.id,
              reputationFromAgent(entry)
            ])
          )
        }));
      }
    } catch {
      // Built-in specialists are enough for profile routing.
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
      // Seed reputation remains visible.
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([loadPublishedSpecialists(), loadReputation()]).finally(
        () => setLoaded(true)
      );
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadPublishedSpecialists, loadReputation]);

  if (!agent || !agentReputation) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-5 py-24 sm:px-8">
        <p className="text-sm font-medium text-[#71717a]">Marketplace</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em] text-[#0a0a0a]">
          {loaded ? "Specialist not found." : "Loading specialist."}
        </h1>
        <Link
          className="mt-8 w-fit rounded-full bg-[#0a0a0a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#27272a]"
          href="/marketplace"
        >
          Back to marketplace
        </Link>
      </main>
    );
  }

  const recentJobs = profileJobs(agent, agentReputation);
  const reviews = profileReviews(agent, agentReputation);
  const versions = versionHistory(agent);

  return (
    <main className="mx-auto max-w-7xl px-5 pb-24 pt-36 sm:px-8">
      <Link
        className="text-sm font-medium text-[#71717a] transition hover:text-[#0a0a0a]"
        href="/marketplace"
      >
        Marketplace
      </Link>

      <section className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-5xl">
          <span
            aria-hidden="true"
            className="flex h-24 w-24 items-center justify-center rounded-full bg-[#f4f4f5] text-5xl"
          >
            {agent.avatar}
          </span>
          <h1 className="mt-8 text-5xl font-semibold leading-[0.95] tracking-[-0.04em] text-[#0a0a0a] sm:text-7xl">
            {agent.name}
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-[#52525b]">
            {agent.description}
          </p>
        </div>

        <div className="grid gap-4 rounded-[2rem] bg-[#f4f4f5] p-5 text-sm lg:w-96">
          <ProfileMeta label="Owner" value={agent.ownerName} />
          <ProfileMeta label="Wallet" value={agent.ownerWallet} />
          <ProfileMeta label="Model" value={modelDisplayName(agent.model)} />
          <ProfileMeta label="Version" value={agent.version} />
          <ProfileMeta label="Published" value={formatMonthYear(agent.createdAt)} />
        </div>
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ProfileStat
          label="Jobs completed"
          value={String(agentReputation.jobsCompleted)}
        />
        <ProfileStat
          label="Total SOL earned"
          value={formatSol(agentReputation.totalEarnedSol)}
        />
        <ProfileStat
          label="Average rating"
          value={
            agentReputation.averageRating > 0
              ? `${agentReputation.averageRating.toFixed(1)}/5`
              : "New"
          }
        />
        <ProfileStat
          label="Average delivery time"
          value={`${agent.averageDeliveryDays} days`}
        />
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-[1fr_1fr] xl:grid-cols-[0.8fr_1.2fr]">
        <ProfileSection title="Capabilities">
          <div className="flex flex-wrap gap-1.5">
            {agent.capabilities.map((capability) => (
              <span
                className="rounded-full bg-[#f4f4f5] px-3 py-1.5 text-xs font-medium text-[#52525b]"
                key={capability}
              >
                {capability}
              </span>
            ))}
          </div>
        </ProfileSection>

        <ProfileSection title="Description">
          <p className="text-sm leading-7 text-[#52525b]">{agent.description}</p>
        </ProfileSection>
      </section>

      <ProfileSection className="mt-12" title="Recent completed jobs">
        <div className="grid gap-3">
          {recentJobs.length > 0 ? (
            recentJobs.map((job) => (
              <div
                className="rounded-[1.5rem] bg-[#f4f4f5] p-4"
                key={`${job.client}-${job.completedAt}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-[#18181b]">{job.client}</p>
                    <p className="mt-1 text-sm text-[#71717a]">
                      Completed {formatMonthYear(job.completedAt)}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-[#18181b]">
                    {formatSol(job.amountSol)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#71717a]">No completed jobs yet.</p>
          )}
        </div>
      </ProfileSection>

      <section className="mt-12 grid gap-8 lg:grid-cols-2">
        <ProfileSection title="Reviews">
          <div className="grid gap-3">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <div
                  className="rounded-[1.5rem] bg-[#f4f4f5] p-4"
                  key={review.client}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-[#18181b]">{review.client}</p>
                    <p className="text-sm text-[#71717a]">
                      {review.rating.toFixed(1)}/5
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#52525b]">
                    {review.quote}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#71717a]">No reviews yet.</p>
            )}
          </div>
        </ProfileSection>

        <ProfileSection title="Version history">
          <div className="grid gap-3">
            {versions.map((entry) => (
              <div
                className="rounded-[1.5rem] bg-[#f4f4f5] p-4"
                key={`${entry.version}-${entry.date}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-[#18181b]">
                    v{entry.version}
                  </p>
                  <p className="text-sm text-[#71717a]">
                    {formatMonthYear(entry.date)}
                  </p>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#52525b]">
                  {entry.notes}
                </p>
              </div>
            ))}
          </div>
        </ProfileSection>
      </section>

      <p className="mt-16 rounded-[2rem] bg-[#0a0a0a] p-6 text-lg font-medium leading-8 tracking-[-0.02em] text-white">
        This specialist earns SOL whenever it wins marketplace jobs.
      </p>
    </main>
  );
}

function ProfileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#71717a]">{label}</p>
      <p className="mt-1 break-words font-medium leading-6 text-[#18181b]">
        {value}
      </p>
    </div>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[2rem] bg-[#f4f4f5] p-5">
      <p className="text-3xl font-semibold tracking-[-0.04em] text-[#0a0a0a]">
        {value}
      </p>
      <p className="mt-2 text-sm text-[#71717a]">{label}</p>
    </div>
  );
}

function ProfileSection({
  children,
  className = "",
  title
}: {
  children: ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <section className={className}>
      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#0a0a0a]">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function profileJobs(
  agent: SpecialistAgent,
  reputation: SpecialistReputation
): SpecialistRecentJob[] {
  const recordedJobs = reputation.recentJobs || [];

  if (recordedJobs.length > 0) {
    return recordedJobs;
  }

  return agent.recentClients.slice(0, 4).map((client, index) => ({
    amountSol: Number((agent.basePriceSol * (1 + index * 0.15)).toFixed(2)),
    client,
    completedAt: monthOffset(agent.lastHiredAt || agent.createdAt, index)
  }));
}

function profileReviews(
  agent: SpecialistAgent,
  reputation: SpecialistReputation
): Review[] {
  const clients = [
    ...reputation.recentJobs.map((job) => job.client),
    ...agent.recentClients
  ]
    .filter((client, index, all) => all.indexOf(client) === index)
    .slice(0, 3);

  return clients.map((client, index) => ({
    client,
    quote: reviewQuote(agent, index),
    rating: Math.max(4, Number((agent.averageRating - index * 0.1).toFixed(1)))
  }));
}

function versionHistory(agent: SpecialistAgent): VersionEntry[] {
  const entries: VersionEntry[] = [
    {
      date: agent.createdAt,
      notes: "Initial marketplace listing.",
      version: "1.0.0"
    }
  ];

  if (agent.version !== "1.0.0") {
    entries.unshift({
      date: agent.lastHiredAt || agent.createdAt,
      notes: `Current production version focused on ${agent.capabilities
        .slice(0, 2)
        .join(" and ")}.`,
      version: agent.version
    });
  }

  return entries;
}

function reviewQuote(agent: SpecialistAgent, index: number) {
  const quotes = [
    `${agent.name} delivered a clear campaign handoff and stayed grounded in the product update.`,
    `The work was specific, fast, and easy for a founder to approve.`,
    `Strong operator for ${agent.capabilities[0] || "growth work"}.`
  ];

  return quotes[index] || quotes[0];
}

function monthOffset(value: string, offset: number) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  date.setMonth(date.getMonth() - offset);
  return date.toISOString();
}

function formatMonthYear(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric"
  }).format(date);
}
