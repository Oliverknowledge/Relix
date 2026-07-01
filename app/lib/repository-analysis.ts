import {
  inferProductArea,
  type GitHubRepositoryContext
} from "@/app/lib/github-tool";

export type RepositoryAnalysis = {
  keyProductImprovements: string[];
  launchOpportunities: string[];
  recentProductChanges: string[];
  repositorySummary: string;
  techStack: string[];
};

export function analyzeRepository(
  context: GitHubRepositoryContext
): RepositoryAnalysis {
  const productArea = inferProductArea([
    context.description,
    context.readme,
    ...context.commits.map((commit) => commit.message),
    context.releases[0]?.body || ""
  ]);
  const readmeHeadline = extractReadmeHeadline(context.readme);
  const commits = context.commits.slice(0, 4).map((commit) => commit.message);
  const latestRelease = context.releases[0];
  const repositorySummary =
    context.description ||
    readmeHeadline ||
    `${context.name} is positioned around ${productArea}.`;

  return {
    keyProductImprovements: unique([
      productArea,
      ...commits.map((commit) => improvementFromText(commit)),
      latestRelease ? improvementFromText(latestRelease.name) : ""
    ]).slice(0, 4),
    launchOpportunities: unique([
      `Launch around ${productArea}`,
      latestRelease
        ? `Use ${latestRelease.name} as the announcement hook`
        : "",
      commits[0]
        ? `Turn "${commits[0]}" into the first campaign beat`
        : "",
      `Invite users to try the newest ${context.name} build`
    ]).slice(0, 4),
    recentProductChanges: unique([
      latestRelease ? `Release: ${latestRelease.name}` : "",
      ...commits
    ]).slice(0, 5),
    repositorySummary,
    techStack: context.techStack
  };
}

function improvementFromText(value: string) {
  const text = value.toLowerCase();

  if (text.includes("onboard") || text.includes("signup")) {
    return "Smoother onboarding";
  }

  if (text.includes("landing") || text.includes("cta")) {
    return "Clearer landing page";
  }

  if (text.includes("wallet")) {
    return "Better wallet activation";
  }

  if (text.includes("fix") || text.includes("bug")) {
    return "More reliable first session";
  }

  if (text.includes("game") || text.includes("player")) {
    return "Stronger player activation";
  }

  return value;
}

function extractReadmeHeadline(readme: string) {
  const lines = readme
    .split(/\r?\n/)
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .filter(Boolean);

  return lines.find((line) => line.length > 8 && line.length < 140) || "";
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
