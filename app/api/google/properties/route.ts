import { NextResponse, type NextRequest } from "next/server";
import {
  getGoogleAnalyticsAccount,
  getValidGoogleAnalyticsAccess,
  googleAnalyticsConfiguration,
  listGoogleAnalyticsProperties,
  setGoogleAnalyticsAccountCookie
} from "@/app/lib/google-analytics";

export async function GET(request: NextRequest) {
  const config = googleAnalyticsConfiguration();

  if (!config.configured) {
    return NextResponse.json({
      configured: false,
      connected: false,
      missing: config.missing
    });
  }

  const account = getGoogleAnalyticsAccount(request);

  if (!account) {
    return NextResponse.json({ configured: true, connected: false });
  }

  try {
    const { accessToken, account: currentAccount } =
      await getValidGoogleAnalyticsAccess(account);
    const properties = await listGoogleAnalyticsProperties(accessToken);
    const response = NextResponse.json({
      configured: true,
      connected: true,
      properties
    });

    setGoogleAnalyticsAccountCookie(response, currentAccount);

    return response;
  } catch (error) {
    return NextResponse.json({
      configured: true,
      connected: false,
      error:
        error instanceof Error
          ? error.message
          : "Analytics connection unavailable."
    });
  }
}
