import { NextResponse, type NextRequest } from "next/server";
import {
  createGoogleState,
  googleAnalyticsConfiguration,
  googleAnalyticsOAuthUrl,
  googleAnalyticsRedirectUri
} from "@/app/lib/google-analytics";
import { appOrigin, secureCookie } from "@/app/lib/oauth";

export function GET(request: NextRequest) {
  const origin = appOrigin(request);
  const config = googleAnalyticsConfiguration();

  if (!config.configured) {
    return NextResponse.redirect(new URL("/?analytics=not_configured", origin));
  }

  const state = createGoogleState();
  const redirectUri = googleAnalyticsRedirectUri(request);
  const response = NextResponse.redirect(
    googleAnalyticsOAuthUrl({ redirectUri, state })
  );

  response.cookies.set("relix_google_state", state, {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/",
    sameSite: "lax",
    secure: secureCookie()
  });

  return response;
}
