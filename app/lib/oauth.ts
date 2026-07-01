import { randomBytes, createHash } from "crypto";
import type { NextRequest } from "next/server";

export function appOrigin(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function sha256Base64Url(value: string) {
  return createHash("sha256").update(value).digest("base64url");
}

export function secureCookie() {
  return process.env.NODE_ENV === "production";
}
