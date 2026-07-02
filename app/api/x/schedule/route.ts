import { NextResponse, type NextRequest } from "next/server";
import { requireUserId } from "@/app/lib/session";
import { xConfiguration } from "@/app/lib/x-api";
import type { XPostInput } from "@/app/lib/x-types";
import {
  cancelScheduledXPost,
  getXAccountForRequest,
  saveXPostDrafts,
  scheduleXPosts,
  updateScheduledXPost
} from "@/app/lib/x-store";

type ScheduleBody = {
  action?: "cancel";
  campaignId?: string;
  postId?: string;
  posts?: XPostInput[];
  repository?: string;
  scheduledFor?: string | null;
  status?: "draft" | "scheduled";
  text?: string;
};

export async function POST(request: NextRequest) {
  const config = xConfiguration();

  if (!config.configured) {
    return NextResponse.json(
      { error: "X OAuth is not configured.", missing: config.missing },
      { status: 500 }
    );
  }

  try {
    const userId = requireUserId(request);
    const account = await getXAccountForRequest(request, userId);

    if (!account) {
      return NextResponse.json(
        {
          error:
            "Reconnect X before scheduling posts. The server could not find the connected X account."
        },
        { status: 401 }
      );
    }

    const body = (await request.json()) as ScheduleBody;

    if (body.postId && body.action === "cancel") {
      const post = await cancelScheduledXPost({ postId: body.postId, userId });
      return NextResponse.json({ post });
    }

    if (body.postId) {
      const post = await updateScheduledXPost({
        postId: body.postId,
        scheduledFor: body.scheduledFor,
        text: body.text,
        userId
      });

      return NextResponse.json({ post });
    }

    if (!body.campaignId || !body.repository || !body.posts?.length) {
      return NextResponse.json(
        { error: "campaignId, repository, and posts are required." },
        { status: 400 }
      );
    }

    const posts = validatePosts(body.posts, body.status || "scheduled");
    const savedPosts =
      body.status === "draft"
        ? await saveXPostDrafts({
            campaignId: body.campaignId,
            posts,
            repository: body.repository,
            userId,
            xAccountId: account.id
          })
        : await scheduleXPosts({
            campaignId: body.campaignId,
            posts,
            repository: body.repository,
            userId,
            xAccountId: account.id
          });

    return NextResponse.json({ posts: savedPosts });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not schedule X posts."
      },
      { status: 500 }
    );
  }
}

function validatePosts(posts: XPostInput[], status: "draft" | "scheduled") {
  const validPosts = posts.filter((post) => post.sourceId && post.text.trim());

  if (validPosts.length === 0) {
    throw new Error("At least one post with text is required.");
  }

  validPosts.forEach((post) => {
    if (post.text.length > 280) {
      throw new Error("X posts must be 280 characters or fewer.");
    }

    if (status === "scheduled") {
      const scheduledFor = new Date(post.scheduledFor || "");

      if (Number.isNaN(scheduledFor.getTime())) {
        throw new Error("Choose a valid schedule time.");
      }
    }
  });

  return validPosts;
}
