import { NextResponse } from "next/server";
import { planNextStep } from "@/app/lib/campaign-ai";

type NextBody = {
  analyticsSummary?: string;
  budgetRemainingSol?: number;
  completedSpecialist?: string;
  goal?: string;
  productName?: string;
  repository?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NextBody;

    if (!body.goal || !body.productName) {
      return NextResponse.json(
        { error: "goal and productName are required." },
        { status: 400 }
      );
    }

    const plan = await planNextStep({
      analyticsSummary: body.analyticsSummary || "Analytics not connected.",
      budgetRemainingSol: Number(body.budgetRemainingSol) || 0,
      completedSpecialist: body.completedSpecialist || "The specialist",
      goal: body.goal,
      productName: body.productName,
      repository: body.repository || body.productName
    });

    return NextResponse.json({ plan });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not plan the next step."
      },
      { status: 500 }
    );
  }
}
