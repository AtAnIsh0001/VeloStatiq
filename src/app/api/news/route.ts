import { NextRequest, NextResponse } from "next/server";
import { getSportsNews, type NewsSport } from "../../../lib/sportsNews";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("sport");
  const sport: NewsSport = requested === "formula-one" ? "formula-one" : "football";
  return NextResponse.json(await getSportsNews(sport), { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" } });
}
