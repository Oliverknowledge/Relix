import { NextResponse } from "next/server";
import {
  checkDeliveryReadiness,
  type DeliveryReadinessInput
} from "@/app/lib/delivery-readiness";
import { attestDeliveryReadiness } from "@/app/lib/delivery-attestation";
import type { SpecialistDelivery } from "@/app/lib/specialist-agents";
import type { CoordinationMode } from "@/app/lib/coralos/types";

// The Growth Employee's (buyer agent) delivery readiness check. ADVISORY ONLY:
// it verifies the seller's delivery against the awarded bid and job, and signs
// the verdict with the agent key. It never moves money and never gates the
// founder's escrow release — the founder's Phantom signature stays the only
// release path.
type ReadinessBody = {
  awardedBidId: string;
  specialistId: string;
  delivery: SpecialistDelivery;
  jobContext: { jobId: string; goal: string };
  escrowFunded: boolean;
  coordinationMode: CoordinationMode;
  coralSessionId?: string;
  coralThreadId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReadinessBody;

    if (!body.awardedBidId || !body.specialistId || !body.delivery || !body.jobContext) {
      return NextResponse.json(
        {
          error:
            "awardedBidId, specialistId, delivery and jobContext are required."
        },
        { status: 400 }
      );
    }

    const input: DeliveryReadinessInput = {
      awardedBid: { id: body.awardedBidId, specialistId: body.specialistId },
      delivery: body.delivery,
      jobContext: body.jobContext,
      escrowFunded: Boolean(body.escrowFunded),
      coordinationMode: body.coordinationMode ?? "local-fallback",
      coralSessionId: body.coralSessionId,
      coralThreadId: body.coralThreadId
    };

    const readiness = checkDeliveryReadiness(input);
    // Best-effort signature; readiness stands even if signing fails.
    const attestation = await attestDeliveryReadiness(readiness);

    return NextResponse.json({
      readiness: attestation ? { ...readiness, attestation } : readiness
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not run the delivery readiness check."
      },
      { status: 500 }
    );
  }
}
