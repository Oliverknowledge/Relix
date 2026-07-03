import { NextResponse } from "next/server";
import { recordJobCompletion } from "@/app/lib/reputation-store";
import type { SpecialistId } from "@/app/lib/specialist-agents";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      amountSol?: number;
      client?: string;
      hiredAt?: string;
      signature?: string;
      specialistId?: SpecialistId;
    };

    if (!body.specialistId || !body.signature || !body.amountSol) {
      return NextResponse.json(
        { error: "specialistId, signature, and amountSol are required." },
        { status: 400 }
      );
    }

    const reputation = await recordJobCompletion({
      amountSol: body.amountSol,
      client: body.client,
      hiredAt: body.hiredAt || new Date().toISOString(),
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
            : "Could not record job completion."
      },
      { status: 500 }
    );
  }
}
