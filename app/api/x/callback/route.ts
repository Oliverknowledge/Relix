import { NextResponse, type NextRequest } from "next/server";
import { appOrigin } from "@/app/lib/oauth";
import {
  exchangeXCodeForToken,
  expiryFrom,
  fetchXMe,
  missingRequiredXScopes,
  parseScopes,
  xConfiguration,
  xRedirectUri
} from "@/app/lib/x-api";
import { getUserId, setUserCookie } from "@/app/lib/session";
import { upsertXAccount } from "@/app/lib/x-store";

export async function GET(request: NextRequest) {
  const origin = appOrigin(request);
  const config = xConfiguration();
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");
  const savedState = request.cookies.get("relix_x_state")?.value;
  const codeVerifier = request.cookies.get("relix_x_code_verifier")?.value;
  const userId = getUserId(request);

  if (!config.configured) {
    return NextResponse.redirect(new URL("/?x=not_configured", origin));
  }

  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/?x=${encodeURIComponent(oauthError)}`, origin)
    );
  }

  if (!code || !state || !savedState || state !== savedState || !codeVerifier) {
    return NextResponse.redirect(new URL("/?x=state_error", origin));
  }

  if (!userId) {
    return NextResponse.redirect(new URL("/?x=session_missing", origin));
  }

  try {
    const token = await exchangeXCodeForToken({
      code,
      codeVerifier,
      redirectUri: xRedirectUri(request)
    });

    if (!token.access_token || !token.refresh_token) {
      throw new Error("X did not return the required OAuth tokens.");
    }

    const profile = await fetchXMe(token.access_token);
    const scopes = parseScopes(token.scope) || [];
    const missingScopes = missingRequiredXScopes(scopes);

    if (missingScopes.length > 0) {
      throw new Error(
        `X did not grant ${missingScopes.join(
          ", "
        )}. Enable Read and write permissions in the X Developer Portal, save, then reconnect X.`
      );
    }

    await upsertXAccount({
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      scopes,
      tokenExpiry: expiryFrom(token.expires_in),
      userId,
      username: profile.username,
      xUserId: profile.id
    });

    const response = NextResponse.redirect(new URL("/?x=connected", origin));

    setUserCookie(response, userId);
    response.cookies.delete("relix_x_state");
    response.cookies.delete("relix_x_code_verifier");

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "X connection failed.";

    return NextResponse.redirect(
      new URL(`/?x=${encodeURIComponent(message)}`, origin)
    );
  }
}
