import { NextResponse, type NextRequest } from "next/server";
import {
  analyticsFriendlyError,
  analyticsRequiresReconnect,
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
    const reconnect = analyticsRequiresReconnect(error);
    const message = analyticsFriendlyError(error);

    return NextResponse.json({
      configured: true,
      connected: !reconnect,
      error: message,
      properties: [],
      propertiesError: reconnect ? undefined : message
    });
  }
}
