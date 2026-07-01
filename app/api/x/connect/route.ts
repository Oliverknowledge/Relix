import { NextResponse, type NextRequest } from "next/server";
import { randomToken, secureCookie } from "@/app/lib/oauth";
import {
  createPkceVerifier,
  xConfiguration,
  xOAuthUrl,
  xRedirectUri
} from "@/app/lib/x-api";
import {
  createUserId,
  getUserId,
  setUserCookie
} from "@/app/lib/session";

export function GET(request: NextRequest) {
  const config = xConfiguration();
  const origin = new URL(request.url).origin;

  if (!config.configured) {
    return NextResponse.redirect(
      new URL(
        `/?x=not_configured&missing=${encodeURIComponent(
          config.missing.join(",")
        )}`,
        origin
      )
    );
  }

  const state = randomToken();
  const codeVerifier = createPkceVerifier();
  const userId = getUserId(request) || createUserId();
  const redirectUri = xRedirectUri(request);
  const url = xOAuthUrl({ codeVerifier, redirectUri, state });
  const response = NextResponse.redirect(url);

  setUserCookie(response, userId);
  response.cookies.set("relix_x_state", state, {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/",
    sameSite: "lax",
    secure: secureCookie()
  });
  response.cookies.set("relix_x_code_verifier", codeVerifier, {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/",
    sameSite: "lax",
    secure: secureCookie()
  });

  return response;
}
