import { promises as fs } from "fs";
import { dataDirectory, dataPath } from "@/app/lib/data-path";

// Auditable record of every on-chain prize payout. The API route counts prior
// places here before paying the next one, so the pool cap cannot be bypassed
// from the client.

export type PrizeRecord = {
  amountSol: number;
  campaignId: string;
  createdAt: string;
  id: string;
  place: number;
  recipient: string;
  signature: string;
  specialistId: string;
};

const dataFile = dataPath("prize-pool.json");

export async function listPrizes(
  campaignId: string,
  specialistId: string
): Promise<PrizeRecord[]> {
  const records = await readPrizes();

  return records.filter(
    (record) =>
      record.campaignId === campaignId && record.specialistId === specialistId
  );
}

export async function appendPrize(record: PrizeRecord): Promise<PrizeRecord> {
  const current = await readPrizes();
  await writePrizes([...current, record]);

  return record;
}

async function readPrizes(): Promise<PrizeRecord[]> {
  try {
    const data = await fs.readFile(dataFile, "utf8");
    const parsed = JSON.parse(data) as PrizeRecord[];
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

async function writePrizes(records: PrizeRecord[]): Promise<void> {
  await fs.mkdir(dataDirectory(), { recursive: true });
  await fs.writeFile(dataFile, `${JSON.stringify(records, null, 2)}\n`, "utf8");
}
