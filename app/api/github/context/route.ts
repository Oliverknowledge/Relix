import { NextResponse, type NextRequest } from "next/server";
import { fetchGitHubRepositoryContext } from "@/app/lib/github-tool";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("relix_github_token")?.value;

  if (!token) {
    return NextResponse.json(
      { error: "Connect GitHub before hiring the employee." },
      { status: 401 }
    );
  }

  try {
    const repo = request.nextUrl.searchParams.get("repo") || undefined;
    const context = await fetchGitHubRepositoryContext(token, repo);
    return NextResponse.json(context);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not read the connected GitHub repository."
      },
      { status: 500 }
    );
  }
}
