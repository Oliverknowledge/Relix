import { NextResponse, type NextRequest } from "next/server";
import { getUserId } from "@/app/lib/session";
import { publishXPost } from "@/app/lib/x-api";
import {
  claimXPostForPublishing,
  getXAccountForRequest,
  listDueScheduledXPosts,
  listScheduledXPosts,
  markXPostFailed,
  markXPostPublished
} from "@/app/lib/x-store";

export async function GET(request: NextRequest) {
  const userId = getUserId(request);

  if (!userId) {
    return NextResponse.json({ posts: [] });
  }

  const campaignId = request.nextUrl.searchParams.get("campaignId") || undefined;
  const publishDue = request.nextUrl.searchParams.get("publishDue") === "true";

  if (publishDue) {
    await publishDuePosts(request, userId);
  }

  const posts = await listScheduledXPosts({ campaignId, userId });

  return NextResponse.json({ posts });
}

async function publishDuePosts(request: NextRequest, userId: string) {
  const duePosts = await listDueScheduledXPosts(userId);

  for (const duePost of duePosts) {
    try {
      const account = await getXAccountForRequest(request, userId);

      if (!account) {
        return;
      }

      const post = await claimXPostForPublishing({
        postId: duePost.id,
        userId
      });
      const published = await publishXPost({
        account,
        text: post.text,
        userId
      });

      await markXPostPublished({
        postId: post.id,
        publishedAt: new Date().toISOString(),
        text: published.text,
        userId,
        xPostId: published.id,
        xPostUrl: published.url
      });
    } catch (error) {
      await markXPostFailed({
        errorMessage:
          error instanceof Error ? error.message : "Scheduled publish failed.",
        postId: duePost.id,
        userId
      });
    }
  }
}
