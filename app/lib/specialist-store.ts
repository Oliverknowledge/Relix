import { promises as fs } from "fs";
import { dataDirectory, dataPath } from "@/app/lib/data-path";
import {
  BUILT_IN_SPECIALIST_IDS,
  type SpecialistAgent
} from "@/app/lib/specialist-agents";

export type PublishSpecialistInput = {
  basePriceSol: number;
  capabilities: string[];
  deliveryDays: number;
  model: string;
  name: string;
  ownerName: string;
  ownerWallet: string;
  prompt: string;
  version: string;
};

const dataFile = dataPath("published-specialists.json");
const MAX_PRICE_SOL = 50;
const MAX_DELIVERY_DAYS = 60;
const WALLET_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function listPublishedSpecialists(): Promise<SpecialistAgent[]> {
  const agents = await readAgents();

  return agents.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function publishSpecialist(
  input: PublishSpecialistInput
): Promise<SpecialistAgent> {
  const clean = validateInput(input);
  const agents = await readAgents();
  const now = new Date().toISOString();
  const agent: SpecialistAgent = {
    averageRating: 0,
    basePriceSol: clean.basePriceSol,
    capabilities: clean.capabilities,
    createdAt: now,
    deliveryDays: clean.deliveryDays,
    id: uniqueSpecialistId(clean.name, agents),
    jobsCompleted: 0,
    lastHiredAt: null,
    model: clean.model,
    name: clean.name,
    ownerName: clean.ownerName,
    ownerWallet: clean.ownerWallet,
    prompt: clean.prompt,
    status: "active",
    totalEarnedSol: 0,
    version: clean.version
  };

  agents.push(agent);
  await writeAgents(agents);

  return agent;
}

function validateInput(input: PublishSpecialistInput): PublishSpecialistInput {
  const name = requireText(input.name, "Agent name");
  const ownerName = requireText(input.ownerName, "Owner name");
  const ownerWallet = requireText(input.ownerWallet, "Owner wallet");
  const model = requireText(input.model, "Model");
  const version = requireText(input.version, "Version");
  const prompt = requireText(input.prompt, "Prompt");
  const capabilities = Array.isArray(input.capabilities)
    ? input.capabilities.map((item) => item.trim()).filter(Boolean)
    : [];
  const basePriceSol = Number(input.basePriceSol);
  const deliveryDays = Number(input.deliveryDays);

  if (!WALLET_PATTERN.test(ownerWallet)) {
    throw new Error("Owner wallet must be a valid Solana address.");
  }

  if (capabilities.length === 0) {
    throw new Error("Add at least one capability.");
  }

  if (!Number.isFinite(basePriceSol) || basePriceSol <= 0) {
    throw new Error("Base price must be greater than 0 SOL.");
  }

  if (basePriceSol > MAX_PRICE_SOL) {
    throw new Error(`Base price must be ${MAX_PRICE_SOL} SOL or less.`);
  }

  if (!Number.isInteger(deliveryDays) || deliveryDays < 1) {
    throw new Error("Delivery days must be a whole number of at least 1.");
  }

  if (deliveryDays > MAX_DELIVERY_DAYS) {
    throw new Error(`Delivery days must be ${MAX_DELIVERY_DAYS} or fewer.`);
  }

  return {
    basePriceSol: Number(basePriceSol.toFixed(2)),
    capabilities: capabilities.slice(0, 8),
    deliveryDays,
    model,
    name,
    ownerName,
    ownerWallet,
    prompt,
    version
  };
}

function requireText(value: unknown, label: string): string {
  const text = typeof value === "string" ? value.trim() : "";

  if (!text) {
    throw new Error(`${label} is required.`);
  }

  return text;
}

function uniqueSpecialistId(name: string, agents: SpecialistAgent[]) {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32) || "specialist";
  const taken = new Set<string>([
    ...BUILT_IN_SPECIALIST_IDS,
    ...agents.map((agent) => agent.id)
  ]);
  let candidate = `custom-${base}`;

  while (taken.has(candidate)) {
    candidate = `custom-${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  return candidate;
}

async function readAgents(): Promise<SpecialistAgent[]> {
  try {
    const data = await fs.readFile(dataFile, "utf8");
    const parsed = JSON.parse(data) as SpecialistAgent[];

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

async function writeAgents(agents: SpecialistAgent[]) {
  await fs.mkdir(dataDirectory(), { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(agents, null, 2), "utf8");
}
