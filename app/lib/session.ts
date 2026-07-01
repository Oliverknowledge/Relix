import type { NextRequest, NextResponse } from "next/server";
import { randomToken, secureCookie } from "@/app/lib/oauth";

export const relixUserCookieName = "relix_user_id";

export function getUserId(request: NextRequest) {
  return request.cookies.get(relixUserCookieName)?.value || null;
}

export function createUserId() {
  return `user_${randomToken(18)}`;
}

export function requireUserId(request: NextRequest) {
  const userId = getUserId(request);

  if (!userId) {
    throw new Error("Relix session missing. Connect X again.");
  }

  return userId;
}

export function setUserCookie(response: NextResponse, userId: string) {
  response.cookies.set(relixUserCookieName, userId, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: secureCookie()
  });
}
