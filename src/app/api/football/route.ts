import { NextRequest, NextResponse } from "next/server";
import {
  getChampionsLeagueInfo,
  getFootballFixtureAnalysis,
  getUpcomingFixtures,
  MAJOR_FOOTBALL_LEAGUES,
  searchFootballPlayers,
  type FootballFixture,
} from "../../../lib/footballData";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") || "fixtures";
  if (type === "search") {
    const query = request.nextUrl.searchParams.get("q") || "";
    return NextResponse.json(await searchFootballPlayers(query));
  }
  if (type === "champions")
    return NextResponse.json(await getChampionsLeagueInfo(), {
      headers: { "Cache-Control": "public, s-maxage=900" },
    });
  if (type === "analysis") {
    const leagueSlug = request.nextUrl.searchParams.get("league") || "";
    const fixtureId = request.nextUrl.searchParams.get("fixtureId") || "";
    const date = request.nextUrl.searchParams.get("date") || "";
    const homeId = request.nextUrl.searchParams.get("homeId") || "";
    const awayId = request.nextUrl.searchParams.get("awayId") || "";
    const validId = (value: string) => /^[a-z0-9_-]{1,40}$/i.test(value);
    if (
      !/^[a-z0-9._]{2,30}$/i.test(leagueSlug) ||
      !validId(fixtureId) ||
      !validId(homeId) ||
      !validId(awayId) ||
      !Number.isFinite(new Date(date).getTime())
    ) {
      return NextResponse.json(
        { error: "Invalid fixture analysis request" },
        { status: 400 },
      );
    }
    const team = (side: "home" | "away") => ({
      id: side === "home" ? homeId : awayId,
      name:
        request.nextUrl.searchParams.get(`${side}Name`)?.slice(0, 100) ||
        "Unknown team",
      shortName:
        request.nextUrl.searchParams.get(`${side}Short`)?.slice(0, 60) ||
        "Unknown",
      abbreviation:
        request.nextUrl.searchParams.get(`${side}Abbr`)?.slice(0, 8) || "—",
      logo:
        request.nextUrl.searchParams.get(`${side}Logo`)?.slice(0, 500) || "",
      color: "17213a",
      form: "",
      strength:
        Number(request.nextUrl.searchParams.get(`${side}Strength`)) || 0.75,
    });
    const fixture: FootballFixture = {
      id: fixtureId,
      league: leagueSlug,
      leagueSlug,
      date,
      state: "pre",
      status: "Scheduled",
      venue: "",
      home: team("home"),
      away: team("away"),
      source: "client fixture selection",
    };
    try {
      return NextResponse.json(await getFootballFixtureAnalysis(fixture), {
        headers: {
          "Cache-Control":
            "public, s-maxage=900, stale-while-revalidate=1800",
        },
      });
    } catch {
      return NextResponse.json(
        { error: "Match history is temporarily unavailable for this fixture." },
        { status: 503 },
      );
    }
  }
  const days = Math.min(
    45,
    Math.max(1, Number(request.nextUrl.searchParams.get("days")) || 14),
  );
  const leagues = (
    request.nextUrl.searchParams.get("leagues") ||
    MAJOR_FOOTBALL_LEAGUES.join(",")
  )
    .split(",")
    .filter((league) => /^[a-z0-9._]+$/i.test(league));
  const payload = await getUpcomingFixtures(days, leagues);
  const limit = Math.min(
    250,
    Math.max(0, Number(request.nextUrl.searchParams.get("limit")) || 0),
  );
  return NextResponse.json(
    limit
      ? { ...payload, fixtures: payload.fixtures.slice(0, limit) }
      : payload,
    {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
      },
    },
  );
}
