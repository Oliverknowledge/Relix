import { NextResponse, type NextRequest } from "next/server";
import { getUserId } from "@/app/lib/session";
import {
  fetchXMe,
  getValidXAccessToken,
  XApiError,
  xConfiguration
} from "@/app/lib/x-api";
import {
  clearXAccountCookie,
  setXAccountCookie
} from "@/app/lib/x-account-cookie";
import {
  getXAccountForRequest,
  markXAccountRevoked,
  publicXAccount
} from "@/app/lib/x-store";

export async function GET(request: NextRequest) {
  const config = xConfiguration();
  const userId = getUserId(request);

  if (!config.configured) {
    return NextResponse.json({
      configured: false,
      connected: false,
      missing: config.missing
    });
  }

  if (!userId) {
    return NextResponse.json({ configured: true, connected: false });
  }

  const account = await getXAccountForRequest(request, userId);

  if (!account) {
    return NextResponse.json({ configured: true, connected: false });
  }

  try {
    const { accessToken, account: currentAccount } =
      await getValidXAccessToken(account);
    await fetchXMe(accessToken);

    const response = NextResponse.json({
      account: publicXAccount(currentAccount),
      configured: true,
      connected: true
    });

    setXAccountCookie(response, currentAccount);

    return response;
  } catch (error) {
    const shouldMarkRevoked =
      error instanceof XApiError && [401, 403].includes(error.status);

    if (shouldMarkRevoked) {
      await markXAccountRevoked(
        userId,
        error instanceof Error ? error.message : "X access was revoked."
      );
    }

    const response = NextResponse.json({
      configured: true,
      connected: false,
      error: shouldMarkRevoked
        ? "X access was revoked. Reconnect X."
        : "Could not verify X right now."
    });

    if (shouldMarkRevoked) {
      clearXAccountCookie(response);
    }

    return response;
  }
}
