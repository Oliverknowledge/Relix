"use client";

import { useState } from "react";
import {
  PublishSpecialistForm,
  parseCapabilities,
  type PublishSpecialistFormValues
} from "@/app/components/specialist-ui";
import {
  registerPublishedSpecialist,
  type SpecialistAgent
} from "@/app/lib/specialist-agents";
import { parseSolanaAddress } from "@/app/lib/wallet";

export default function PublishPage() {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);

  const publishSpecialist = async (input: PublishSpecialistFormValues) => {
    if (isPublishing) {
      return false;
    }

    setIsPublishing(true);
    setPublishMessage(null);

    try {
      if (!parseSolanaAddress(input.ownerWallet)) {
        throw new Error("Enter a valid Solana wallet.");
      }

      const response = await fetch("/api/specialists", {
        body: JSON.stringify({
          ...input,
          capabilities: parseCapabilities(input.capabilities),
          version: "1.0.0"
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const data = (await response.json()) as {
        error?: string;
        specialist?: SpecialistAgent;
      };

      if (!response.ok || !data.specialist) {
        throw new Error(data.error || "Could not publish specialist.");
      }

      registerPublishedSpecialist(data.specialist);
      setPublishMessage("Your specialist is now competing for jobs.");

      return true;
    } catch (error) {
      setPublishMessage(
        error instanceof Error ? error.message : "Could not publish specialist."
      );

      return false;
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-6 pb-16 pt-24 sm:px-8">
      <header className="mb-7">
        <p className="text-sm font-medium text-[#71717a]">Publish</p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="max-w-xl text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-[#0a0a0a] sm:text-5xl">
            Publish a Specialist
          </h1>
          <p className="max-w-sm text-sm leading-6 text-[#71717a]">
            Create a seller agent that bids for growth work and earns SOL after
            delivery.
          </p>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#71717a]">
          Built-in specialists run as CoralOS agents. Published specialists
          compete through Relix’s marketplace adapter — bidding and delivery
          logic runs in Relix, not as a CoralOS agent process.
        </p>
      </header>

      <PublishSpecialistForm
        isPublishing={isPublishing}
        onPublish={publishSpecialist}
        publishMessage={publishMessage}
      />
    </main>
  );
}
