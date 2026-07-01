import { NextResponse, type NextRequest } from "next/server";
import { appOrigin, randomToken, secureCookie } from "@/app/lib/oauth";

const githubAuthorizeUrl = "https://github.com/login/oauth/authorize";

export function GET(request: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const origin = appOrigin(request);

  if (!clientId) {
    return NextResponse.redirect(new URL("/?github=not_configured", origin));
  }

  const state = randomToken();
  const redirectUri = `${origin}/api/github/callback`;
  const url = new URL(githubAuthorizeUrl);

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "repo read:user");
  url.searchParams.set("state", state);

  const response = NextResponse.redirect(url);
  response.cookies.set("relix_github_state", state, {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/",
    sameSite: "lax",
    secure: secureCookie()
  });

  return response;
}
