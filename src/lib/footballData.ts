import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getDatabase, searchDatabaseAthletes } from "./database";

const LIVE_SCORE_BASE = "https://worldcup26.ir/get/soccer";
const ESPN_SCORE_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const SPORTS_DB_BASE = "https://www.thesportsdb.com/api/v1/json/123";
export const MAJOR_FOOTBALL_LEAGUES = ["eng.1", "esp.1", "ger.1", "ita.1", "fra.1", "ned.1", "por.1", "uefa.champions", "uefa.champions_qual"] as const;

export type FootballTeam = { id: string; name: string; shortName: string; abbreviation: string; logo: string; color: string; form: string; strength?: number };
export type FootballFixture = {
  id: string; league: string; leagueSlug: string; date: string; state: string; status: string; venue: string;
  home: FootballTeam; away: FootballTeam; source: string;
};
export type FootballMatchRecord = {
  id: string; date: string; competition: string; venue: string; wasHome: boolean;
  team: FootballTeam; opponent: FootballTeam; teamScore: number; opponentScore: number;
  result: "W" | "D" | "L"; status: string; source: string;
};
export type FootballFormMetrics = {
  played: number; wins: number; draws: number; losses: number; points: number; pointsPerGame: number;
  goalsFor: number; goalsAgainst: number; goalDifference: number; averageGoalsFor: number;
  averageGoalsAgainst: number; cleanSheets: number; scoringMatches: number; formScore: number;
};
export type FootballTeamAnalysis = { team: FootballTeam; matches: FootballMatchRecord[]; metrics: FootballFormMetrics };
export type FootballFixtureAnalysis = {
  fixtureId: string; fetchedAt: string; source: string; cutoffDate: string;
  home: FootballTeamAnalysis; away: FootballTeamAnalysis;
  dataCoverage: { homeMatches: number; awayMatches: number; complete: boolean };
};
export type FootballPlayer = {
  id: string; name: string; team: string; nationality: string; position: string; image: string | null;
  birthDate?: string; birthPlace?: string; height?: string; weight?: string; shirtNumber?: string; description?: string; rating?: number; source: string; dataStatus: "current profile" | "historical archive";
  social?: { instagram?: string; twitter?: string; facebook?: string };
};

type ProviderEvent = {
  id: string; date: string; competitions?: Array<{
    venue?: { fullName?: string };
    status?: { type?: { state?: string; description?: string; detail?: string } };
    competitors?: Array<{ homeAway?: string; form?: string; team?: { id?: string; displayName?: string; shortDisplayName?: string; abbreviation?: string; logo?: string; color?: string } }>;
  }>;
};

type ScheduleCompetitor = {
  id?: string; homeAway?: string; winner?: boolean;
  score?: string | { value?: number; displayValue?: string };
  team?: { id?: string; displayName?: string; shortDisplayName?: string; abbreviation?: string; logo?: string; logos?: Array<{ href?: string }>; color?: string };
};
type ScheduleEvent = {
  id: string; date: string; name?: string;
  league?: { name?: string; slug?: string };
  season?: { slug?: string };
  competitions?: Array<{
    venue?: { fullName?: string }; competitors?: ScheduleCompetitor[];
    status?: { type?: { state?: string; completed?: boolean; description?: string; detail?: string } };
  }>;
};

function dateToken(date: Date) { return date.toISOString().slice(0, 10).replaceAll("-", ""); }
function teamKey(name: string) { return name.toLocaleLowerCase().replace(/\b(fc|cf|afc|club|deportivo)\b/g, "").replace(/[^a-z0-9]/g, ""); }

async function enrichTeamStrengths(fixtures: FootballFixture[]) {
  try {
    const database = await getDatabase();
    const ratings = new Map<string, number[]>();
    for (const player of database.athletes) {
      if (player.sport !== "football" || !player.team || !player.rating) continue;
      const key = teamKey(player.team); const values = ratings.get(key) || [];
      values.push(player.rating); ratings.set(key, values);
    }
    const score = (name: string) => {
      const values = (ratings.get(teamKey(name)) || []).sort((a, b) => b - a).slice(0, 18);
      return values.length ? Math.min(1, Math.max(0, values.reduce((sum, value) => sum + value, 0) / values.length / 100)) : .75;
    };
    return fixtures.map((fixture) => ({ ...fixture, home: { ...fixture.home, strength: score(fixture.home.name) }, away: { ...fixture.away, strength: score(fixture.away.name) } }));
  } catch { return fixtures; }
}

