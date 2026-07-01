export type GitHubCommit = {
  message: string;
  sha: string;
  url: string;
  date: string;
};

export type GitHubRelease = {
  name: string;
  tagName: string;
  body: string;
  publishedAt: string;
  url: string;
};

export type GitHubLanguage = {
  bytes: number;
  name: string;
  share: number;
};

export type GitHubRepositorySummary = {
  defaultBranch: string;
  description: string;
  fullName: string;
  name: string;
  private: boolean;
  pushedAt: string;
  url: string;
};

export type GitHubRepositoryContext = {
  owner: string;
  name: string;
  fullName: string;
  description: string;
  url: string;
  defaultBranch: string;
  pushedAt: string;
  readme: string;
  commits: GitHubCommit[];
  releases: GitHubRelease[];
  languages: GitHubLanguage[];
  techStack: string[];
  recentSummary: string;
};

type GitHubRepo = {
  default_branch: string;
  description: string | null;
  fork: boolean;
  full_name: string;
  html_url: string;
  name: string;
  owner: { login: string };
  private: boolean;
  pushed_at: string;
};

type GitHubCommitResponse = {
  html_url: string;
  sha: string;
  commit: {
    message: string;
    author: {
      date: string;
    } | null;
  };
};

type GitHubReleaseResponse = {
  body: string | null;
  html_url: string;
  name: string | null;
  published_at: string | null;
  tag_name: string;
};

const githubApi = "https://api.github.com";

export async function listGitHubRepositories(
  token: string
): Promise<GitHubRepositorySummary[]> {
  const repos = await githubFetch<GitHubRepo[]>(
    "/user/repos?sort=pushed&direction=desc&per_page=20&affiliation=owner,collaborator",
    token
  );

  return repos.map((repo) => ({
    defaultBranch: repo.default_branch,
    description: repo.description || "",
    fullName: repo.full_name,
    name: repo.name,
    private: repo.private,
    pushedAt: repo.pushed_at,
    url: repo.html_url
  }));
}

export async function fetchGitHubRepositoryContext(
  token: string,
  fullName?: string
) {
  const repos = await githubFetch<GitHubRepo[]>(
    "/user/repos?sort=pushed&direction=desc&per_page=20&affiliation=owner,collaborator",
    token
  );
  const repo =
    (fullName && repos.find((candidate) => candidate.full_name === fullName)) ||
    repos.find((candidate) => !candidate.fork) ||
    repos[0];

  if (!repo) {
    throw new Error("No GitHub repositories found for this account.");
  }

  const [readme, commits, releases, languages] = await Promise.all([
    fetchReadme(repo.full_name, token),
    githubFetch<GitHubCommitResponse[]>(
      `/repos/${repo.full_name}/commits?per_page=5`,
      token
    ).catch(() => []),
    githubFetch<GitHubReleaseResponse[]>(
      `/repos/${repo.full_name}/releases?per_page=3`,
      token
    ).catch(() => []),
    githubFetch<Record<string, number>>(
      `/repos/${repo.full_name}/languages`,
      token
    ).catch(() => ({}))
  ]);
  const languageBreakdown = normalizeLanguages(languages);

  const context: GitHubRepositoryContext = {
    owner: repo.owner.login,
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description || "",
    url: repo.html_url,
    defaultBranch: repo.default_branch,
    pushedAt: repo.pushed_at,
    readme: trimText(readme, 2200),
    commits: commits.map((commit) => ({
      message: firstLine(commit.commit.message),
      sha: commit.sha,
      url: commit.html_url,
      date: commit.commit.author?.date || repo.pushed_at
    })),
    releases: releases.map((release) => ({
      name: release.name || release.tag_name,
      tagName: release.tag_name,
      body: trimText(release.body || "", 900),
      publishedAt: release.published_at || repo.pushed_at,
      url: release.html_url
    })),
    languages: languageBreakdown,
    techStack: detectTechStack(languageBreakdown, [repo.description || "", readme]),
    recentSummary: ""
  };

  return {
    ...context,
    recentSummary: summarizeGitHubContext(context)
  };
}

function normalizeLanguages(languages: Record<string, number>): GitHubLanguage[] {
  const total = Object.values(languages).reduce((sum, value) => sum + value, 0);

  if (total === 0) {
    return [];
  }

  return Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .map(([name, bytes]) => ({
      bytes,
      name,
      share: Number((bytes / total).toFixed(3))
    }));
}

function detectTechStack(languages: GitHubLanguage[], inputs: string[]) {
  const text = `${inputs.join(" ")} ${languages
    .map((language) => language.name)
    .join(" ")}`.toLowerCase();
  const stack = new Set<string>();

  languages.slice(0, 5).forEach((language) => stack.add(language.name));

  if (text.includes("next")) {
    stack.add("Next.js");
  }

  if (text.includes("react")) {
    stack.add("React");
  }

  if (text.includes("tailwind")) {
    stack.add("Tailwind");
  }

  if (text.includes("solana")) {
    stack.add("Solana");
  }

  if (text.includes("wallet")) {
    stack.add("Wallet integration");
  }

  if (text.includes("supabase")) {
    stack.add("Supabase");
  }

  if (text.includes("prisma")) {
    stack.add("Prisma");
  }

  return Array.from(stack).slice(0, 8);
}

export function summarizeGitHubContext(context: GitHubRepositoryContext) {
  const latestRelease = context.releases[0];
  const commitMessages = context.commits
    .slice(0, 3)
    .map((commit) => commit.message.toLowerCase());
  const productArea = inferProductArea([
    context.description,
    context.readme,
    ...commitMessages,
    latestRelease?.body || ""
  ]);

  if (latestRelease) {
    return `I found the latest release, ${latestRelease.name}, and recent work around ${productArea}.`;
  }

  if (commitMessages.length > 0) {
    return `I found recent commits around ${productArea}: ${context.commits
      .slice(0, 2)
      .map((commit) => commit.message)
      .join("; ")}.`;
  }

  return `I read ${context.fullName} and found the product is positioned around ${productArea}.`;
}

export function inferProductArea(inputs: string[]) {
  const text = inputs.join(" ").toLowerCase();

  if (text.includes("onboard") || text.includes("signup")) {
    return "onboarding and signup conversion";
  }

  if (text.includes("waitlist")) {
    return "waitlist growth";
  }

  if (text.includes("landing") || text.includes("cta")) {
    return "landing page conversion";
  }

  if (text.includes("wallet")) {
    return "wallet-connected activation";
  }

  if (text.includes("game") || text.includes("player")) {
    return "player activation";
  }

  return "product activation";
}

async function githubFetch<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${githubApi}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`GitHub request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function fetchReadme(fullName: string, token: string) {
  const response = await fetch(`${githubApi}/repos/${fullName}/readme`, {
    headers: {
      Accept: "application/vnd.github.raw",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    },
    cache: "no-store"
  });

  if (response.status === 404) {
    return "";
  }

  if (!response.ok) {
    throw new Error(`GitHub README request failed: ${response.status}`);
  }

  return response.text();
}

function firstLine(value: string) {
  return value.split("\n")[0].trim();
}

function trimText(value: string, maxLength: number) {
  const clean = value.replace(/\s+/g, " ").trim();

  if (clean.length <= maxLength) {
    return clean;
  }

  return `${clean.slice(0, maxLength - 1)}…`;
}
