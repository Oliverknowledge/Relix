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
    const requestedProperty = request.nextUrl.searchParams.get("propertyId");
    let propertyId = requestedProperty || "";
    let propertyName: string | undefined;

    try {
      const properties = await listGoogleAnalyticsProperties(accessToken);
      const property =
        properties.find((candidate) => candidate.propertyId === requestedProperty) ||
        properties[0];

      propertyId = propertyId || property?.propertyId || "";
      propertyName = property?.displayName;
    } catch (error) {
      if (!propertyId) {
        const response = NextResponse.json({
          metrics: analyticsUnavailable(
            error instanceof Error
              ? error.message
              : "Analytics properties could not be read."
          )
        });

        setGoogleAnalyticsAccountCookie(response, currentAccount);

        return response;
      }
    }

    if (!propertyId) {
      const response = NextResponse.json({
        metrics: analyticsUnavailable("No Analytics properties found.")
      });

      setGoogleAnalyticsAccountCookie(response, currentAccount);

      return response;
    }

    const metrics = await fetchGoogleAnalyticsMetrics({
      accessToken,
      propertyId,
      propertyName
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
