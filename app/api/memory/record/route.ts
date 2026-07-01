import { NextResponse } from "next/server";
import {
  recordCampaignMemory,
  type CampaignMemoryRecord
} from "@/app/lib/memory-store";

export async function POST(request: Request) {
  try {
    const record = (await request.json()) as CampaignMemoryRecord;

    if (
      !record.id ||
      !record.campaign_id ||
      !record.repository ||
      !record.goal ||
      !record.specialist_used
    ) {
      return NextResponse.json(
        { error: "Campaign memory record is incomplete." },
        { status: 400 }
      );
    }

    const saved = await recordCampaignMemory(record);

    return NextResponse.json({ record: saved });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not save campaign memory."
      },
      { status: 500 }
    );
  }
}
