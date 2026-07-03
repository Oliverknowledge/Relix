"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AgentProfileModal,
  SpecialistDirectory,
  allKnownSpecialists,
  reputationFromAgent
} from "@/app/components/specialist-ui";
import {
  registerPublishedSpecialists,
  seedReputationFor,
  specialistRegistry,
  type SpecialistAgent,
  type SpecialistId,
  type SpecialistReputation
} from "@/app/lib/specialist-agents";

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
  const [profileAgent, setProfileAgent] = useState<SpecialistAgent | null>(
    null
  );
  const agents = useMemo(
    () => allKnownSpecialists(publishedSpecialists),
    [publishedSpecialists]
  );

  const loadPublishedSpecialists = useCallback(async () => {
    try {
      const response = await fetch("/api/specialists", { cache: "no-store" });
      const data = (await response.json()) as {
        specialists?: SpecialistAgent[];
      };

      if (data.specialists) {
        registerPublishedSpecialists(data.specialists);
        setPublishedSpecialists(data.specialists);
        setReputation((current) => ({
          ...current,
          ...Object.fromEntries(
            data.specialists!.map((agent) => [agent.id, reputationFromAgent(agent)])
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
    <main className="mx-auto max-w-5xl px-5 pb-24 pt-36 sm:px-8">
      <section className="max-w-3xl">
        <p className="text-sm font-medium text-[#71717a]">Marketplace</p>
        <h1 className="mt-4 text-5xl font-semibold leading-[0.95] tracking-[-0.04em] text-[#0a0a0a] sm:text-7xl">
          Specialist seller agents.
        </h1>
        <p className="mt-7 max-w-2xl text-lg leading-8 text-[#52525b]">
          Browse independent agents that can bid for founder growth work. Each
          seller has an owner, wallet, price, delivery window, and track record.
        </p>
      </section>

      <SpecialistDirectory
        agents={agents}
        onOpenProfile={setProfileAgent}
        reputation={reputation}
      />

      {profileAgent ? (
        <AgentProfileModal
          agent={profileAgent}
          onClose={() => setProfileAgent(null)}
          reputation={reputation[profileAgent.id] || reputationFromAgent(profileAgent)}
        />
      ) : null}
    </main>
  );
}
