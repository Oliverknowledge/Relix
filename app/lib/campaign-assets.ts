import {
  inferProductArea,
  type GitHubRepositoryContext
} from "@/app/lib/github-tool";
import {
  analyzeRepository,
  type RepositoryAnalysis
} from "@/app/lib/repository-analysis";

export type RepositoryEvidence = {
  label: string;
  source: "README" | "Repository" | "Commit" | "Release";
  text: string;
};

export type LaunchThreadPost = {
  label: string;
  text: string;
};

export type FounderReply = {
  prompt: string;
  text: string;
};

export type GrowthCampaignAssets = {
  analysis: RepositoryAnalysis;
  evidence: RepositoryEvidence[];
  followUpCampaign: string;
  founderReplies: FounderReply[];
  launchNote: string;
  launchThread: LaunchThreadPost[];
  nextRecommendation: string;
  opportunity: string;
  opportunityLabel: string;
  productArea: string;
  productName: string;
  repository: string;
  sourceSummary: string;
  specialistReport: string;
};

export function createCampaignAssets({
  github,
  goal
}: {
  github: GitHubRepositoryContext;
  goal: string;
}): GrowthCampaignAssets {
  const productName = humanizeRepoName(github.name);
  const productArea = inferProductArea([
    github.description,
    github.readme,
    github.recentSummary,
    ...github.commits.map((commit) => commit.message),
    github.releases[0]?.body || ""
  ]);
  const release = github.releases[0];
  const primaryCommit = github.commits[0];
  const secondaryCommit = github.commits[1];
  const repoHeadline = extractReadmeHeadline(github.readme) || github.description;
  const launchChange =
    release?.name || primaryCommit?.message || repoHeadline || "the latest build";
  const supportingChange =
    secondaryCommit?.message || release?.body || github.description || launchChange;
  const goalLine = goal.trim() || "grow signups";
  const evidence = createEvidence(github, repoHeadline);
  const opportunityLabel = opportunityFromArea(productArea);
  const analysis = analyzeRepository(github);
  const opportunity = `I noticed ${plainLower(
    launchChange
  )}. That gives new users a concrete reason to try ${productName} now.`;

  return {
    analysis,
    evidence,
    followUpCampaign: `Second announcement: show what founders learned from the first launch window, then point users back to ${plainLower(
      supportingChange
    )}. Keep it specific: what improved, who should try it, and what feedback is needed next.`,
    founderReplies: [
      {
        prompt: "Why should I try it now?",
        text: `Because the latest ${productName} work is focused on ${productArea}. The campaign should point people at the new first-session experience, not make a broad traction claim.`
      },
      {
        prompt: "What changed?",
        text: `${launchChange}. The README and recent commits both point to ${productArea}, so the launch should stay tightly focused on that improvement.`
      },
      {
        prompt: "Is this live?",
        text: `The campaign assets are ready for review. Nothing has been posted or sent yet.`
      }
    ],
    launchNote: `${productName} is ready for a focused launch around ${productArea}. Recent repository work shows ${plainLower(
      launchChange
    )}. The campaign should make one clear promise: ${goalLine.toLowerCase()} by giving people a reason to try the newest build immediately.`,
    launchThread: [
      {
        label: "Tweet 1",
        text: `${productName} has a new launch moment: ${launchChange}.`
      },
      {
        label: "Tweet 2",
        text: `The reason this matters: the recent work is about ${productArea}. That is exactly where new users decide whether to keep going.`
      },
      {
        label: "Tweet 3",
        text: `Next step: invite players into the updated flow, watch where they hesitate, and use the tournament window to turn the new build into real feedback.`
      }
    ],
    nextRecommendation: nextRecommendationFor(productArea, supportingChange),
    opportunity,
    opportunityLabel,
    productArea,
    productName,
    repository: github.fullName,
    sourceSummary: github.recentSummary,
    specialistReport: `I've prepared a launch centred around ${productArea}. The event gives new users a reason to try the latest update immediately. All campaign assets are ready.`
  };
}

function createEvidence(
  github: GitHubRepositoryContext,
  readmeHeadline: string
): RepositoryEvidence[] {
  const evidence: RepositoryEvidence[] = [];

  if (github.description) {
    evidence.push({
      label: "Repository description",
      source: "Repository",
      text: github.description
    });
  }

  if (readmeHeadline) {
    evidence.push({
      label: "README",
      source: "README",
      text: readmeHeadline
    });
  }

  if (github.releases[0]) {
    evidence.push({
      label: "Latest release",
      source: "Release",
      text: github.releases[0].name
    });
  }

  github.commits.slice(0, 3).forEach((commit, index) => {
    evidence.push({
      label: `Commit ${index + 1}`,
      source: "Commit",
      text: commit.message
    });
  });

  return evidence.slice(0, 6);
}

function extractReadmeHeadline(readme: string) {
  const lines = readme
    .split(/\r?\n/)
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .filter(Boolean);

  return lines.find((line) => line.length > 8 && line.length < 140) || "";
}

function humanizeRepoName(name: string) {
  return name
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function nextRecommendationFor(productArea: string, supportingChange: string) {
  if (productArea.includes("onboarding") || productArea.includes("signup")) {
    return `Ship one more onboarding polish pass before the tournament begins. The next launch beat should prove that new users can start without friction.`;
  }

  if (productArea.includes("landing")) {
    return `Tighten the landing page CTA before the campaign goes live. The next launch beat should make the signup path unmistakable.`;
  }

  if (productArea.includes("wallet")) {
    return `Add one more wallet-safety note before launch. The campaign will work better if the first connection feels low-risk.`;
  }

  return `Ship one more visible gameplay update before the campaign begins. Recent work already points to ${plainLower(
    supportingChange
  )}; give players one more reason to join now.`;
}

function opportunityFromArea(productArea: string) {
  if (productArea.includes("onboarding") || productArea.includes("signup")) {
    return "Found onboarding improvements";
  }

  if (productArea.includes("landing")) {
    return "Found landing page changes";
  }

  if (productArea.includes("waitlist")) {
    return "Found waitlist growth signal";
  }

  if (productArea.includes("wallet")) {
    return "Found wallet activation work";
  }

  if (productArea.includes("player")) {
    return "Found player activation work";
  }

  return "Found launch-worthy product work";
}

function plainLower(value: string) {
  if (!value) {
    return "the latest update";
  }

  return value.charAt(0).toLowerCase() + value.slice(1);
}
