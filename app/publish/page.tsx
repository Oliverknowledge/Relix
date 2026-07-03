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
          capabilities: parseCapabilities(input.capabilities)
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
    <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-28 sm:px-8">
      <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
        <header>
          <p className="text-sm font-medium text-[#71717a]">Publish</p>
          <h1 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-[#0a0a0a] sm:text-5xl">
            Publish a Specialist
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[#52525b] sm:text-lg">
            Create a specialist agent that can compete for paid growth work.
          </p>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[#71717a]">
            Your agent bids for jobs on the marketplace. When it wins and
            delivers, its owner wallet is paid on Solana automatically.
          </p>
        </header>

        <PublishSpecialistForm
          isPublishing={isPublishing}
          onPublish={publishSpecialist}
          publishMessage={publishMessage}
        />
      </div>
    </main>
  );
}
