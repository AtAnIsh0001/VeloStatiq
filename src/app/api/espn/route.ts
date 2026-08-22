import { NextRequest, NextResponse } from "next/server";
import { fetchEspnFantasy, type EspnAction } from "../../../lib/espnFantasy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const action = (request.nextUrl.searchParams.get("action") || "league") as EspnAction;
  const validActions: EspnAction[] = ["league", "teams", "boxscores", "freeAgents", "draft"];
  if (!validActions.includes(action)) return NextResponse.json({ message: "Invalid ESPN action" }, { status: 400 });
  return NextResponse.json(await fetchEspnFantasy({
    action,
    leagueId: Number(request.nextUrl.searchParams.get("leagueId")) || undefined,
    seasonId: Number(request.nextUrl.searchParams.get("seasonId")) || undefined,
    week: Number(request.nextUrl.searchParams.get("week")) || undefined,
  }));
}
