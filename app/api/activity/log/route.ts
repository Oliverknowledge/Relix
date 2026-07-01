import { NextResponse } from "next/server";
import { appendActivity, type ActivityRecord } from "@/app/lib/activity-store";

type ActivityBody = {
  records?: ActivityRecord[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ActivityBody;
    const records = (body.records || []).filter(
      (record) =>
        record.id &&
        record.campaign_id &&
        record.repository &&
        record.text &&
        record.created_at
    );

    if (records.length === 0) {
      return NextResponse.json(
        { error: "No activity records provided." },
        { status: 400 }
      );
    }

    await appendActivity(records);

    return NextResponse.json({ records });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not save activity."
      },
      { status: 500 }
    );
  }
}
