import { NextResponse, type NextRequest } from "next/server";
import {
  getProofReceipt,
  sanitizeProofUpsert,
  upsertProofReceipt
} from "@/app/lib/proof-store";

export async function GET(request: NextRequest) {
  const campaignId = request.nextUrl.searchParams.get("campaignId");

  if (!campaignId) {
    return NextResponse.json(
      { error: "campaignId is required." },
      { status: 400 }
    );
  }

  const receipt = await getProofReceipt(campaignId);

  return NextResponse.json({ receipt });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const update = sanitizeProofUpsert(body);

    if (!update) {
      return NextResponse.json(
        { error: "campaignId is required." },
        { status: 400 }
      );
    }

    const receipt = await upsertProofReceipt(update);

    return NextResponse.json({ receipt });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not save the proof receipt."
      },
      { status: 500 }
    );
  }
}
