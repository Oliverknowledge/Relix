import { NextResponse, type NextRequest } from "next/server";
import { requireUserId } from "@/app/lib/session";
import { refreshXAccountAccess, xConfiguration } from "@/app/lib/x-api";
import { setXAccountCookie } from "@/app/lib/x-account-cookie";
import { getXAccountForRequest, publicXAccount } from "@/app/lib/x-store";

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
            "Reconnect X before refreshing tokens. The server could not find the connected X account."
        },
        { status: 401 }
      );
    }

    const refreshed = await refreshXAccountAccess(account);

    const response = NextResponse.json({
      account: publicXAccount(refreshed.account),
      ok: true
    });

    setXAccountCookie(response, refreshed.account);

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not refresh X token."
      },
      { status: 500 }
    );
  }
}
