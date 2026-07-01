import type { GrowthCampaignAssets } from "@/app/lib/campaign-assets";
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
  github,
  specialistName
}: {
  assets: GrowthCampaignAssets;
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
        detail: assets.opportunity
      },
      {
        id: "specialist",
        title: `Hired ${specialistName}`,
        detail: `${specialistName} was the best fit for ${assets.productArea}.`
      },
      {
        id: "payment",
        title: "Settled payment",
        detail: "Payment was released after delivery was reviewed."
      },
      {
        id: "campaign",
        title: "Prepared launch campaign",
        detail: "Launch note, thread, and founder replies are ready."
      },
      {
        id: "handover",
        title: "Launch assets ready",
        detail: "Campaign successfully handed over."
      }
    ]
  };
}
