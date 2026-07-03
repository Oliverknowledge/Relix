import { NextResponse } from "next/server";
import { listSpecialistReputation } from "@/app/lib/reputation-store";

export async function GET() {
  try {
    const reputation = await listSpecialistReputation();

    return NextResponse.json({ reputation });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not read specialist reputation."
      },
      { status: 500 }
    );
  }
}
