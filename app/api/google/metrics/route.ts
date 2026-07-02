import { NextResponse, type NextRequest } from "next/server";
import {
  analyticsNotConnected,
  analyticsUnavailable,
  fetchGoogleAnalyticsMetrics,
  getGoogleAnalyticsAccount,
  getValidGoogleAnalyticsAccess,
  googleAnalyticsConfiguration,
  listGoogleAnalyticsProperties,
  setGoogleAnalyticsAccountCookie
} from "@/app/lib/google-analytics";

export async function GET(request: NextRequest) {
  const config = googleAnalyticsConfiguration();

  if (!config.configured) {
    return NextResponse.json({ metrics: analyticsNotConnected() });
  }

  const account = getGoogleAnalyticsAccount(request);

  if (!account) {
    return NextResponse.json({ metrics: analyticsNotConnected() });
  }

  try {
    const { accessToken, account: currentAccount } =
      await getValidGoogleAnalyticsAccess(account);
    const properties = await listGoogleAnalyticsProperties(accessToken);
    const requestedProperty = request.nextUrl.searchParams.get("propertyId");
    const property =
      properties.find((candidate) => candidate.propertyId === requestedProperty) ||
      properties[0];

    if (!property) {
      return NextResponse.json({
        metrics: analyticsUnavailable("No Analytics properties found.")
      });
    }

    const metrics = await fetchGoogleAnalyticsMetrics({
      accessToken,
      propertyId: property.propertyId,
      propertyName: property.displayName
    });
    const response = NextResponse.json({ metrics });

    setGoogleAnalyticsAccountCookie(response, currentAccount);

    return response;
  } catch (error) {
    return NextResponse.json({
      metrics: analyticsUnavailable(
        error instanceof Error ? error.message : "Analytics could not be read."
      )
    });
  }
}
