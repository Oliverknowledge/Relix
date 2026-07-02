import type { NextRequest, NextResponse } from "next/server";
import { decryptString, encryptString, tokenEncryptionConfigured } from "@/app/lib/crypto";
import { appOrigin, randomToken, secureCookie } from "@/app/lib/oauth";

const googleAuthorizeUrl = "https://accounts.google.com/o/oauth2/v2/auth";
const googleTokenUrl = "https://oauth2.googleapis.com/token";
const analyticsAdminBase = "https://analyticsadmin.googleapis.com/v1beta";
const analyticsDataBase = "https://analyticsdata.googleapis.com/v1beta";
const accountCookieName = "relix_google_analytics";
const analyticsScope = "https://www.googleapis.com/auth/analytics.readonly";

export type GoogleAnalyticsAccount = {
  accessToken: string;
  connectedAt: string;
  refreshToken?: string;
  scope: string;
  tokenExpiry: string;
};

export type GoogleAnalyticsProperty = {
  accountName: string;
  displayName: string;
  propertyId: string;
};

export type AnalyticsTrafficSource = {
  name: string;
  sessions: number;
};

export type AnalyticsPage = {
  path: string;
  views: number;
};

export type GoogleAnalyticsMetrics = {
  connected: boolean;
  conversions?: number;
  engagementRate?: number;
  error?: string;
  pageviews?: number;
  propertyId?: string;
  propertyName?: string;
  sessions?: number;
  summary: string;
  topPages: AnalyticsPage[];
  topSources: AnalyticsTrafficSource[];
  users?: number;
};

export type GoogleAnalyticsStatus = {
  configured: boolean;
  connected: boolean;
  error?: string;
  missing?: string[];
  properties?: GoogleAnalyticsProperty[];
  propertiesError?: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
};

type AccountSummariesResponse = {
  accountSummaries?: Array<{
    account?: string;
    displayName?: string;
    propertySummaries?: Array<{
      displayName?: string;
      property?: string;
    }>;
  }>;
  error?: { message?: string };
};

type RunReportResponse = {
  error?: { message?: string };
  rows?: Array<{
    dimensionValues?: Array<{ value?: string }>;
    metricValues?: Array<{ value?: string }>;
  }>;
};

export function googleAnalyticsConfiguration() {
  const missing = [
    ["GOOGLE_CLIENT_ID", process.env.GOOGLE_CLIENT_ID],
    ["GOOGLE_CLIENT_SECRET", process.env.GOOGLE_CLIENT_SECRET],
    ["RELIX_TOKEN_ENCRYPTION_KEY", process.env.RELIX_TOKEN_ENCRYPTION_KEY]
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  return {
    configured: missing.length === 0 && tokenEncryptionConfigured(),
    missing
  };
}

export function googleAnalyticsRedirectUri(request: NextRequest) {
  return (
    process.env.GOOGLE_REDIRECT_URI || `${appOrigin(request)}/api/google/callback`
  );
}

export function googleAnalyticsOAuthUrl({
  redirectUri,
  state
}: {
  redirectUri: string;
  state: string;
}) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is required.");
  }

  const url = new URL(googleAuthorizeUrl);

  url.searchParams.set("access_type", "offline");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", analyticsScope);
  url.searchParams.set("state", state);

  return url;
}

export function createGoogleState() {
  return randomToken();
}

export async function exchangeGoogleCode({
  code,
  redirectUri
}: {
  code: string;
  redirectUri: string;
}) {
  const token = await requestGoogleToken(
    new URLSearchParams({
      client_id: requiredEnv("GOOGLE_CLIENT_ID"),
      client_secret: requiredEnv("GOOGLE_CLIENT_SECRET"),
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri
    })
  );

  if (!token.access_token) {
    throw new Error(token.error_description || token.error || "Google OAuth failed.");
  }

  return {
    accessToken: token.access_token,
    connectedAt: new Date().toISOString(),
    refreshToken: token.refresh_token,
    scope: token.scope || analyticsScope,
    tokenExpiry: expiryFrom(token.expires_in)
  };
}

export function getGoogleAnalyticsAccount(request: NextRequest) {
  const encoded = request.cookies.get(accountCookieName)?.value;

  if (!encoded) {
    return null;
  }

  try {
    const account = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as GoogleAnalyticsAccount;

    return account;
  } catch {
    return null;
  }
}

