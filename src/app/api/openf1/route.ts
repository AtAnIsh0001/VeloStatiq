import { NextResponse } from "next/server";
import { getMonacoSnapshot } from "../../../lib/openF1";

export const revalidate = 900;

export async function GET() {
  return NextResponse.json(await getMonacoSnapshot(), { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" } });
}
