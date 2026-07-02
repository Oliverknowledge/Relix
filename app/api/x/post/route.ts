import { NextResponse, type NextRequest } from "next/server";
import { requireUserId } from "@/app/lib/session";
import {
  publishXPost,
  XApiError,
  xConfiguration
} from "@/app/lib/x-api";
import {
  setXAccountCookie
} from "@/app/lib/x-account-cookie";
import {
  claimXPostForPublishing,
  getXAccountForRequest,
  markXPostFailed,
  markXPostPublished,
  prepareApprovedXPost
} from "@/app/lib/x-store";

type PublishBody = {
  approved?: boolean;
  campaignId?: string;
  label?: string;
  postId?: string;
  repository?: string;
  sourceId?: string;
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

  const body = (await request.json()) as PublishBody;

  if (body.approved !== true) {
    return NextResponse.json(
      { error: "Explicit approval is required before publishing." },
      { status: 400 }
    );
  }

  let preparedPostId: string | null = null;

  try {
    const userId = requireUserId(request);
    const account = await getXAccountForRequest(request, userId);

    if (!account) {
      return NextResponse.json(
        {
          error:
            "Reconnect X before publishing. The server could not find the connected X account."
        },
        { status: 401 }
      );
    }

    const preparedPost = body.postId
      ? await claimXPostForPublishing({ postId: body.postId, userId })
      : await prepareApprovedXPost({
          campaignId: body.campaignId,
          label: body.label,
          repository: body.repository,
          sourceId: body.sourceId,
          text: body.text || "",
          userId,
          xAccountId: account.id
        });

    preparedPostId = preparedPost.id;

    const published = await publishXPost({
      account,
      text: preparedPost.text,
      userId
    });
    const post = await markXPostPublished({
      postId: preparedPost.id,
      publishedAt: new Date().toISOString(),
      text: published.text,
      userId,
      xPostId: published.id,
      xPostUrl: published.url
    });

    const response = NextResponse.json({ post });

    setXAccountCookie(response, published.account);

    return response;
  } catch (error) {
    const status = error instanceof XApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Could not publish X post.";
    let failedPost = null;

    if (preparedPostId) {
      try {
        const userId = requireUserId(request);
        failedPost = await markXPostFailed({
          errorMessage: message,
          postId: preparedPostId,
          userId
        });
      } catch {
        // The original publishing error is more useful to the caller.
      }
    }

    return NextResponse.json(
      failedPost ? { error: message, post: failedPost } : { error: message },
      { status: failedPost ? 200 : status }
    );
  }
}
