import { NextResponse, type NextRequest } from "next/server";
import { analyseWebsiteUrl } from "@/app/lib/website-analysis";

type AnalyseBody = {
  url?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyseBody;
    const analysis = await analyseWebsiteUrl(body.url || "");

    return NextResponse.json({ analysis });
  } catch (error) {
    return NextResponse.json(
      {
        analysis: {
          error:
            error instanceof Error
              ? error.message
              : "Website could not be analysed.",
          ok: false
        }
      },
      { status: 200 }
    );
  }
}
