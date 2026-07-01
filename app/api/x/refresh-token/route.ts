import { NextResponse, type NextRequest } from "next/server";
import { requireUserId } from "@/app/lib/session";
import { refreshXAccountAccess, xConfiguration } from "@/app/lib/x-api";
import { getXAccountForUser, publicXAccount } from "@/app/lib/x-store";

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
    const account = await getXAccountForUser(userId);

    if (!account) {
      return NextResponse.json(
        { error: "Connect X before refreshing tokens." },
        { status: 401 }
      );
    }

    const refreshed = await refreshXAccountAccess(account);

    return NextResponse.json({
      account: publicXAccount(refreshed.account),
      ok: true
    });
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
