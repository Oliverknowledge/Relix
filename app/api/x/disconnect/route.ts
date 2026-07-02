import { NextResponse, type NextRequest } from "next/server";
import { getUserId } from "@/app/lib/session";
import { clearXAccountCookie } from "@/app/lib/x-account-cookie";
import { disconnectXAccount } from "@/app/lib/x-store";

export async function POST(request: NextRequest) {
  const userId = getUserId(request);

  if (userId) {
    await disconnectXAccount(userId);
  }

  const response = NextResponse.json({ ok: true });

  clearXAccountCookie(response);
  response.cookies.delete("relix_x_state");
  response.cookies.delete("relix_x_code_verifier");

  return response;
}
