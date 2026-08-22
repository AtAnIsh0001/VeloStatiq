import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Client } from "espn-fantasy-football-api/node";

export type EspnAction = "league" | "teams" | "boxscores" | "freeAgents" | "draft";

type EspnRequest = { action: EspnAction; leagueId?: number; seasonId?: number; week?: number };

function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function fetchEspnFantasy(request: EspnRequest) {
  const leagueId = request.leagueId || Number(process.env.ESPN_LEAGUE_ID);
  const seasonId = request.seasonId || Number(process.env.ESPN_SEASON_ID) || new Date().getFullYear();
  const week = request.week || 1;
  if (!Number.isFinite(leagueId) || leagueId <= 0) {
    return { connected: false, configured: false, source: "espn", message: "Enter a league ID or configure ESPN_LEAGUE_ID on the server.", leagueId: null, seasonId, data: [] };
  }

  const client = new Client({
    leagueId,
    ...(process.env.ESPN_S2 && process.env.ESPN_SWID ? { espnS2: process.env.ESPN_S2, SWID: process.env.ESPN_SWID } : {}),
  });

  try {
    let data: unknown;
    if (request.action === "teams") data = await client.getTeamsAtWeek({ seasonId, scoringPeriodId: week });
    else if (request.action === "boxscores") data = await client.getBoxscoreForWeek({ seasonId, matchupPeriodId: week, scoringPeriodId: week });
    else if (request.action === "freeAgents") data = await client.getFreeAgents({ seasonId, scoringPeriodId: week });
    else if (request.action === "draft") data = await client.getDraftInfo({ seasonId });
    else data = await client.getLeagueInfo({ seasonId });

    const payload = { connected: true, configured: true, source: "espn", action: request.action, leagueId, seasonId, week, fetchedAt: new Date().toISOString(), data: plain(data) };
    const cacheDirectory = path.join(process.cwd(), "DataBase", "cache", "espn");
    await fs.mkdir(cacheDirectory, { recursive: true });
    await fs.writeFile(path.join(cacheDirectory, `${leagueId}-${seasonId}-${request.action}.json`), JSON.stringify(payload));
    return payload;
  } catch (error) {
    const status = typeof error === "object" && error && "response" in error
      ? Number((error as { response?: { status?: number } }).response?.status) : undefined;
    return {
      connected: false, configured: true, source: "espn", leagueId, seasonId, week, data: [],
      message: status === 401 ? "ESPN rejected this league. Private leagues require ESPN_S2 and ESPN_SWID server cookies." : error instanceof Error ? error.message : "ESPN request failed.",
    };
  }
}
