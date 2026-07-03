import { promises as fs } from "fs";
import { dataDirectory, dataPath } from "@/app/lib/data-path";
import {
  specialistRegistry,
  type SpecialistId,
  type SpecialistRecentJob,
  type SpecialistReputation
} from "@/app/lib/specialist-agents";

type ReputationRecord = {
  completedSignatures: string[];
  jobsCompleted: number;
  lastHiredAt: string | null;
  ratedSignatures: string[];
  ratingCount: number;
  ratingSum: number;
  recentJobs: SpecialistRecentJob[];
  specialistId: SpecialistId;
  totalEarnedSol: number;
};

const MAX_RECENT_JOBS = 8;

const dataFile = dataPath("specialist-reputation.json");

export async function listSpecialistReputation() {
  const records = await readRecords();
  const reputation = {} as Record<SpecialistId, SpecialistReputation>;

  specialistRegistry.forEach((agent) => {
    reputation[agent.id] = combineReputation(agent.id, records[agent.id]);
  });

  return reputation;
}

export async function recordJobCompletion({
  amountSol,
  client,
  hiredAt,
  signature,
  specialistId
}: {
  amountSol: number;
  client?: string;
  hiredAt: string;
  signature: string;
  specialistId: SpecialistId;
}) {
  const records = await readRecords();
  const record = records[specialistId] || emptyRecord(specialistId);

  if (!record.completedSignatures.includes(signature)) {
    record.completedSignatures.push(signature);
    record.jobsCompleted += 1;
    record.totalEarnedSol = Number(
      (record.totalEarnedSol + amountSol).toFixed(4)
    );
    record.lastHiredAt = hiredAt;
    record.recentJobs = [
      {
        amountSol,
        client: client?.trim() || "Undisclosed client",
        completedAt: hiredAt
      },
      ...(record.recentJobs || [])
    ].slice(0, MAX_RECENT_JOBS);
    records[specialistId] = record;
    await writeRecords(records);
  }

  return combineReputation(specialistId, records[specialistId]);
}

export async function recordDeliveryRating({
  rating,
  signature,
  specialistId
}: {
  rating: number;
  signature: string;
  specialistId: SpecialistId;
}) {
  const records = await readRecords();
  const record = records[specialistId] || emptyRecord(specialistId);

  if (!record.ratedSignatures.includes(signature)) {
    record.ratedSignatures.push(signature);
    record.ratingCount += 1;
    record.ratingSum += rating;
    records[specialistId] = record;
    await writeRecords(records);
  }

  return combineReputation(specialistId, records[specialistId]);
}

function combineReputation(
  specialistId: SpecialistId,
  record: ReputationRecord | undefined
): SpecialistReputation {
  const agent = specialistRegistry.find((entry) => entry.id === specialistId);
  const seedJobs = agent?.jobsCompleted || 0;
  const seedRating = agent?.averageRating || 0;
  const seedEarned = agent?.totalEarnedSol || 0;
  const seedLastHired = agent?.lastHiredAt || null;
  const extraJobs = record?.jobsCompleted || 0;
  const ratingCount = record?.ratingCount || 0;
  const ratingSum = record?.ratingSum || 0;
  const ratedTotal = seedJobs + ratingCount;

  return {
    averageRating:
      ratedTotal > 0
        ? Number(((seedRating * seedJobs + ratingSum) / ratedTotal).toFixed(1))
        : 0,
    jobsCompleted: seedJobs + extraJobs,
    lastHiredAt: record?.lastHiredAt || seedLastHired,
    recentJobs: record?.recentJobs || [],
    totalEarnedSol: Number(
      (seedEarned + (record?.totalEarnedSol || 0)).toFixed(4)
    )
  };
}

function emptyRecord(specialistId: SpecialistId): ReputationRecord {
  return {
    completedSignatures: [],
    jobsCompleted: 0,
    lastHiredAt: null,
    ratedSignatures: [],
    ratingCount: 0,
    ratingSum: 0,
    recentJobs: [],
    specialistId,
    totalEarnedSol: 0
  };
}

async function readRecords(): Promise<
  Partial<Record<SpecialistId, ReputationRecord>>
> {
  try {
    const data = await fs.readFile(dataFile, "utf8");
    const parsed = JSON.parse(data) as Partial<
      Record<SpecialistId, ReputationRecord>
    >;

    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return {};
    }

    throw error;
  }
}

async function writeRecords(
  records: Partial<Record<SpecialistId, ReputationRecord>>
) {
  await fs.mkdir(dataDirectory(), { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(records, null, 2), "utf8");
}
