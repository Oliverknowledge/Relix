import { NextResponse, type NextRequest } from "next/server";
import { listCampaignMemory } from "@/app/lib/memory-store";

export async function GET(request: NextRequest) {
  const repository = request.nextUrl.searchParams.get("repository") || undefined;
  const records = await listCampaignMemory(repository);

  return NextResponse.json({ records });
}
