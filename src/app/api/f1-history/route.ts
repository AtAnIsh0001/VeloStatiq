import { NextRequest, NextResponse } from "next/server";
import { getF1DriverComparison } from "../../../lib/f1DriverHistory";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const primary = request.nextUrl.searchParams.get("primary") || "";
  const rival = request.nextUrl.searchParams.get("rival") || "";
  const valid = (value: string) => /^[a-z0-9_-]{1,50}$/i.test(value);
  if (!valid(primary) || !valid(rival) || primary === rival) return NextResponse.json({ error: "Choose two different valid drivers." }, { status: 400 });
  try {
    return NextResponse.json(await getF1DriverComparison(primary, rival), { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" } });
  } catch {
    return NextResponse.json({ error: "Driver race history is temporarily unavailable." }, { status: 503 });
  }
}
