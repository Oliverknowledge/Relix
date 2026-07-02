import { NextResponse, type NextRequest } from "next/server";
import {
  encryptedGoogleAnalyticsAccount,
  exchangeGoogleCode,
  googleAnalyticsConfiguration,
  googleAnalyticsRedirectUri,
  setGoogleAnalyticsAccountCookie
} from "@/app/lib/google-analytics";
import { appOrigin } from "@/app/lib/oauth";

export async function GET(request: NextRequest) {
  const origin = appOrigin(request);
  const config = googleAnalyticsConfiguration();
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get("relix_google_state")?.value;

  if (!config.configured) {
    return NextResponse.redirect(new URL("/?analytics=not_configured", origin));
  }

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(new URL("/?analytics=state_error", origin));
  }

  try {
    const account = await exchangeGoogleCode({
      code,
      redirectUri: googleAnalyticsRedirectUri(request)
    });
    const response = NextResponse.redirect(new URL("/?analytics=connected", origin));

    setGoogleAnalyticsAccountCookie(
      response,
      encryptedGoogleAnalyticsAccount(account)
    );
    response.cookies.delete("relix_google_state");

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "analytics_oauth_failed";

    return NextResponse.redirect(
      new URL(`/?analytics=${encodeURIComponent(message)}`, origin)
    );
  }
}
