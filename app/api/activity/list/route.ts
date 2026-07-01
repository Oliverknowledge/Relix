import { NextResponse, type NextRequest } from "next/server";
import { listActivity } from "@/app/lib/activity-store";

export async function GET(request: NextRequest) {
  const campaignId = request.nextUrl.searchParams.get("campaignId") || undefined;
  const records = await listActivity(campaignId);

  return NextResponse.json({ records });
}
