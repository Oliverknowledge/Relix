import { NextResponse, type NextRequest } from "next/server";

type GitHubUser = {
  avatar_url: string;
  html_url: string;
  login: string;
};

export async function GET(request: NextRequest) {
  const configured = Boolean(
    process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
  );
  const token = request.cookies.get("relix_github_token")?.value;

  if (!configured) {
    return NextResponse.json({ configured, connected: false });
  }

  if (!token) {
    return NextResponse.json({ configured, connected: false });
  }

  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return NextResponse.json({ configured, connected: false });
    }

    const user = (await response.json()) as GitHubUser;

    return NextResponse.json({
      configured,
      connected: true,
      user: {
        avatarUrl: user.avatar_url,
        login: user.login,
        url: user.html_url
      }
    });
  } catch {
    return NextResponse.json({
      configured,
      connected: false,
      error: "GitHub status unavailable."
    });
  }
}
