import { NextRequest, NextResponse } from "next/server";
import { getF1Intelligence } from "../../../lib/f1Intelligence";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const driver = (request.nextUrl.searchParams.get("driver") || "VER").replace(/[^A-Z]/gi, "").slice(0, 4).toUpperCase();
  return NextResponse.json(await getF1Intelligence(driver), { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
