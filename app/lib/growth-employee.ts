import type { GrowthCampaignAssets } from "@/app/lib/campaign-assets";
import type { CampaignPlan } from "@/app/lib/campaign";
import type { GitHubRepositoryContext } from "@/app/lib/github-tool";

export type EmployeeAction = {
  detail: string;
  id: string;
  title: string;
};

export type GrowthEmployeeWork = {
  actions: EmployeeAction[];
  githubSummary: string;
  nextRecommendation: string;
};

export function createGrowthEmployeeWork({
  assets,
  campaign,
  github,
  specialistName
}: {
  assets: GrowthCampaignAssets;
  campaign: CampaignPlan;
  github: GitHubRepositoryContext;
  specialistName: string;
}): GrowthEmployeeWork {
  return {
    githubSummary: github.recentSummary,
    nextRecommendation: assets.nextRecommendation,
    actions: [
      {
        id: "repository",
        title: "Analysed repository",
        detail: `${github.fullName}: ${github.recentSummary}`
      },
      {
        id: "opportunity",
        title: "Identified launch opportunity",
        detail: `${assets.opportunity} ${assets.websiteComparison.summary}.`
      },
      {
        id: "specialist",
        title: `Hired ${specialistName}`,
        detail: `${specialistName} was the best fit for ${assets.productArea}. ${campaign.budgetStatus.message}`
      },
      {
        id: "payment",
        title: "Settled payment",
        detail: `Payment was released after delivery was reviewed. ${campaign.budgetStatus.remainingBudgetSol.toFixed(
          2
        )} SOL remains from the campaign budget.`
      },
      {
        id: "campaign",
        title: "Prepared launch campaign",
        detail: `${assets.websiteSummary} ${assets.analyticsSummary}`
      },
      {
        id: "handover",
        title: "Launch assets ready",
        detail: "Campaign successfully handed over."
      }
    ]
  };
}