function normalizeEvent(event: ProviderEvent, league: string, leagueSlug: string, source: string): FootballFixture | null {
  const competition = event.competitions?.[0];
  const home = competition?.competitors?.find((team) => team.homeAway === "home");
  const away = competition?.competitors?.find((team) => team.homeAway === "away");
  if (!competition || !home?.team || !away?.team) return null;
  const normalizeTeam = (entry: NonNullable<typeof home>): FootballTeam => ({
    id: entry.team?.id || "", name: entry.team?.displayName || "Unknown", shortName: entry.team?.shortDisplayName || entry.team?.displayName || "Unknown",
    abbreviation: entry.team?.abbreviation || "—", logo: entry.team?.logo || "", color: entry.team?.color || "17213a", form: entry.form || "",
  });
  return {
    id: event.id, league, leagueSlug, date: event.date, state: competition.status?.type?.state || "pre",
    status: competition.status?.type?.description || competition.status?.type?.detail || "Scheduled",
    venue: competition.venue?.fullName || "Venue TBC", home: normalizeTeam(home), away: normalizeTeam(away), source,
  };
}

async function fetchLeagueFixtures(leagueSlug: string, from: string, to: string): Promise<FootballFixture[]> {
  try {
    const response = await fetch(`${LIVE_SCORE_BASE}/${leagueSlug}/fixtures?status=all&from=${from}&to=${to}&limit=100`, { next: { revalidate: 900 }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("Live score provider unavailable");
    const body = await response.json() as { league?: { name?: string }; events?: ProviderEvent[] };
    return (body.events || []).map((event) => normalizeEvent(event, body.league?.name || leagueSlug, leagueSlug, "livescoreFootball")).filter(Boolean) as FootballFixture[];
  } catch {
    try {
      const response = await fetch(`${ESPN_SCORE_BASE}/${leagueSlug}/scoreboard?dates=${from}-${to}&limit=100`, { next: { revalidate: 900 }, signal: AbortSignal.timeout(8000) });
      if (!response.ok) return [];
      const body = await response.json() as { leagues?: Array<{ name?: string }>; events?: ProviderEvent[] };
      return (body.events || []).map((event) => normalizeEvent(event, body.leagues?.[0]?.name || leagueSlug, leagueSlug, "ESPN fallback")).filter(Boolean) as FootballFixture[];
    } catch { return []; }
  }
}

export async function getUpcomingFixtures(days = 14, leagues: readonly string[] = MAJOR_FOOTBALL_LEAGUES): Promise<{ fixtures: FootballFixture[]; fetchedAt: string; source: string }> {
  const now = new Date();
  const end = new Date(now); end.setUTCDate(end.getUTCDate() + Math.min(45, Math.max(1, days)));
  const groups = await Promise.all(leagues.slice(0, 12).map((league) => fetchLeagueFixtures(league, dateToken(now), dateToken(end))));
  const fixtures = await enrichTeamStrengths(groups.flat().filter((fixture) => new Date(fixture.date).getTime() >= now.getTime() - 7_200_000).sort((a, b) => a.date.localeCompare(b.date)));
  const payload = { fixtures, fetchedAt: new Date().toISOString(), source: fixtures[0]?.source || "offline cache" };
  if (fixtures.length) {
    const cacheDirectory = path.join(process.cwd(), "DataBase", "cache", "football");
    try {
      await fs.mkdir(cacheDirectory, { recursive: true });
      await fs.writeFile(path.join(cacheDirectory, "upcoming.json"), JSON.stringify(payload));
    } catch { /* Read-only deployments can still return the live response. */ }
    return payload;
  }
  try { return JSON.parse(await fs.readFile(path.join(process.cwd(), "DataBase", "cache", "football", "upcoming.json"), "utf8")) as typeof payload; }
  catch { return payload; }
}

function scheduleScore(score: ScheduleCompetitor["score"]): number | null {
  if (typeof score === "string") { const value = Number(score); return Number.isFinite(value) ? value : null; }
  const value = score?.value ?? Number(score?.displayValue);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function scheduleTeam(entry: ScheduleCompetitor): FootballTeam {
  return {
    id: entry.team?.id || entry.id || "", name: entry.team?.displayName || "Unknown team",
    shortName: entry.team?.shortDisplayName || entry.team?.displayName || "Unknown",
    abbreviation: entry.team?.abbreviation || "—", logo: entry.team?.logo || entry.team?.logos?.[0]?.href || "",
    color: entry.team?.color || "17213a", form: "",
  };
}

function normalizeScheduleEvent(event: ScheduleEvent, teamId: string, league: string): FootballMatchRecord | null {
  const competition = event.competitions?.[0];
  if (!competition?.status?.type?.completed && competition?.status?.type?.state !== "post") return null;
  const own = competition.competitors?.find((entry) => (entry.team?.id || entry.id) === teamId);
  const opponent = competition.competitors?.find((entry) => (entry.team?.id || entry.id) !== teamId);
  const teamScore = own ? scheduleScore(own.score) : null;
  const opponentScore = opponent ? scheduleScore(opponent.score) : null;
  if (!own || !opponent || teamScore === null || opponentScore === null) return null;
  return {
    id: event.id, date: event.date, competition: event.league?.name || event.league?.slug || league, venue: competition.venue?.fullName || "Venue unavailable",
    wasHome: own.homeAway === "home", team: scheduleTeam(own), opponent: scheduleTeam(opponent), teamScore, opponentScore,
    result: teamScore > opponentScore ? "W" : teamScore < opponentScore ? "L" : "D",
    status: competition.status?.type?.description || competition.status?.type?.detail || "Full Time", source: "ESPN soccer",
  };
}

function metrics(matches: FootballMatchRecord[]): FootballFormMetrics {
  const wins = matches.filter((match) => match.result === "W").length;
  const draws = matches.filter((match) => match.result === "D").length;
  const losses = matches.filter((match) => match.result === "L").length;
  const points = wins * 3 + draws;
  const goalsFor = matches.reduce((sum, match) => sum + match.teamScore, 0);
  const goalsAgainst = matches.reduce((sum, match) => sum + match.opponentScore, 0);
  const played = matches.length;
  return {
    played, wins, draws, losses, points, pointsPerGame: played ? points / played : 0,
    goalsFor, goalsAgainst, goalDifference: goalsFor - goalsAgainst,
    averageGoalsFor: played ? goalsFor / played : 0, averageGoalsAgainst: played ? goalsAgainst / played : 0,
    cleanSheets: matches.filter((match) => match.opponentScore === 0).length,
    scoringMatches: matches.filter((match) => match.teamScore > 0).length,
    formScore: played ? points / (played * 3) : .5,
  };
}

async function fetchTeamHistory(team: FootballTeam, league: string, cutoffDate: string): Promise<FootballTeamAnalysis> {
  const cutoff = new Date(cutoffDate).getTime();
  const cutoffCalendarDate = new Date(cutoffDate);
  const currentSeason = cutoffCalendarDate.getUTCMonth() < 6 ? cutoffCalendarDate.getUTCFullYear() - 1 : cutoffCalendarDate.getUTCFullYear();
  const requests = [currentSeason, currentSeason - 1].map((season) => ({ leagueSlug: league, url: `${ESPN_SCORE_BASE}/all/teams/${team.id}/schedule?season=${season}` }));
  const bodies = await Promise.all(requests.map(async ({ leagueSlug, url }) => {
    try {
      const response = await fetch(url, { next: { revalidate: 900 }, signal: AbortSignal.timeout(9000) });
      if (!response.ok) return { leagueSlug, body: { events: [] as ScheduleEvent[] }, failed: true };
      return { leagueSlug, body: await response.json() as { events?: ScheduleEvent[] }, failed: false };
    } catch { return { leagueSlug, body: { events: [] as ScheduleEvent[] }, failed: true }; }
  }));
  if (bodies.every((entry) => entry.failed)) throw new Error("Football history provider unavailable");
  const byId = new Map<string, FootballMatchRecord>();
  for (const { body, leagueSlug } of bodies) for (const event of body.events || []) {
    const match = normalizeScheduleEvent(event, team.id, leagueSlug);
    if (match && new Date(match.date).getTime() < cutoff) byId.set(match.id, match);
  }
  const matches = [...byId.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  return { team, matches, metrics: metrics(matches) };
}

export async function getFootballFixtureAnalysis(fixture: FootballFixture): Promise<FootballFixtureAnalysis> {
  const cacheDirectory = path.join(process.cwd(), "DataBase", "cache", "football", "analysis");
  const safeFile = `${fixture.leagueSlug}-${fixture.home.id}-${fixture.away.id}.json`.replace(/[^a-z0-9._-]/gi, "-");
  const cachePath = path.join(cacheDirectory, safeFile);
  try {
    const [home, away] = await Promise.all([
      fetchTeamHistory(fixture.home, fixture.leagueSlug, fixture.date),
      fetchTeamHistory(fixture.away, fixture.leagueSlug, fixture.date),
    ]);
    const payload: FootballFixtureAnalysis = {
      fixtureId: fixture.id, fetchedAt: new Date().toISOString(), source: "ESPN soccer · completed team schedules",
      cutoffDate: fixture.date, home, away,
      dataCoverage: { homeMatches: home.matches.length, awayMatches: away.matches.length, complete: home.matches.length === 5 && away.matches.length === 5 },
    };
    try { await fs.mkdir(cacheDirectory, { recursive: true }); await fs.writeFile(cachePath, JSON.stringify(payload)); } catch { /* Live response remains usable. */ }
    return payload;
  } catch (error) {
    try { return JSON.parse(await fs.readFile(cachePath, "utf8")) as FootballFixtureAnalysis; }
    catch { throw error; }
  }
}

type SportsDbPlayer = { idPlayer?: string; strPlayer?: string; strTeam?: string; strNationality?: string; strPosition?: string; strThumb?: string; strCutout?: string; dateBorn?: string; strBirthLocation?: string; strHeight?: string; strWeight?: string; strNumber?: string; strDescriptionEN?: string; strInstagram?: string; strTwitter?: string; strFacebook?: string };

export async function searchFootballPlayers(query: string): Promise<{ players: FootballPlayer[]; sources: string[] }> {
  const cleanQuery = query.trim().slice(0, 80);
  if (cleanQuery.length < 2) return { players: [], sources: [] };
  const localPromise = searchDatabaseAthletes({ query: cleanQuery, sport: "football", limit: 30 });
  const onlinePromise = fetch(`${SPORTS_DB_BASE}/searchplayers.php?p=${encodeURIComponent(cleanQuery)}`, { next: { revalidate: 900 }, signal: AbortSignal.timeout(7000) })
    .then((response) => response.ok ? response.json() : { player: [] })
    .catch(() => ({ player: [] })) as Promise<{ player?: SportsDbPlayer[] | null }>;
  const [local, online] = await Promise.all([localPromise, onlinePromise]);
  const onlinePlayers: FootballPlayer[] = (online.player || []).filter((player) => player.strPlayer).map((player) => ({
    id: `web-${player.idPlayer}`, name: player.strPlayer!, team: player.strTeam || "Club unavailable", nationality: player.strNationality || "Unknown",
    position: player.strPosition || "Footballer", image: player.strThumb || player.strCutout || null, birthDate: player.dateBorn, birthPlace: player.strBirthLocation,
    height: player.strHeight, weight: player.strWeight, shirtNumber: player.strNumber, description: player.strDescriptionEN?.slice(0, 650),
    social: { instagram: player.strInstagram, twitter: player.strTwitter, facebook: player.strFacebook }, source: "TheSportsDB", dataStatus: "current profile",
  }));
  const byName = new Map<string, FootballPlayer>();
  for (const player of onlinePlayers) byName.set(player.name.toLocaleLowerCase(), player);
  for (const player of local) {
    const key = player.name.toLocaleLowerCase();
    if (!byName.has(key)) byName.set(key, { id: player.id, name: player.name, team: player.team || "Team unavailable", nationality: player.nationality, position: player.role, image: null, rating: player.rating, source: "Fifa.csv · local archive", dataStatus: "historical archive" });
  }
  return { players: [...byName.values()].slice(0, 40), sources: ["VeloStatiq local database", "TheSportsDB", "EasySoccerData adapter", "Premier-League-API compatibility"] };
}

export async function getChampionsLeagueInfo() {
  const sourcePath = path.join(process.cwd(), "DataBase", "sources", "champions-league-2026-27.json");
  return JSON.parse(await fs.readFile(sourcePath, "utf8")) as {
    competition: string; season: string; updatedAt: string; source: string; sourceUrl: string;
    format: { leaguePhaseTeams: number; automaticQualifiers: number; playoffQualifiers: number; leaguePhaseMatchesPerTeam: number };
    milestones: Array<{ label: string; date: string }>;
    upcoming: Array<{ id: string; date: string; publishedTime: string; home: string; away: string; path: string }>;
  };
}
