"use client";

import { useState, type ReactNode } from "react";
import { CapabilityChip } from "@/app/components/capability-chip";
import { formatSol } from "@/app/lib/campaign";
import { specialistCapabilityOptions } from "@/app/lib/specialist-capabilities";
import {
  specialistRegistry,
  type SpecialistAgent,
  type SpecialistReputation
} from "@/app/lib/specialist-agents";
import {
  cheapClaudeModelLabel,
  cheapClaudeModelOptions
} from "@/app/lib/specialist-models";

export type PublishSpecialistFormValues = {
  basePriceSol: string;
  capabilities: string;
  deliveryDays: string;
  description: string;
  model: string;
  name: string;
  ownerName: string;
  ownerWallet: string;
  prompt: string;
};

export const emptyPublishForm: PublishSpecialistFormValues = {
  basePriceSol: "0.5",
  capabilities: "",
  deliveryDays: "4",
  description: "",
  model: "claude-haiku-4-5",
  name: "",
  ownerName: "",
  ownerWallet: "",
  prompt: ""
};

export function SpecialistDirectory({
  agents,
  onOpenProfile,
  reputation
}: {
  agents: SpecialistAgent[];
  onOpenProfile: (agent: SpecialistAgent) => void;
  reputation: Record<string, SpecialistReputation>;
}) {
  return (
    <div className="mt-12 grid gap-3">
      {agents.map((agent) => {
        const record = reputation[agent.id] || reputationFromAgent(agent);

        return (
          <button
            className="group rounded-[2rem] bg-[#f4f4f5] p-5 text-left transition hover:bg-[#ededee]"
            key={agent.id}
            onClick={() => onOpenProfile(agent)}
            type="button"
          >
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex min-w-0 gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-xl"
                >
                  {agent.avatar}
                </span>
                <div className="min-w-0">
                  <p className="text-xl font-semibold tracking-[-0.03em] text-[#0a0a0a] underline-offset-4 group-hover:underline">
                    {agent.name}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#52525b]">
                    {agent.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {agent.capabilities.slice(0, 4).map((capability) => (
                      <CapabilityChip
                        baseClassName="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[#52525b]"
                        capability={capability}
                        key={capability}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid shrink-0 grid-cols-2 gap-4 text-right text-xs text-[#71717a] sm:grid-cols-4">
                <DirectoryMetric label="Owner" value={agent.ownerName} />
                <DirectoryMetric
                  label="Base price"
                  value={formatSol(agent.basePriceSol)}
                />
                <DirectoryMetric
                  label="Delivery"
                  value={`${agent.deliveryDays} days`}
                />
                <DirectoryMetric
                  label="Reputation"
                  value={
                    record.averageRating > 0
                      ? `${record.averageRating.toFixed(1)}/5`
                      : "new"
                  }
                />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function PublishSpecialistForm({
  isPublishing,
  onPublish,
  publishMessage
}: {
  isPublishing: boolean;
  onPublish: (input: PublishSpecialistFormValues) => Promise<boolean>;
  publishMessage: string | null;
}) {
  const [values, setValues] = useState<PublishSpecialistFormValues>(
    emptyPublishForm
  );
  const selectedModel = cheapClaudeModelOptions.find(
    (option) => option.id === values.model
  );
  const selectedCapabilities = parseCapabilities(values.capabilities);
  const selectedCapabilitySet = new Set(selectedCapabilities);
  const update = (field: keyof PublishSpecialistFormValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));
  const toggleCapability = (capability: string) => {
    const nextCapabilities = selectedCapabilitySet.has(capability)
      ? selectedCapabilities.filter((item) => item !== capability)
      : [...selectedCapabilities, capability];

    update("capabilities", nextCapabilities.join(", "));
  };

  return (
    <div className="rounded-[2rem] border hairline bg-white p-5 soft-shadow sm:p-6">
      <form
        className="grid gap-3.5"
        onSubmit={(event) => {
          event.preventDefault();
          void onPublish(values).then((ok) => {
            if (ok) {
              setValues(emptyPublishForm);
            }
          });
        }}
      >
        <PublishField label="Agent name">
          <input
            className="field h-11 px-4 text-sm"
            onChange={(event) => update("name", event.target.value)}
            placeholder="e.g. Launch Video Specialist"
            required
            value={values.name}
          />
        </PublishField>

        <div className="grid gap-3.5 sm:grid-cols-2 sm:items-start">
          <PublishField label="Owner">
            <input
              className="field h-11 px-4 text-sm"
              onChange={(event) => update("ownerName", event.target.value)}
              placeholder="Your name or studio"
              required
              value={values.ownerName}
            />
          </PublishField>
          <PublishField label="Wallet">
            <input
              className="field h-11 px-4 text-sm"
              onChange={(event) => update("ownerWallet", event.target.value)}
              placeholder="Solana address for payouts"
              required
              value={values.ownerWallet}
            />
          </PublishField>
        </div>

        <PublishField label="Description">
          <textarea
            className="field min-h-20 resize-y px-4 py-3 text-sm leading-6"
            onChange={(event) => update("description", event.target.value)}
            placeholder="What this specialist sells in one clear paragraph"
            required
            value={values.description}
          />
        </PublishField>

        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium text-[#18181b]">
            Capabilities
          </legend>
          <p className="text-xs leading-5 text-[#71717a]">
            Choose what this specialist can actually deliver. Relix uses these
            when matching seller agents to founder jobs.
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {specialistCapabilityOptions.map((capability) => {
              const selected = selectedCapabilitySet.has(capability.id);

              return (
                <button
                  aria-pressed={selected}
                  className={`rounded-full px-2.5 py-1.5 text-xs font-medium transition ${
                    selected
                      ? "bg-[#0a0a0a] text-white"
                      : "bg-[#f4f4f5] text-[#52525b] hover:bg-[#e4e4e7]"
                  }`}
                  key={capability.id}
                  onClick={() => toggleCapability(capability.id)}
                  title={capability.description}
                  type="button"
                >
                  {capability.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-[#71717a]">
            {selectedCapabilities.length > 0
              ? `${selectedCapabilities.length} selected`
              : "Select at least one capability."}
          </p>
        </fieldset>

        <PublishField
          hint={
            selectedModel
              ? `${selectedModel.description} Version is set automatically.`
              : "Lower-cost Claude models only. Version is set automatically."
          }
          label="Model"
        >
          <select
            className="field h-11 w-full min-w-0 px-4 text-sm"
            onChange={(event) => update("model", event.target.value)}
            required
            value={values.model}
          >
            {cheapClaudeModelOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </PublishField>

        <PublishField
          hint="How the agent should approach growth work. Grounds its bids and delivery."
          label="Prompt"
        >
          <textarea
            className="field min-h-24 resize-y px-4 py-3 text-sm leading-6"
            onChange={(event) => update("prompt", event.target.value)}
            placeholder="You are a specialist that..."
            required
            value={values.prompt}
          />
        </PublishField>

        <div className="grid gap-3.5 sm:grid-cols-2 sm:items-start">
          <PublishField
            hint="SOL paid to the owner wallet after delivery."
            label="Price"
          >
            <input
              className="field h-11 px-4 text-sm"
              min={0}
              onChange={(event) => update("basePriceSol", event.target.value)}
              step={0.05}
              type="number"
              value={values.basePriceSol}
            />
          </PublishField>
          <PublishField
            hint="Whole days. This is the delivery estimate shown in bids."
            label="Average delivery time"
          >
            <input
              className="field h-11 px-4 text-sm"
              min={1}
              onChange={(event) => update("deliveryDays", event.target.value)}
              step={1}
              type="number"
              value={values.deliveryDays}
            />
          </PublishField>
        </div>

        <button
          className="mt-1 h-12 w-full rounded-full bg-[#0a0a0a] px-6 text-sm font-medium text-white transition hover:bg-[#27272a] disabled:opacity-50"
          disabled={isPublishing}
          type="submit"
        >
          {isPublishing ? "Publishing..." : "Publish"}
        </button>
      </form>

      {publishMessage ? (
        <p className="mt-4 rounded-2xl bg-[#f4f4f5] px-4 py-3 text-sm leading-6 text-[#27272a]">
          {publishMessage}
        </p>
      ) : null}
    </div>
  );
}

export function AgentProfileModal({
  agent,
  onClose,
  reputation
}: {
  agent: SpecialistAgent;
  onClose: () => void;
  reputation: SpecialistReputation;
}) {
  const liveExtraEarnings = Math.max(
    0,
    reputation.totalEarnedSol - agent.totalEarnedSol
  );
  const earnings = agent.monthlyEarnings.map((value, index) =>
    index === agent.monthlyEarnings.length - 1
      ? Number((value + liveExtraEarnings).toFixed(4))
      : value
  );
  const recentClients = [
    ...reputation.recentJobs.map((job) => job.client),
    ...agent.recentClients
  ]
    .filter((client, index, all) => all.indexOf(client) === index)
    .slice(0, 6);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <article
        className="enter max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-white p-7 soft-shadow"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f4f4f5] text-2xl"
            >
              {agent.avatar}
            </span>
            <div>
              <h3 className="text-2xl font-semibold tracking-[-0.03em]">
                {agent.name}
              </h3>
              <p className="mt-1 text-xs text-[#71717a]">
                Independent seller agent · v{agent.version}
              </p>
            </div>
          </div>
          <button
            className="rounded-full bg-[#f4f4f5] px-3 py-1.5 text-xs font-medium text-[#52525b] transition hover:bg-[#0a0a0a] hover:text-white"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <p className="mt-5 text-sm leading-6 text-[#52525b]">
          {agent.description}
        </p>

        <dl className="mt-6 grid gap-4 border-t hairline pt-6 sm:grid-cols-2">
          <ProfileMetaRow label="Owner" value={agent.ownerName} />
          <ProfileMetaRow
            label="Wallet"
            value={shortAddress(agent.ownerWallet)}
          />
          <ProfileMetaRow
            label="Published"
            value={formatMonthYear(agent.createdAt)}
          />
          <ProfileMetaRow label="Model" value={agent.model} />
          <ProfileMetaRow
            label="Average delivery"
            value={`${agent.averageDeliveryDays} days`}
          />
          <ProfileMetaRow
            label="Last hired"
            value={
              reputation.lastHiredAt
                ? formatMonthYear(reputation.lastHiredAt)
                : "Not hired yet"
            }
          />
        </dl>

        <div className="mt-6 flex flex-wrap gap-1.5">
          {agent.capabilities.map((capability) => (
            <CapabilityChip
              baseClassName="rounded-full bg-[#f4f4f5] px-2.5 py-1 text-[11px] font-medium text-[#52525b]"
              capability={capability}
              key={capability}
            />
          ))}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 border-t hairline pt-6">
          <ProfileStat
            label="Jobs completed"
            value={String(reputation.jobsCompleted)}
          />
          <ProfileStat
            label="Total earned"
            value={formatSol(reputation.totalEarnedSol)}
          />
          <ProfileStat
            label="Rating"
            value={
              reputation.averageRating > 0
                ? reputation.averageRating.toFixed(1)
                : "-"
            }
          />
        </div>

        <div className="mt-6">
          <p className="text-xs font-medium text-[#71717a]">
            Earnings, last 6 months
          </p>
          <EarningsSparkline values={earnings} />
        </div>

        <div className="mt-6">
          <p className="text-xs font-medium text-[#71717a]">Recent clients</p>
          {recentClients.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {recentClients.map((client) => (
                <span
                  className="rounded-full bg-[#f4f4f5] px-3 py-1.5 text-xs text-[#27272a]"
                  key={client}
                >
                  {client}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[#71717a]">
              No completed jobs yet. This seller is waiting for its first
              client.
            </p>
          )}
        </div>
      </article>
    </div>
  );
}

export function parseCapabilities(value: string) {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function reputationFromAgent(agent: SpecialistAgent) {
  return {
    averageRating: agent.averageRating,
    jobsCompleted: agent.jobsCompleted,
    lastHiredAt: agent.lastHiredAt,
    recentJobs: agent.recentClients.slice(0, 3).map((client, index) => ({
      amountSol: Number((agent.basePriceSol * (1 + index * 0.1)).toFixed(2)),
      client,
      completedAt: agent.lastHiredAt || agent.createdAt
    })),
    totalEarnedSol: agent.totalEarnedSol
  };
}

export function allKnownSpecialists(publishedSpecialists: SpecialistAgent[]) {
  return [...specialistRegistry, ...publishedSpecialists];
}

export function specialistSlug(agent: Pick<SpecialistAgent, "id" | "name">) {
  return (
    agent.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || agent.id
  );
}

export function modelDisplayName(model: string) {
  const knownCheapModel = cheapClaudeModelLabel(model);

  if (knownCheapModel !== model) {
    return knownCheapModel;
  }

  const lower = model.toLowerCase();

  if (lower.includes("sonnet")) {
    return "Claude Sonnet";
  }

  if (lower.includes("opus")) {
    return "Claude Opus";
  }

  if (lower.includes("haiku")) {
    return "Claude Haiku";
  }

  if (lower.includes("fable")) {
    return "Claude Fable";
  }

  return model
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function DirectoryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p>{label}</p>
      <p className="mt-1 font-medium text-[#18181b]">{value}</p>
    </div>
  );
}

function PublishField({
  children,
  hint,
  label
}: {
  children: ReactNode;
  hint?: string;
  label: string;
}) {
  return (
    <label className="grid content-start gap-2">
      <span className="text-sm font-medium text-[#18181b]">{label}</span>
      {children}
      {hint ? <span className="text-xs text-[#71717a]">{hint}</span> : null}
    </label>
  );
}

function ProfileMetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[#71717a]">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-[#27272a]">{value}</dd>
    </div>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold tracking-[-0.03em]">{value}</p>
      <p className="mt-1 text-xs text-[#71717a]">{label}</p>
    </div>
  );
}

function EarningsSparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 0);

  if (max === 0) {
    return (
      <p className="mt-2 text-sm text-[#71717a]">No earnings recorded yet.</p>
    );
  }

  const barWidth = 100 / values.length;

  return (
    <svg
      aria-label="Earnings by month"
      className="mt-2 h-14 w-full"
      preserveAspectRatio="none"
      role="img"
      viewBox="0 0 100 40"
    >
      {values.map((value, index) => {
        const height = max > 0 ? (value / max) * 36 : 0;

        return (
          <rect
            fill={index === values.length - 1 ? "#0a0a0a" : "#d4d4d8"}
            height={Math.max(height, value > 0 ? 2 : 0)}
            key={index}
            rx={1.5}
            width={barWidth - 3}
            x={index * barWidth + 1.5}
            y={40 - Math.max(height, value > 0 ? 2 : 0)}
          />
        );
      })}
    </svg>
  );
}

function shortAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
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
