import type { Bid, SpecialistDelivery, SpecialistJobContext } from "@/app/lib/specialist-agents";
import type { CoordinationMode } from "@/app/lib/coralos/types";

// The Growth Employee (buyer agent) runs this deterministic delivery readiness
// check after a specialist delivers, before the founder is asked to release
// escrow. It is ADVISORY ONLY: it never moves money and never gates the founder's
// Phantom signature, which remains the sole escrow release path. It exists to
// make the autonomous side of the flow legible — the agents source, compete,
// award, deliver, AND verify; the founder's signature is the final safety gate.
//
// This is NOT a distinct "Verifier Agent" — it is the buyer agent's own check.
// The shape is deliberately generic so a future CoralOS `relix-verifier` agent
// (Approach C) can fill the exact same object with `source: "coralos-verifier"`.

// Where the readiness verdict came from. Only the values that are actually
// implemented are used; the union documents the forward-compatible upgrade path.
export type ReadinessSource =
  | "growth-employee-readiness-check"
  | "coralos-verifier";

export type ReadinessCheck = {
  id: string;
  label: string;
  passed: boolean;
  // A human-readable note; used for "confirmation" checks and for the
  // pass-with-note case (e.g. no CoralOS session on a local fallback run).
  note?: string;
};

// A cryptographic, agent-signed attestation of a readiness verdict. Signed by
// the Relix agent key (the same key family used for reward payouts) — NEVER by
// anything that can touch founder escrow. `onChain` is true only when the memo
// transaction was actually broadcast to devnet.
export type DeliveryAttestation = {
  agentPubkey: string;
  // base64-encoded ed25519 signature over `message`, made with the agent key.
  signature: string;
  // The exact canonical message that was signed, so anyone can verify.
  message: string;
  onChain: boolean;
  txSignature?: string;
  explorerUrl?: string;
};

export type DeliveryReadiness = {
  ready: boolean;
  source: ReadinessSource;
  coordinationMode: CoordinationMode;
  checks: ReadinessCheck[];
  summary: string;
  awardedBidId: string;
  coralSessionId?: string;
  coralThreadId?: string;
  // Filled in server-side after the readiness verdict is signed. Best-effort:
  // absent if signing/broadcast failed, which never blocks anything.
  attestation?: DeliveryAttestation;
};

export type DeliveryReadinessInput = {
  awardedBid: Pick<Bid, "id" | "specialistId">;
  delivery: SpecialistDelivery;
  jobContext: Pick<SpecialistJobContext, "jobId" | "goal">;
  escrowFunded: boolean;
  coordinationMode: CoordinationMode;
  coralSessionId?: string;
  coralThreadId?: string;
};

function countDeliveryBlocks(delivery: SpecialistDelivery): number {
  return delivery.sections.reduce((total, section) => total + section.blocks.length, 0);
}

function hasLaunchThread(delivery: SpecialistDelivery): boolean {
  return delivery.sections.some((section) =>
    section.blocks.some((block) => block.kind === "tweet")
  );
}

/**
 * Pure, deterministic readiness check. No I/O, no signing — safe to unit test
 * and safe to run anywhere. Every check maps onto data the flow already holds.
 */
export function checkDeliveryReadiness(
  input: DeliveryReadinessInput
): DeliveryReadiness {
  const { awardedBid, delivery, jobContext, escrowFunded, coordinationMode } = input;
  const blockCount = countDeliveryBlocks(delivery);
  const isFallback = coordinationMode === "local-fallback";
  const hasCoralIds = Boolean(input.coralSessionId && input.coralThreadId);

  const checks: ReadinessCheck[] = [
    {
      id: "specialist-match",
      label: "Delivery came from the awarded specialist",
      passed: delivery.specialistId === awardedBid.specialistId,
      note:
        delivery.specialistId === awardedBid.specialistId
          ? undefined
          : `awarded ${awardedBid.specialistId}, delivered ${delivery.specialistId}`
    },
    {
      id: "escrow-funded",
      label: "Escrow was funded before delivery was marked ready",
      passed: escrowFunded,
      note: escrowFunded
        ? "confirmed — delivery is generated only after the escrow lock confirms"
        : "escrow is not funded yet"
    },
    {
      id: "deliverables-present",
      label: "Required deliverables are present",
      passed: delivery.sections.length > 0 && blockCount > 0,
      note: `${delivery.sections.length} section(s), ${blockCount} asset(s)`
    },
    {
      id: "launch-thread-present",
      label: "Launch post / thread exists",
      passed: hasLaunchThread(delivery),
      note: hasLaunchThread(delivery) ? undefined : "no launch-thread posts found"
    },
    {
      id: "brief-present",
      label: "Campaign brief is present",
      passed: jobContext.goal.trim().length > 0,
      note: jobContext.goal.trim().length > 0 ? undefined : "empty campaign goal"
    },
    {
      id: "id-linkage",
      label: "Delivery links to bid / session / thread ids",
      // Bid linkage is always required; CoralOS session/thread ids exist only on
      // CoralOS-coordinated runs, so a fallback run passes-with-note, not fails.
      passed: awardedBid.id.trim().length > 0,
      note: hasCoralIds
        ? `bid ${awardedBid.id} · CoralOS session/thread linked`
        : isFallback
          ? `bid ${awardedBid.id} · CoralOS session N/A (local fallback run)`
          : `bid ${awardedBid.id}`
    }
  ];

  const ready = checks.every((check) => check.passed);
  const failed = checks.filter((check) => !check.passed);

  return {
    ready,
    source: "growth-employee-readiness-check",
    coordinationMode,
    checks,
    summary: ready
      ? "All readiness checks passed. The Growth Employee marks this delivery ready for release; the founder signs the final escrow release."
      : `Not ready: ${failed.map((check) => check.label).join("; ")}. The founder still decides — release or refund remains a founder Phantom signature.`,
    awardedBidId: awardedBid.id,
    coralSessionId: input.coralSessionId,
    coralThreadId: input.coralThreadId
  };
}

// The canonical, deterministic message that gets agent-signed. Kept compact and
// stable so the signature is reproducible and independently verifiable.
export function readinessAttestationMessage(readiness: DeliveryReadiness): string {
  const passed = readiness.checks.filter((check) => check.passed).length;
  return [
    "relix-delivery-readiness-attestation-v1",
    `jobReady=${readiness.ready}`,
    `awardedBidId=${readiness.awardedBidId}`,
    `coordinationMode=${readiness.coordinationMode}`,
    `coralSessionId=${readiness.coralSessionId ?? "none"}`,
    `checks=${passed}/${readiness.checks.length}`,
    `source=${readiness.source}`
  ].join("; ");
}