export function setGoogleAnalyticsAccountCookie(
  response: NextResponse,
  account: GoogleAnalyticsAccount
) {
  response.cookies.set(
    accountCookieName,
    Buffer.from(JSON.stringify(account), "utf8").toString("base64url"),
    {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
      secure: secureCookie()
    }
  );
}

export async function getValidGoogleAnalyticsAccess(
  account: GoogleAnalyticsAccount
) {
  const expiry = new Date(account.tokenExpiry).getTime();

  if (Number.isFinite(expiry) && expiry - Date.now() > 90_000) {
    return {
      account,
      accessToken: decryptString(account.accessToken)
    };
  }

  if (!account.refreshToken) {
    throw new Error("Google Analytics access expired. Reconnect Analytics.");
  }

  const token = await requestGoogleToken(
    new URLSearchParams({
      client_id: requiredEnv("GOOGLE_CLIENT_ID"),
      client_secret: requiredEnv("GOOGLE_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: decryptString(account.refreshToken)
    })
  );

  if (!token.access_token) {
    throw new Error(token.error_description || token.error || "Could not refresh Analytics access.");
  }

  const refreshedAccount: GoogleAnalyticsAccount = {
    ...account,
    accessToken: encryptString(token.access_token),
    refreshToken: token.refresh_token
      ? encryptString(token.refresh_token)
      : account.refreshToken,
    scope: token.scope || account.scope,
    tokenExpiry: expiryFrom(token.expires_in)
  };

  return {
    account: refreshedAccount,
    accessToken: token.access_token
  };
}

export async function listGoogleAnalyticsProperties(accessToken: string) {
  const response = await fetch(`${analyticsAdminBase}/accountSummaries`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  const data = (await response.json()) as AccountSummariesResponse;

  if (!response.ok) {
    throw new Error(data.error?.message || "Could not read Analytics properties.");
  }

  return (data.accountSummaries || []).flatMap((account) =>
    (account.propertySummaries || [])
      .map((property) => {
        const propertyName = property.property || "";
        const propertyId = propertyName.replace("properties/", "");

        return {
          accountName: account.displayName || account.account || "Analytics account",
          displayName: property.displayName || propertyId,
          propertyId
        };
      })
      .filter((property) => property.propertyId)
  );
}

export async function fetchGoogleAnalyticsMetrics({
  accessToken,
  propertyId,
  propertyName
}: {
  accessToken: string;
  propertyId: string;
  propertyName?: string;
}): Promise<GoogleAnalyticsMetrics> {
  const overview = await runReport(accessToken, propertyId, {
    dateRanges: [{ endDate: "today", startDate: "28daysAgo" }],
    metrics: [
      { name: "activeUsers" },
      { name: "sessions" },
      { name: "screenPageViews" },
      { name: "engagementRate" }
    ]
  });
  const [keyEvents, sources, pages] = await Promise.all([
    safeRunReport(accessToken, propertyId, {
      dateRanges: [{ endDate: "today", startDate: "28daysAgo" }],
      metrics: [{ name: "keyEvents" }]
    }),
    safeRunReport(accessToken, propertyId, {
      dateRanges: [{ endDate: "today", startDate: "28daysAgo" }],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      limit: "5",
      metrics: [{ name: "sessions" }],
      orderBys: [{ desc: true, metric: { metricName: "sessions" } }]
    }),
    safeRunReport(accessToken, propertyId, {
      dateRanges: [{ endDate: "today", startDate: "28daysAgo" }],
      dimensions: [{ name: "pagePath" }],
      limit: "5",
      metrics: [{ name: "screenPageViews" }],
      orderBys: [{ desc: true, metric: { metricName: "screenPageViews" } }]
    })
  ]);
  const overviewValues = overview.rows?.[0]?.metricValues || [];
  const users = numberValue(overviewValues[0]?.value);
  const sessions = numberValue(overviewValues[1]?.value);
  const pageviews = numberValue(overviewValues[2]?.value);
  const engagementRate = numberValue(overviewValues[3]?.value);
  const conversions = numberValue(
    keyEvents.report?.rows?.[0]?.metricValues?.[0]?.value
  );
  const topSources = (sources.report?.rows || []).map((row) => ({
    name: row.dimensionValues?.[0]?.value || "Unknown",
    sessions: numberValue(row.metricValues?.[0]?.value)
  }));
  const topPages = (pages.report?.rows || []).map((row) => ({
    path: row.dimensionValues?.[0]?.value || "/",
    views: numberValue(row.metricValues?.[0]?.value)
  }));
  const partial = Boolean(keyEvents.error || sources.error || pages.error);

  return {
    connected: true,
    conversions,
    engagementRate,
    pageviews,
    propertyId,
    propertyName,
    sessions,
    summary: analyticsSummary({
      conversions,
      engagementRate,
      partial,
      sessions,
      topSources,
      users
    }),
    topPages,
    topSources,
    users
  };
}

export function analyticsNotConnected(): GoogleAnalyticsMetrics {
  return {
    connected: false,
    summary: "Analytics not connected",
    topPages: [],
    topSources: []
  };
}

export function analyticsUnavailable(error: string): GoogleAnalyticsMetrics {
  const friendlyError = analyticsFriendlyError(error);

  return {
    connected: false,
    error: friendlyError,
    summary: friendlyError,
    topPages: [],
    topSources: []
  };
}

export function analyticsFriendlyError(error: unknown) {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "";

  if (/invalid_grant|revoked|expired|refresh|reauthori[sz]e/i.test(message)) {
    return "Analytics access expired. Reconnect Google Analytics.";
  }

  if (/permission|forbidden|insufficient|access|403/i.test(message)) {
    return "Analytics is connected, but this Google account cannot read that property.";
  }

  if (/quota|rate limit|429/i.test(message)) {
    return "Analytics is rate limited. Try again shortly.";
  }

  if (/property|properties|not found|404/i.test(message)) {
    return "Analytics is connected, but no readable property was found.";
  }

  if (/metric|dimension|compatib/i.test(message)) {
    return "Analytics is connected, but this property does not support one of the requested reports.";
  }

  return "Analytics is connected, but Google would not return data for this property.";
}

export function analyticsRequiresReconnect(error: unknown) {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "";

  return /invalid_grant|revoked|expired|refresh|reauthori[sz]e/i.test(message);
}

export function encryptedGoogleAnalyticsAccount(account: GoogleAnalyticsAccount) {
  return {
    ...account,
    accessToken: encryptString(account.accessToken),
    refreshToken: account.refreshToken ? encryptString(account.refreshToken) : undefined
  };
}

async function requestGoogleToken(body: URLSearchParams) {
  const response = await fetch(googleTokenUrl, {
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    method: "POST"
  });
  const token = (await response.json()) as GoogleTokenResponse;

  if (!response.ok) {
    throw new Error(token.error_description || token.error || "Google OAuth failed.");
  }

  return token;
}

async function runReport(
  accessToken: string,
  propertyId: string,
  body: Record<string, unknown>
) {
  const response = await fetch(
    `${analyticsDataBase}/properties/${propertyId}:runReport`,
    {
      body: JSON.stringify(body),
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      method: "POST"
    }
  );
  const data = (await response.json()) as RunReportResponse;

  if (!response.ok) {
    throw new Error(data.error?.message || "Could not read Analytics metrics.");
  }

  return data;
}

async function safeRunReport(
  accessToken: string,
  propertyId: string,
  body: Record<string, unknown>
) {
  try {
    return {
      report: await runReport(accessToken, propertyId, body)
    };
  } catch (error) {
    return {
      error: analyticsFriendlyError(error)
    };
  }
}

function analyticsSummary({
  conversions,
  engagementRate,
  partial,
  sessions,
  topSources,
  users
}: {
  conversions: number;
  engagementRate: number;
  partial: boolean;
  sessions: number;
  topSources: AnalyticsTrafficSource[];
  users: number;
}) {
  const source = topSources[0]?.name;
  const conversionLine =
    conversions > 0 ? `${conversions} key events` : "no key events found";
  const engagementLine =
    engagementRate > 0 ? `${Math.round(engagementRate * 100)}% engagement rate` : "engagement unavailable";
  const partialLine = partial ? " Some optional Analytics details were unavailable." : "";

  return `${users} users and ${sessions} sessions in the last 28 days. Top source: ${
    source || "unknown"
  }. ${conversionLine}; ${engagementLine}.${partialLine}`;
}

function numberValue(value?: string) {
  const parsed = Number(value || 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function expiryFrom(expiresIn?: number) {
  const seconds = Number(expiresIn || 3600);

  return new Date(Date.now() + seconds * 1000).toISOString();
}

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}
