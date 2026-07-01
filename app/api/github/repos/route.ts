import { NextResponse, type NextRequest } from "next/server";
import { listGitHubRepositories } from "@/app/lib/github-tool";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("relix_github_token")?.value;

  if (!token) {
    return NextResponse.json(
      { error: "Connect GitHub before reading repositories." },
      { status: 401 }
    );
  }

  try {
    const repositories = await listGitHubRepositories(token);
    return NextResponse.json({ repositories });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not read GitHub repositories."
      },
      { status: 500 }
    );
  }
}
