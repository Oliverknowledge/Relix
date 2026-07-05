import {
  inferProductArea,
  type GitHubRepositoryContext
} from "@/app/lib/github-tool";
import {
  analyzeRepository,
  type RepositoryAnalysis
} from "@/app/lib/repository-analysis";
import type { GoogleAnalyticsMetrics } from "@/app/lib/google-analytics";
import {
  compareWebsiteWithGitHub,
  type WebsiteAnalysis,
  type WebsiteComparison
} from "@/app/lib/website-analysis";

export type RepositoryEvidence = {
  label: string;
  source: "README" | "Repository" | "Commit" | "Release";
  text: string;
};

export type GrowthCampaignAssets = {
  analysis: RepositoryAnalysis;
  analyticsSummary: string;
  evidence: RepositoryEvidence[];
  landingPageRecommendation: string;
  nextRecommendation: string;
  opportunity: string;
  opportunityLabel: string;
  productArea: string;
  productName: string;
  repository: string;
  sourceSummary: string;
  websiteComparison: WebsiteComparison;
  websiteSummary: string;
};

export function createCampaignAssets({
  github,
  analytics,
  website
}: {
  analytics?: GoogleAnalyticsMetrics | null;
  github: GitHubRepositoryContext;
  website?: WebsiteAnalysis | null;
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
  const evidence = createEvidence(github, repoHeadline);
  const opportunityLabel = opportunityFromArea(productArea);
  const analysis = analyzeRepository(github);
  const websiteComparison = compareWebsiteWithGitHub({
    github,
    website: website || null
  });
  const websiteSummary = website?.ok
    ? `The website promises "${website.promise}" for ${website.audience}. Primary CTA: ${website.primaryCta}.`
    : "Website could not be analysed.";
  const analyticsSummary =
    analytics?.summary || "Analytics not connected.";
  // Quote the shipped change verbatim instead of splicing a raw commit title
  // into a sentence (which produced "I noticed add delivery readiness..."). The
  // launch reason only references the website when the site was actually read
  // and is behind the product — a failed/unread analysis is never framed as a
  // positive reason to launch.
  const opportunityReason =
    websiteComparison.status === "missing-latest-update"
      ? `Your site doesn't mention it yet, so a launch now gives people a concrete reason to look again.`
      : `That's a concrete reason to put ${productName} in front of the right people now.`;
  const opportunity = `Your latest ship: "${quoteChange(
    launchChange
  )}." ${opportunityReason}`;

  return {
    analysis,
    analyticsSummary,
    evidence,
    landingPageRecommendation: websiteComparison.recommendation,
    nextRecommendation:
      websiteComparison.status === "missing-latest-update"
        ? websiteComparison.recommendation
        : nextRecommendationFor(productArea, supportingChange),
    opportunity,
    opportunityLabel,
    productArea,
    productName,
    repository: github.fullName,
    sourceSummary: github.recentSummary,
    websiteComparison,
    websiteSummary
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

// Prepares a shipped change (usually a raw commit title) to be shown inside
// quotes: collapse whitespace, strip a trailing period so we never render
// ".", and capitalise the first letter so the quote reads cleanly.
function quoteChange(value: string) {
  const text = value.trim().replace(/\s+/g, " ").replace(/[.\s]+$/, "");

  if (!text) {
    return "the latest update";
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}
