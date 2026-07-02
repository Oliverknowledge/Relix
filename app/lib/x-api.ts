import type { NextRequest } from "next/server";
import {
  appOrigin,
  randomToken,
  sha256Base64Url
} from "@/app/lib/oauth";
import { tokenEncryptionConfigured } from "@/app/lib/crypto";
import {
  decryptedXTokens,
  markXAccountRevoked,
  updateXAccountTokens
} from "@/app/lib/x-store";
import type { XAccount } from "@/app/lib/x-types";

const xAuthorizeUrl = "https://x.com/i/oauth2/authorize";
const xApiBase = "https://api.x.com";
export const REQUIRED_X_SCOPES = [
  "tweet.read",
  "users.read",
  "tweet.write",
  "offline.access"
];

type XTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type XMeResponse = {
  data?: {
    id: string;
    name?: string;
    username: string;
  };
  detail?: string;
  errors?: Array<{ detail?: string; title?: string }>;
  title?: string;
};

type CreatePostResponse = {
  data?: {
    id: string;
    text: string;
  };
  detail?: string;
  errors?: Array<{
    detail?: string;
    status?: number;
    title?: string;
  }>;
  title?: string;
};

export class XApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export function xConfiguration() {
  const missing = [
    ["X_CLIENT_ID", process.env.X_CLIENT_ID],
    ["X_CLIENT_SECRET", process.env.X_CLIENT_SECRET],
    ["RELIX_TOKEN_ENCRYPTION_KEY", process.env.RELIX_TOKEN_ENCRYPTION_KEY]
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  return {
    configured: missing.length === 0 && tokenEncryptionConfigured(),
    missing
  };
}

export function xRedirectUri(request: NextRequest) {
  return (
    process.env.X_REDIRECT_URI || `${appOrigin(request)}/api/x/callback`
  );
}

export function xOAuthUrl({
  codeVerifier,
  redirectUri,
  state
}: {
  codeVerifier: string;
  redirectUri: string;
  state: string;
}) {
  const clientId = process.env.X_CLIENT_ID;

  if (!clientId) {
    throw new Error("X_CLIENT_ID is required.");
  }

  const url = new URL(xAuthorizeUrl);

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", REQUIRED_X_SCOPES.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", sha256Base64Url(codeVerifier));
  url.searchParams.set("code_challenge_method", "S256");

  return url;
}

export function createPkceVerifier() {
  return randomToken(64);
}

export async function exchangeXCodeForToken({
  code,
  codeVerifier,
  redirectUri
}: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}) {
  const body = new URLSearchParams({
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri
  });

  return requestXToken(body);
}

export async function refreshXAccountAccess(account: XAccount) {
  const { refreshToken } = decryptedXTokens(account);
  const token = await requestXToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken
    })
  );

  const updated = await updateXAccountTokens({
    accessToken: requiredToken(token.access_token, "X access token missing."),
    accountId: account.id,
    refreshToken: token.refresh_token,
    scopes: parseScopes(token.scope) || account.scopes,
    tokenExpiry: expiryFrom(token.expires_in)
  });

  return {
    account: updated,
    accessToken: requiredToken(token.access_token, "X access token missing.")
  };
}

export async function getValidXAccessToken(account: XAccount) {
  const expiry = new Date(account.tokenExpiry).getTime();

  if (Number.isFinite(expiry) && expiry - Date.now() > 90_000) {
    return {
      account,
      accessToken: decryptedXTokens(account).accessToken
    };
  }

  return refreshXAccountAccess(account);
}

export async function fetchXMe(accessToken: string) {
  const response = await fetch(
    `${xApiBase}/2/users/me?user.fields=username,name`,
    {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );
  const data = (await response.json()) as XMeResponse;

  if (!response.ok || !data.data) {
    throw new XApiError(
      xErrorMessage(data, "Could not read X profile."),
      response.status
    );
  }

  return data.data;
}

export async function publishXPost({
  account,
  text,
  userId
}: {
  account: XAccount;
  text: string;
  userId: string;
}) {
  const missingScopes = missingRequiredXScopes(account.scopes);

  if (missingScopes.length > 0) {
    throw new XApiError(
      `X did not grant ${missingScopes.join(
        ", "
      )}. Enable Read and write permissions in the X Developer Portal, save, then reconnect X.`,
      403
    );
  }

  if (!text.trim()) {
    throw new XApiError("Post text is required.", 400);
  }

  if (text.length > 280) {
    throw new XApiError("X posts must be 280 characters or fewer.", 400);
  }

  const { accessToken, account: refreshedAccount } =
    await getValidXAccessToken(account);
  const response = await fetch(`${xApiBase}/2/tweets`, {
    body: JSON.stringify({ text }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  const data = await readXJson<CreatePostResponse>(response);

  if (!response.ok || !data.data) {
    if (response.status === 401 || response.status === 403) {
      await markXAccountRevoked(
        userId,
        "X access was rejected. Reconnect X and confirm write permissions."
      );
    }

    throw new XApiError(
      xErrorMessage(
        data,
        `${publishErrorFor(response.status)} X API returned ${response.status}.`
      ),
      response.status
    );
  }

  return {
    id: data.data.id,
    text: data.data.text,
    url: `https://x.com/${refreshedAccount.username}/status/${data.data.id}`
  };
}

export function parseScopes(scope?: string) {
  if (!scope) {
    return null;
  }

  return scope.split(/\s+/).filter(Boolean);
}

export function missingRequiredXScopes(scopes: string[]) {
  return REQUIRED_X_SCOPES.filter((scope) => !scopes.includes(scope));
}

export function expiryFrom(expiresIn?: number) {
  const seconds = typeof expiresIn === "number" ? expiresIn : 7200;

  return new Date(Date.now() + seconds * 1000).toISOString();
}

async function requestXToken(body: URLSearchParams) {
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new XApiError("X OAuth is not configured.", 500);
  }

  const response = await fetch(`${xApiBase}/2/oauth2/token`, {
    body,
    cache: "no-store",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString(
        "base64"
      )}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    method: "POST"
  });
  const token = await readXJson<XTokenResponse>(response);

  if (!response.ok) {
    throw new XApiError(
      token.error_description || token.error || "X OAuth token request failed.",
      response.status
    );
  }

  return token;
}

function requiredToken(value: string | undefined, message: string) {
  if (!value) {
    throw new XApiError(message, 502);
  }

  return value;
}

function xErrorMessage(
  body: CreatePostResponse | XMeResponse,
  fallback: string
) {
  return (
    body.detail ||
    body.title ||
    body.errors
    ?.map((error) => error.detail || error.title)
    .filter(Boolean)
    .join(" ")
      .trim() ||
    fallback
  );
}

async function readXJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}

function publishErrorFor(status: number) {
  if (status === 401 || status === 403) {
    return "X rejected publishing. Reconnect X and confirm write permissions.";
  }

  if (status === 429) {
    return "X rate limit reached. Try again later.";
  }

  return "X publishing failed.";
}
