import { NextResponse } from "next/server";
import {
  createCampaignPlan,
  type FounderRequest
} from "@/app/lib/campaign";
import { enhanceCampaignPlan } from "@/app/lib/campaign-ai";
import { collectMarketBids } from "@/app/lib/coralos/market";
import type { GitHubRepositoryContext } from "@/app/lib/github-tool";
import type { GoogleAnalyticsMetrics } from "@/app/lib/google-analytics";
import { registerPublishedSpecialists } from "@/app/lib/specialist-agents";
import type {
  SpecialistId,
  SpecialistReputation
} from "@/app/lib/specialist-agents";
import { listPublishedSpecialists } from "@/app/lib/specialist-store";
import type { WebsiteAnalysis } from "@/app/lib/website-analysis";

type PlanBody = {
  analytics?: GoogleAnalyticsMetrics | null;
  github: GitHubRepositoryContext;
  reputation?: Partial<Record<SpecialistId, SpecialistReputation>>;
  request: FounderRequest;
  website?: WebsiteAnalysis | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PlanBody;

    if (!body.request || !body.github) {
      return NextResponse.json(
        { error: "request and github context are required." },
        { status: 400 }
      );
    }

    // Make published seller agents biddable on the server too.
    registerPublishedSpecialists(await listPublishedSpecialists());

    const plan = await createCampaignPlan(
      body.request,
      {
        analytics: body.analytics,
        github: body.github,
        reputation: body.reputation,
        website: body.website
      },
      // CoralOS is the primary buyer/seller coordination path; falls back to
      // local bidding if the Coral runtime is not available.
      collectMarketBids
    );
    const enhanced = await enhanceCampaignPlan(plan);

    return NextResponse.json({
      aiEnhanced: enhanced.aiEnhanced,
      plan: enhanced.plan
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not plan the campaign."
      },
      { status: 500 }
    );
  }
}
