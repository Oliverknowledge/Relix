import { NextResponse } from "next/server";
import { recordDeliveryRating } from "@/app/lib/reputation-store";
import type { SpecialistId } from "@/app/lib/specialist-agents";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      rating?: number;
      signature?: string;
      specialistId?: SpecialistId;
    };
    const rating = Number(body.rating);

    if (!body.specialistId || !body.signature) {
      return NextResponse.json(
        { error: "specialistId and signature are required." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be a whole number between 1 and 5." },
        { status: 400 }
      );
    }

    const reputation = await recordDeliveryRating({
      rating,
      signature: body.signature,
      specialistId: body.specialistId
    });

    return NextResponse.json({ reputation });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not record delivery rating."
      },
      { status: 500 }
    );
  }
}
