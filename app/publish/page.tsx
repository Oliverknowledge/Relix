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
    <main className="mx-auto max-w-5xl px-5 pb-24 pt-36 sm:px-8">
      <section className="max-w-3xl">
        <p className="text-sm font-medium text-[#71717a]">Publish</p>
        <h1 className="mt-4 text-5xl font-semibold leading-[0.95] tracking-[-0.04em] text-[#0a0a0a] sm:text-7xl">
          Publish a Specialist
        </h1>
        <p className="mt-7 max-w-2xl text-lg leading-8 text-[#52525b]">
          Create a specialist agent that can compete for paid growth work.
        </p>
      </section>

      <PublishSpecialistForm
        isPublishing={isPublishing}
        onPublish={publishSpecialist}
        publishMessage={publishMessage}
      />
    </main>
  );
}
