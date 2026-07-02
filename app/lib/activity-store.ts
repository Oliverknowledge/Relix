import { promises as fs } from "fs";
import { dataDirectory, dataPath } from "@/app/lib/data-path";

export type ActivityRecord = {
  campaign_id: string;
  created_at: string;
  id: string;
  repository: string;
  status: "active" | "done";
  text: string;
};

const dataFile = dataPath("activity-log.json");

export async function appendActivity(records: ActivityRecord[]) {
  const current = await readActivity();
  const existingIds = new Set(current.map((record) => record.id));
  const next = [
    ...current,
    ...records.filter((record) => !existingIds.has(record.id))
  ];

  await writeActivity(next);

  return records;
}

export async function listActivity(campaignId?: string) {
  const records = await readActivity();

  return records.filter(
    (record) => !campaignId || record.campaign_id === campaignId
  );
}

async function readActivity(): Promise<ActivityRecord[]> {
  try {
    const data = await fs.readFile(dataFile, "utf8");
    const parsed = JSON.parse(data) as ActivityRecord[];
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

async function writeActivity(records: ActivityRecord[]) {
  await fs.mkdir(dataDirectory(), { recursive: true });
  await fs.writeFile(dataFile, `${JSON.stringify(records, null, 2)}\n`, "utf8");
}
