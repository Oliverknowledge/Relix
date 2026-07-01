import { NextResponse, type NextRequest } from "next/server";
import { appOrigin, secureCookie } from "@/app/lib/oauth";

type GitHubTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

export async function GET(request: NextRequest) {
  const origin = appOrigin(request);
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get("relix_github_state")?.value;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/?github=not_configured", origin));
  }

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(new URL("/?github=state_error", origin));
  }

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${origin}/api/github/callback`
    }),
    headers: {
      Accept: "application/json"
    },
    method: "POST",
    cache: "no-store"
  });
  const token = (await tokenResponse.json()) as GitHubTokenResponse;

  if (!tokenResponse.ok || !token.access_token) {
    const message = token.error_description || token.error || "oauth_failed";
    return NextResponse.redirect(
      new URL(`/?github=${encodeURIComponent(message)}`, origin)
    );
  }

  const response = NextResponse.redirect(new URL("/", origin));
  response.cookies.set("relix_github_token", token.access_token, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: secureCookie()
  });
  response.cookies.delete("relix_github_state");

  return response;
}
