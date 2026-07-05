import { promises as fs } from "fs";
import { dataDirectory, dataPath } from "@/app/lib/data-path";
import {
  persistentKvAvailable,
  readJsonFromKv,
  writeJsonToKv
} from "@/app/lib/kv-json-store";
import type { PaymentResult } from "@/app/lib/campaign";
import type { CoordinationMode, CoralProof } from "@/app/lib/coralos/types";
import type { DeliveryReadiness } from "@/app/lib/delivery-readiness";

// Persistence for the judge-facing proof receipt shown at /proof/[campaignId].
// Mirrors market-event-store.ts: durable Vercel KV / Upstash Redis when
// configured, local JSON otherwise. The receipt is built up incrementally at
// the same moments the main flow already emits market events (plan, lock,
// delivery, readiness, release/refund) via upsertProofReceipt, which merges
// each partial update into the stored record for that campaign. Every field
// here is public (wallet addresses, tx signatures, bid content) — nothing
// here is a secret or an access token.

export type ProofReceiptBid = {
  channel: string;
  deliverables: string[];
  deliveryDays: number;
  id: string;
  priceSol: number;
  reasoning: string;
  risk: string;
  specialistId: string;
  successMetric: string;
  targetAudience: string;
  timing: string;
};

export type ProofReceipt = {
  awardedBidId?: string;
  bids: ProofReceiptBid[];
  budgetSol: number;
  campaignId: string;
  coordinationMode: CoordinationMode;
  coralProof?: CoralProof;
  createdAt: string;
  deliverySummary?: string;
  goal: string;
  payment?: PaymentResult;
  readiness?: DeliveryReadiness;
  recommendedBidId: string;
  repository: string;
  selectionReason?: string;
  updatedAt: string;
};

// A caller only ever sends the fields it knows about at that moment (e.g. the
// readiness step sends only `readiness`); missing fields are left untouched
// on the stored record.
export type ProofReceiptUpsert = Partial<
  Omit<ProofReceipt, "campaignId" | "createdAt" | "updatedAt">
> & {
  campaignId: string;
};

const dataFile = dataPath("proof-receipts.json");
const kvKey = "proof-receipts";

export async function getProofReceipt(
  campaignId: string
): Promise<ProofReceipt | null> {
  const receipts = await readReceipts();

  return receipts.find((receipt) => receipt.campaignId === campaignId) || null;
}

export async function upsertProofReceipt(
  update: ProofReceiptUpsert
): Promise<ProofReceipt> {
  const receipts = await readReceipts();
  const now = new Date().toISOString();
  const index = receipts.findIndex(
    (receipt) => receipt.campaignId === update.campaignId
  );

  const merged: ProofReceipt =
    index === -1
      ? {
          awardedBidId: update.awardedBidId,
          bids: update.bids || [],
          budgetSol: update.budgetSol || 0,
          campaignId: update.campaignId,
          coordinationMode: update.coordinationMode || "local-fallback",
          coralProof: update.coralProof,
          createdAt: now,
          deliverySummary: update.deliverySummary,
          goal: update.goal || "",
          payment: update.payment,
          readiness: update.readiness,
          recommendedBidId: update.recommendedBidId || "",
          repository: update.repository || "",
          selectionReason: update.selectionReason,
          updatedAt: now
        }
      : {
          ...receipts[index],
          ...update,
          campaignId: receipts[index].campaignId,
          createdAt: receipts[index].createdAt,
          updatedAt: now
        };

  const nextReceipts =
    index === -1
      ? [...receipts, merged]
      : receipts.map((receipt, i) => (i === index ? merged : receipt));

  await writeReceipts(nextReceipts);

  return merged;
}

/**
 * Coerces an unknown payload into a valid ProofReceiptUpsert, or null when
 * campaignId is missing. Defensive parsing for the API route, matching the
 * pattern of sanitizeMarketEvent.
 */
export function sanitizeProofUpsert(value: unknown): ProofReceiptUpsert | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.campaignId !== "string" || !record.campaignId) {
    return null;
  }

  const update: ProofReceiptUpsert = { campaignId: record.campaignId };

  if (Array.isArray(record.bids)) {
    update.bids = record.bids.filter(isProofReceiptBid);
  }
  if (typeof record.budgetSol === "number") {
    update.budgetSol = record.budgetSol;
  }
  if (isCoordinationMode(record.coordinationMode)) {
    update.coordinationMode = record.coordinationMode;
  }
  if (record.coralProof && typeof record.coralProof === "object") {
    update.coralProof = record.coralProof as CoralProof;
  }
  if (typeof record.deliverySummary === "string") {
    update.deliverySummary = record.deliverySummary;
  }
  if (typeof record.goal === "string") {
    update.goal = record.goal;
  }
  if (record.payment && typeof record.payment === "object") {
    update.payment = record.payment as PaymentResult;
  }
  if (record.readiness && typeof record.readiness === "object") {
    update.readiness = record.readiness as DeliveryReadiness;
  }
  if (typeof record.recommendedBidId === "string") {
    update.recommendedBidId = record.recommendedBidId;
  }
  if (typeof record.repository === "string") {
    update.repository = record.repository;
  }
  if (typeof record.selectionReason === "string") {
    update.selectionReason = record.selectionReason;
  }
  if (typeof record.awardedBidId === "string") {
    update.awardedBidId = record.awardedBidId;
  }

  return update;
}

function isProofReceiptBid(value: unknown): value is ProofReceiptBid {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === "string" &&
    typeof record.specialistId === "string" &&
    typeof record.priceSol === "number" &&
    typeof record.deliveryDays === "number"
  );
}

function isCoordinationMode(value: unknown): value is CoordinationMode {
  return value === "coralos" || value === "coralos-hosted" || value === "local-fallback";
}

async function readReceipts(): Promise<ProofReceipt[]> {
  if (persistentKvAvailable()) {
    const receipts = await readJsonFromKv<ProofReceipt[]>(kvKey);

    return Array.isArray(receipts) ? receipts : [];
  }

  try {
    const data = await fs.readFile(dataFile, "utf8");
    const parsed = JSON.parse(data) as ProofReceipt[];

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }

    throw error;
  }
}

async function writeReceipts(receipts: ProofReceipt[]) {
  if (persistentKvAvailable()) {
    await writeJsonToKv(kvKey, receipts);
    return;
  }

  await fs.mkdir(dataDirectory(), { recursive: true });
  await fs.writeFile(
    dataFile,
    `${JSON.stringify(receipts, null, 2)}\n`,
    "utf8"
  );
}
