import { NextResponse } from "next/server";
import { generateDelivery } from "@/app/lib/campaign-ai";
import {
  getSpecialistAdapter,
  registerPublishedSpecialists,
  type SpecialistJobContext
} from "@/app/lib/specialist-agents";
import { listPublishedSpecialists } from "@/app/lib/specialist-store";

type DeliverBody = {
  jobContext: SpecialistJobContext;
  specialistId: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DeliverBody;

    if (!body.specialistId || !body.jobContext) {
      return NextResponse.json(
        { error: "specialistId and jobContext are required." },
        { status: 400 }
      );
    }

    registerPublishedSpecialists(await listPublishedSpecialists());

    if (!getSpecialistAdapter(body.specialistId)) {
      return NextResponse.json(
        { error: "Unknown specialist." },
        { status: 404 }
      );
    }

    const result = await generateDelivery(body.specialistId, body.jobContext);

    return NextResponse.json({
      aiGenerated: result.aiGenerated,
      delivery: result.delivery
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not generate the delivery."
      },
      { status: 500 }
    );
  }
}
