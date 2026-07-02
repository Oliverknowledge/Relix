import {
  inferProductArea,
  type GitHubRepositoryContext
} from "@/app/lib/github-tool";

export type WebsiteAnalysis = {
  audience: string;
  ctas: string[];
  error?: string;
  finalUrl?: string;
  h1: string;
  h2s: string[];
  languageSignals: string[];
  mainText: string;
  metaDescription: string;
  ok: boolean;
  primaryCta: string;
  promise: string;
  recommendation: string;
  title: string;
  url: string;
};

export type WebsiteComparison = {
  recommendation: string;
  status: "aligned" | "missing-latest-update" | "unread";
  summary: string;
};

const ctaWords = [
  "start",
  "signup",
  "sign up",
  "join",
  "waitlist",
  "get started",
  "try",
  "book",
  "demo",
  "download",
  "launch",
  "mint"
];

const pricingWords = ["pricing", "free", "paid", "plan", "trial"];
const waitlistWords = ["waitlist", "signup", "sign up", "join"];

export async function analyseWebsiteUrl(input: string): Promise<WebsiteAnalysis> {
  const validated = validateWebsiteUrl(input);

  if (!validated.ok) {
    return unreadWebsite(input, validated.error);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7_000);

  try {
    const response = await fetch(validated.url, {
      cache: "no-store",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "RelixGrowthEmployee/1.0"
      },
      redirect: "follow",
      signal: controller.signal
    });

    if (!response.ok) {
      return unreadWebsite(validated.url, `Website returned ${response.status}.`);
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      return unreadWebsite(validated.url, "Website did not return HTML.");
    }

    const html = (await response.text()).slice(0, 240_000);
    const title = extractTagText(html, "title");
    const metaDescription = extractMetaDescription(html);
    const h1 = extractTagText(html, "h1");
    const h2s = extractAllTagText(html, "h2").slice(0, 5);
    const ctas = extractCtas(html);
    const visibleText = htmlToText(html).slice(0, 1600);
    const languageSignals = detectLanguageSignals(visibleText);
    const primaryCta = ctas[0] || inferCta(visibleText);
    const promise = title || h1 || metaDescription || firstSentence(visibleText);
    const audience = inferAudience(visibleText);

    return {
      audience,
      ctas,
      finalUrl: response.url,
      h1,
      h2s,
      languageSignals,
      mainText: visibleText,
      metaDescription,
      ok: true,
      primaryCta,
      promise,
      recommendation: landingRecommendation({
        h1,
        languageSignals,
        metaDescription,
        primaryCta
      }),
      title,
      url: validated.url
    };
  } catch (error) {
    return unreadWebsite(
      validated.url,
      error instanceof Error && error.name === "AbortError"
        ? "Website request timed out."
        : "Website could not be analysed."
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function compareWebsiteWithGitHub({
  github,
  website
}: {
  github: GitHubRepositoryContext;
  website: WebsiteAnalysis | null;
}): WebsiteComparison {
  const productArea = inferProductArea([
    github.description,
    github.readme,
    github.recentSummary,
    ...github.commits.map((commit) => commit.message),
    github.releases[0]?.body || ""
  ]);

  if (!website || !website.ok) {
    return {
      recommendation:
        "Continue with repository context, then review the landing page before campaign spend increases.",
      status: "unread",
      summary: "Website could not be analysed"
    };
  }

  const websiteText = [
    website.title,
    website.metaDescription,
    website.h1,
    ...website.h2s,
    website.mainText
  ]
    .join(" ")
    .toLowerCase();
  const areaTerms = termsForProductArea(productArea);
  const matchesLatestWork = areaTerms.some((term) => websiteText.includes(term));

  if (matchesLatestWork) {
    return {
      recommendation: website.recommendation,
      status: "aligned",
      summary: "Product and website are aligned"
    };
  }

  return {
    recommendation: `Add a landing page section that names the recent ${productArea} work before the campaign goes live.`,
    status: "missing-latest-update",
    summary: "Website is missing the latest product update"
  };
}

function validateWebsiteUrl(input: string) {
  const value = input.trim();

  if (!value) {
    return { error: "Website URL was not provided.", ok: false as const };
  }

  try {
    const url = new URL(value);

    if (!["http:", "https:"].includes(url.protocol)) {
      return { error: "Website URL must use http or https.", ok: false as const };
    }

    return { ok: true as const, url: url.toString() };
  } catch {
    return { error: "Website URL is invalid.", ok: false as const };
  }
}

function unreadWebsite(url: string, error: string): WebsiteAnalysis {
  return {
    audience: "",
    ctas: [],
    error,
    h1: "",
    h2s: [],
    languageSignals: [],
    mainText: "",
    metaDescription: "",
    ok: false,
    primaryCta: "",
    promise: "",
    recommendation:
      "Review the landing page manually before increasing campaign spend.",
    title: "",
    url
  };
}

function extractTagText(html: string, tag: string) {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));

  return cleanText(match?.[1] || "");
}

