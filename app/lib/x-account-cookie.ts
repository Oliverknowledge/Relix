import type { NextRequest, NextResponse } from "next/server";
import { secureCookie } from "@/app/lib/oauth";
import type { XAccount } from "@/app/lib/x-types";

const accountCookiePrefix = "relix_x_account";
const accountCookieCount = "relix_x_account_chunks";
const maxChunks = 12;
const chunkSize = 3000;

export function getXAccountCookie(request: NextRequest, userId: string) {
  const count = Number(request.cookies.get(accountCookieCount)?.value || 0);

  if (!Number.isInteger(count) || count <= 0 || count > maxChunks) {
    return null;
  }

  const encoded = Array.from({ length: count }, (_, index) =>
    request.cookies.get(`${accountCookiePrefix}_${index}`)?.value || ""
  ).join("");

  if (!encoded) {
    return null;
  }

  try {
    const account = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as XAccount;

    if (account.userId !== userId || account.revokedAt) {
      return null;
    }

    return account;
  } catch {
    return null;
  }
}

export function setXAccountCookie(response: NextResponse, account: XAccount) {
  const encoded = Buffer.from(JSON.stringify(account), "utf8").toString(
    "base64url"
  );
  const chunks = encoded.match(new RegExp(`.{1,${chunkSize}}`, "g")) || [];

  if (chunks.length > maxChunks) {
    throw new Error("X account cookie is too large.");
  }

  clearXAccountCookie(response);
  response.cookies.set(accountCookieCount, String(chunks.length), cookieOptions());
  chunks.forEach((chunk, index) => {
    response.cookies.set(
      `${accountCookiePrefix}_${index}`,
      chunk,
      cookieOptions()
    );
  });
}

export function clearXAccountCookie(response: NextResponse) {
  response.cookies.set(accountCookieCount, "", expiredCookieOptions());

  for (let index = 0; index < maxChunks; index += 1) {
    response.cookies.set(
      `${accountCookiePrefix}_${index}`,
      "",
      expiredCookieOptions()
    );
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax" as const,
    secure: secureCookie()
  };
}

function expiredCookieOptions() {
  return {
    ...cookieOptions(),
    maxAge: 0
  };
}
