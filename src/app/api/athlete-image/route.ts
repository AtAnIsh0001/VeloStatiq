import { NextRequest, NextResponse } from "next/server";
import { fetchAthleteImage } from "../../../lib/imageFetcher";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")?.slice(0, 80) || "Athlete";
  return NextResponse.json({ url: await fetchAthleteImage(name) }, { headers: { "Cache-Control": "public, s-maxage=900" } });
}
