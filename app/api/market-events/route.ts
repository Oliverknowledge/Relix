import { NextResponse, type NextRequest } from "next/server";
import {
  appendMarketEvents,
  listMarketEvents,
  sanitizeMarketEvent
} from "@/app/lib/market-event-store";

export async function GET(request: NextRequest) {
  const campaignId = request.nextUrl.searchParams.get("campaignId") || undefined;
  const events = await listMarketEvents(campaignId);

  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { events?: unknown };
    const incoming = Array.isArray(body.events) ? body.events : [];
    const events = incoming
      .map(sanitizeMarketEvent)
      .filter((event): event is NonNullable<typeof event> => event !== null);

    if (events.length === 0) {
      return NextResponse.json(
        { error: "No valid market events provided." },
        { status: 400 }
      );
    }

    const saved = await appendMarketEvents(events);

    return NextResponse.json({ saved });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not save market events."
      },
      { status: 500 }
    );
  }
}
