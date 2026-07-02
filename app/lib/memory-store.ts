import { promises as fs } from "fs";
import { dataDirectory, dataPath } from "@/app/lib/data-path";

export type CampaignMemoryRecord = {
  campaign_id: string;
  campaign_outcome: string;
  created_at: string;
  delivery: string;
  goal: string;
  id: string;
  payment?: {
    amount_sol: number;
    recipient_wallet: string;
    signature: string;
  };
  repository: string;
  specialist_used: string;
};

const dataFile = dataPath("campaign-memory.json");

export async function listCampaignMemory(repository?: string) {
  const records = await readMemory();

  return records
    .filter((record) => !repository || record.repository === repository)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function recordCampaignMemory(record: CampaignMemoryRecord) {
  const records = await readMemory();
  const index = records.findIndex((candidate) => candidate.id === record.id);

  if (index >= 0) {
    records[index] = record;
  } else {
    records.push(record);
  }

  await writeMemory(records);

  return record;
}

async function readMemory(): Promise<CampaignMemoryRecord[]> {
  try {
    const data = await fs.readFile(dataFile, "utf8");
    const parsed = JSON.parse(data) as CampaignMemoryRecord[];
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

async function writeMemory(records: CampaignMemoryRecord[]) {
  await fs.mkdir(dataDirectory(), { recursive: true });
  await fs.writeFile(dataFile, `${JSON.stringify(records, null, 2)}\n`, "utf8");
}
