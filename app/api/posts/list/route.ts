import { NextResponse, type NextRequest } from "next/server";
import { listScheduledPosts } from "@/app/lib/post-store";

export async function GET(request: NextRequest) {
  const campaignId = request.nextUrl.searchParams.get("campaignId") || undefined;
  const posts = await listScheduledPosts(campaignId);

  return NextResponse.json({ posts });
}