function extractAllTagText(html: string, tag: string) {
  return Array.from(
    html.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi"))
  )
    .map((match) => cleanText(match[1]))
    .filter(Boolean);
}

function extractMetaDescription(html: string) {
  const match =
    html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i) ||
    html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["'][^>]*>/i);

  return cleanText(match?.[1] || "");
}

function extractCtas(html: string) {
  const candidates = Array.from(
    html.matchAll(/<(a|button)[^>]*>([\s\S]*?)<\/\1>/gi)
  )
    .map((match) => cleanText(match[2]))
    .filter((text) => text.length > 1 && text.length < 80);

  return unique(
    candidates.filter((text) =>
      ctaWords.some((word) => text.toLowerCase().includes(word))
    )
  ).slice(0, 5);
}

function htmlToText(html: string) {
  return cleanText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

function cleanText(value: string) {
  return decodeHtml(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function detectLanguageSignals(text: string) {
  const lower = text.toLowerCase();
  const signals = [
    ...pricingWords.filter((word) => lower.includes(word)),
    ...waitlistWords.filter((word) => lower.includes(word))
  ];

  return unique(signals);
}

function inferCta(text: string) {
  const lower = text.toLowerCase();
  const found = ctaWords.find((word) => lower.includes(word));

  return found ? titleCase(found) : "No clear CTA detected";
}

function inferAudience(text: string) {
  const lower = text.toLowerCase();

  if (lower.includes("founder")) {
    return "founders";
  }

  if (lower.includes("player") || lower.includes("game")) {
    return "players";
  }

  if (lower.includes("team")) {
    return "teams";
  }

  if (lower.includes("creator")) {
    return "creators";
  }

  return "early users";
}

function landingRecommendation({
  h1,
  languageSignals,
  metaDescription,
  primaryCta
}: {
  h1: string;
  languageSignals: string[];
  metaDescription: string;
  primaryCta: string;
}) {
  if (!primaryCta || primaryCta === "No clear CTA detected") {
    return "Make the primary CTA explicit before sending campaign traffic.";
  }

  if (!h1 || h1.length < 12) {
    return "Sharpen the landing page headline so visitors understand the product faster.";
  }

  if (!metaDescription) {
    return "Add a concise meta description that matches the campaign promise.";
  }

  if (!languageSignals.includes("waitlist") && !languageSignals.includes("signup")) {
    return "Make the signup or waitlist path more visible before increasing spend.";
  }

  return "Keep the CTA close to the launch message and route visitors directly to signup.";
}

function firstSentence(value: string) {
  return value.split(/[.!?]/)[0]?.trim() || "";
}

function termsForProductArea(productArea: string) {
  if (productArea.includes("onboarding") || productArea.includes("signup")) {
    return ["onboard", "signup", "sign up", "waitlist", "first-session"];
  }

  if (productArea.includes("landing")) {
    return ["landing", "cta", "headline", "signup"];
  }

  if (productArea.includes("wallet")) {
    return ["wallet", "connect", "activation"];
  }

  if (productArea.includes("player")) {
    return ["player", "game", "play", "session"];
  }

  return ["new", "launch", "try", "start"];
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
