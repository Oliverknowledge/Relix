import { NextResponse } from "next/server";
import {
  schedulePosts,
  updateScheduledPostStatus
} from "@/app/lib/post-store";
import type {
  ScheduledPostStatus,
  SchedulePostInput
} from "@/app/lib/post-types";

type ScheduleBody = {
  campaignId?: string;
  postId?: string;
  posts?: SchedulePostInput[];
  repository?: string;
  status?: ScheduledPostStatus;
};

const statuses: ScheduledPostStatus[] = [
  "draft",
  "scheduled",
  "copied",
  "published_manually"
];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ScheduleBody;

    if (body.postId && body.status) {
      if (!statuses.includes(body.status)) {
        return NextResponse.json(
          { error: "Invalid scheduled post status." },
          { status: 400 }
        );
      }

      const post = await updateScheduledPostStatus({
        postId: body.postId,
        status: body.status
      });

      return NextResponse.json({ post });
    }

    if (!body.campaignId || !body.repository || !body.posts?.length) {
      return NextResponse.json(
        { error: "campaignId, repository, and posts are required." },
        { status: 400 }
      );
    }

    const posts = body.posts.filter(
      (post) => post.source_id && post.text && post.scheduled_at
    );

    if (posts.length === 0) {
      return NextResponse.json(
        { error: "At least one post with text and scheduled_at is required." },
        { status: 400 }
      );
    }

    const scheduledPosts = await schedulePosts({
      campaignId: body.campaignId,
      posts,
      repository: body.repository
    });

    return NextResponse.json({ posts: scheduledPosts });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not schedule posts."
      },
      { status: 500 }
    );
  }
}
