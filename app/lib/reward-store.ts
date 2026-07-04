import { promises as fs } from "fs";
import { dataDirectory, dataPath } from "@/app/lib/data-path";

// Auditable record of every on-chain reward-ladder payout. This is the server's
// source of truth for the ladder cap: the API route counts prior rungs here
// before paying the next one, so the cap cannot be bypassed from the client.

export type RewardRecord = {
  amountSol: number;
  campaignId: string;
  createdAt: string;
  id: string;
  recipient: string;
  rung: number;
  signature: string;
  specialistId: string;
};

const dataFile = dataPath("reward-ladder.json");

export async function listRewards(
  campaignId: string,
  specialistId: string
): Promise<RewardRecord[]> {
  const records = await readRewards();

  return records.filter(
    (record) =>
      record.campaignId === campaignId && record.specialistId === specialistId
  );
}

export async function appendReward(record: RewardRecord): Promise<RewardRecord> {
  const current = await readRewards();
  await writeRewards([...current, record]);

  return record;
}

async function readRewards(): Promise<RewardRecord[]> {
  try {
    const data = await fs.readFile(dataFile, "utf8");
    const parsed = JSON.parse(data) as RewardRecord[];
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

async function writeRewards(records: RewardRecord[]): Promise<void> {
  await fs.mkdir(dataDirectory(), { recursive: true });
  await fs.writeFile(dataFile, `${JSON.stringify(records, null, 2)}\n`, "utf8");
}
