import { NextResponse } from "next/server";
import {
  listPublishedSpecialists,
  publishSpecialist,
  type PublishSpecialistInput
} from "@/app/lib/specialist-store";

export async function GET() {
  try {
    const specialists = await listPublishedSpecialists();

    return NextResponse.json({ specialists });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not read published specialists."
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<PublishSpecialistInput>;
    const specialist = await publishSpecialist({
      basePriceSol: Number(body.basePriceSol),
      capabilities: body.capabilities || [],
      deliveryDays: Number(body.deliveryDays),
      model: body.model || "",
      name: body.name || "",
      ownerName: body.ownerName || "",
      ownerWallet: body.ownerWallet || "",
      prompt: body.prompt || "",
      version: body.version || ""
    });

    return NextResponse.json({ specialist });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not publish specialist."
      },
      { status: 400 }
    );
  }
}
