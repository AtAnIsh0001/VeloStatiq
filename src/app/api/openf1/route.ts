import { NextResponse } from "next/server";
import { getMonacoSnapshot } from "../../../lib/openF1";

export const revalidate = 3600;

export async function GET() {
  return NextResponse.json(await getMonacoSnapshot(), { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
