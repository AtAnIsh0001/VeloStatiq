import { NextRequest, NextResponse } from "next/server";
import { getDatabase, searchDatabaseAthletes } from "../../../lib/database";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const view = request.nextUrl.searchParams.get("view") || "catalog";
  if (view === "athletes") {
    const results = await searchDatabaseAthletes({
      query: request.nextUrl.searchParams.get("query") || "",
      sport: request.nextUrl.searchParams.get("sport") || "all",
      limit: Number(request.nextUrl.searchParams.get("limit")) || 30,
    });
    return NextResponse.json({ results, count: results.length });
  }
  const database = await getDatabase();
  return NextResponse.json({ generatedAt: database.generatedAt, records: database.records, collections: database.collections });
}
