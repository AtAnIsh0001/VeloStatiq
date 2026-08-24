import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

const BASE = "https://api.jolpi.ca/ergast/f1";
const headers = { "User-Agent": "VeloStatiqSports/0.2" };

type RawDriver = { driverId: string; permanentNumber?: string; code?: string; givenName: string; familyName: string; nationality: string };
type RawConstructor = { constructorId: string; name: string };
type RawResult = {
  number?: string; position: string; positionText?: string; points: string; grid: string; laps: string; status: string;
  Driver: RawDriver; Constructor: RawConstructor; Time?: { time?: string };
  FastestLap?: { rank: string; lap: string; Time?: { time?: string }; AverageSpeed?: { speed?: string; units?: string } };
};
type RawRace = {
  season: string; round: string; raceName: string; date: string; time?: string;
  Circuit: { circuitId: string; circuitName: string; Location: { locality: string; country: string } };
  Results?: RawResult[];
};

export type F1RaceHistoryRecord = {
  id: string; season: number; round: number; raceName: string; date: string; circuit: string; location: string;
  driverId: string; driverCode: string; driverName: string; driverNumber: string; nationality: string;
  team: string; position: number; grid: number; positionsGained: number; points: number; laps: number; status: string;
  raceTime: string; fastestLap: string | null; fastestLapRank: number | null; fastestLapNumber: number | null; averageSpeed: number | null;
  pitStops?: Array<{ lap: number; stop: number; time: string; duration: number }>;
  tyreStints?: Array<{ stint: number; compound: string; lapStart: number; lapEnd: number; tyreAgeAtStart: number }>;
};
export type F1HistoryMetrics = {
  races: number; wins: number; podiums: number; points: number; finishes: number; dnfs: number;
  averageFinish: number; averageGrid: number; averagePositionsGained: number; bestFinish: number;
  fastestLaps: number; topTenFinishes: number;
};
export type F1DriverHistory = { driver: { id: string; code: string; name: string; number: string; nationality: string; team: string }; races: F1RaceHistoryRecord[]; metrics: F1HistoryMetrics };
export type F1NextRace = { name: string; round: number; date: string; circuitId: string; circuit: string; locality: string; country: string };
export type F1DriverComparison = { fetchedAt: string; source: string; nextRace: F1NextRace | null; primary: F1DriverHistory & { lastAtUpcomingCircuit: F1RaceHistoryRecord | null }; rival: F1DriverHistory & { lastAtUpcomingCircuit: F1RaceHistoryRecord | null }; dataCoverage: { primaryRaces: number; rivalRaces: number; primaryCircuitRace: boolean; rivalCircuitRace: boolean; complete: boolean } };

export async function getNextF1Race(): Promise<F1NextRace | null> {
  try {
    const response = await fetch(`${BASE}/current/next/races/`, { headers, next: { revalidate: 900 }, signal: AbortSignal.timeout(9000) });
    if (!response.ok) return null;
    const body = await response.json() as { MRData?: { RaceTable?: { Races?: RawRace[] } } };
    const race = body.MRData?.RaceTable?.Races?.[0];
    return race ? { name: race.raceName, round: Number(race.round), date: `${race.date}T${race.time || "00:00:00Z"}`, circuitId: race.Circuit.circuitId, circuit: race.Circuit.circuitName, locality: race.Circuit.Location.locality, country: race.Circuit.Location.country } : null;
  } catch { return null; }
}

async function racesForSeason(driverId: string, season: number): Promise<RawRace[]> {
  const response = await fetch(`${BASE}/${season}/drivers/${driverId}/results/?limit=100`, { headers, next: { revalidate: 900 }, signal: AbortSignal.timeout(9000) });
  if (!response.ok) throw new Error(`Jolpica returned ${response.status}`);
  const body = await response.json() as { MRData?: { RaceTable?: { Races?: RawRace[] } } };
  return body.MRData?.RaceTable?.Races || [];
}

async function lastRaceAtCircuit(driverId: string, circuitId: string, before: string): Promise<F1RaceHistoryRecord | null> {
  try {
    const response = await fetch(`${BASE}/circuits/${circuitId}/drivers/${driverId}/results/?limit=100`, { headers, next: { revalidate: 900 }, signal: AbortSignal.timeout(9000) });
    if (!response.ok) return null;
    const body = await response.json() as { MRData?: { RaceTable?: { Races?: RawRace[] } } };
    return (body.MRData?.RaceTable?.Races || []).map((race) => normalize(race, driverId)).filter((race): race is F1RaceHistoryRecord => Boolean(race) && new Date(race!.date).getTime() < new Date(before).getTime()).sort((a, b) => b.date.localeCompare(a.date))[0] || null;
  } catch { return null; }
}

async function recordedCircuitStrategy(record: F1RaceHistoryRecord, locality: string): Promise<F1RaceHistoryRecord> {
  const pitPromise = (async () => {
    try {
      const response = await fetch(`${BASE}/${record.season}/${record.round}/drivers/${record.driverId}/pitstops/?limit=100`, { headers, next: { revalidate: 900 }, signal: AbortSignal.timeout(9000) });
      if (!response.ok) return [];
      const body = await response.json() as { MRData?: { RaceTable?: { Races?: Array<{ PitStops?: Array<{ lap: string; stop: string; time: string; duration: string }> }> } } };
      return (body.MRData?.RaceTable?.Races?.[0]?.PitStops || []).map((stop) => ({ lap: Number(stop.lap), stop: Number(stop.stop), time: stop.time, duration: Number(stop.duration) }));
    } catch { return [] as Array<{ lap: number; stop: number; time: string; duration: number }>; }
  })();
  const stintsPromise = fetch(`https://api.openf1.org/v1/sessions?year=${record.season}&location=${encodeURIComponent(locality)}&session_name=Race`, { headers, next: { revalidate: 900 }, signal: AbortSignal.timeout(9000) })
    .then(async (response) => response.ok ? response.json() as Promise<Array<{ session_key: number }>> : [])
    .then(async (sessions) => {
      const sessionKey = sessions[0]?.session_key;
      if (!sessionKey || !/^\d+$/.test(record.driverNumber)) return [];
      const response = await fetch(`https://api.openf1.org/v1/stints?session_key=${sessionKey}&driver_number=${record.driverNumber}`, { headers, next: { revalidate: 900 }, signal: AbortSignal.timeout(9000) });
      if (!response.ok) return [];
      const rows = await response.json() as Array<{ stint_number: number; compound: string; lap_start: number; lap_end: number; tyre_age_at_start: number }>;
      return rows.map((stint) => ({ stint: stint.stint_number, compound: stint.compound, lapStart: stint.lap_start, lapEnd: stint.lap_end, tyreAgeAtStart: stint.tyre_age_at_start }));
    }).catch(() => [] as Array<{ stint: number; compound: string; lapStart: number; lapEnd: number; tyreAgeAtStart: number }>);
  const [pitStops, tyreStints] = await Promise.all([pitPromise, stintsPromise]);
  return { ...record, pitStops, tyreStints };
}

function normalize(race: RawRace, driverId: string): F1RaceHistoryRecord | null {
  const result = race.Results?.find((entry) => entry.Driver.driverId === driverId) || race.Results?.[0];
  if (!result) return null;
  const position = Number(result.position);
  const grid = Number(result.grid);
  return {
    id: `${race.season}-${race.round}-${driverId}`, season: Number(race.season), round: Number(race.round), raceName: race.raceName,
    date: `${race.date}T${race.time || "00:00:00Z"}`, circuit: race.Circuit.circuitName,
    location: `${race.Circuit.Location.locality}, ${race.Circuit.Location.country}`,
    driverId: result.Driver.driverId, driverCode: result.Driver.code || result.Driver.driverId.slice(0, 3).toUpperCase(),
    driverName: `${result.Driver.givenName} ${result.Driver.familyName}`, driverNumber: result.number || result.Driver.permanentNumber || "—",
    nationality: result.Driver.nationality, team: result.Constructor.name, position, grid,
    positionsGained: grid > 0 ? grid - position : 0, points: Number(result.points), laps: Number(result.laps), status: result.status,
    raceTime: result.Time?.time || result.status, fastestLap: result.FastestLap?.Time?.time || null,
    fastestLapRank: result.FastestLap ? Number(result.FastestLap.rank) : null,
    fastestLapNumber: result.FastestLap ? Number(result.FastestLap.lap) : null,
    averageSpeed: result.FastestLap?.AverageSpeed?.speed ? Number(result.FastestLap.AverageSpeed.speed) : null,
  };
}

function calculateMetrics(races: F1RaceHistoryRecord[]): F1HistoryMetrics {
  const finishStatuses = new Set(["Finished"]);
  const isFinish = (race: F1RaceHistoryRecord) => finishStatuses.has(race.status) || /^\+\d+ Lap/.test(race.status);
  const finished = races.filter(isFinish).length;
  const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  return {
    races: races.length, wins: races.filter((race) => race.position === 1).length, podiums: races.filter((race) => race.position <= 3).length,
    points: races.reduce((sum, race) => sum + race.points, 0), finishes: finished, dnfs: races.length - finished,
    averageFinish: average(races.map((race) => race.position)), averageGrid: average(races.map((race) => race.grid || 20)),
    averagePositionsGained: average(races.map((race) => race.positionsGained)), bestFinish: races.length ? Math.min(...races.map((race) => race.position)) : 0,
    fastestLaps: races.filter((race) => race.fastestLapRank === 1).length, topTenFinishes: races.filter((race) => race.position <= 10).length,
  };
}

export async function getF1DriverHistory(driverId: string): Promise<F1DriverHistory> {
  const year = new Date().getUTCFullYear();
  const settled = await Promise.allSettled([racesForSeason(driverId, year), racesForSeason(driverId, year - 1)]);
  const returned = settled.flatMap((entry) => entry.status === "fulfilled" ? entry.value : []);
  if (!returned.length && settled.every((entry) => entry.status === "rejected")) throw new Error("Jolpica history is unavailable");
  const byId = new Map<string, F1RaceHistoryRecord>();
  for (const race of returned) { const record = normalize(race, driverId); if (record && new Date(record.date).getTime() < Date.now()) byId.set(record.id, record); }
  const races = [...byId.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const first = races[0];
  return {
    driver: { id: driverId, code: first?.driverCode || "—", name: first?.driverName || driverId, number: first?.driverNumber || "—", nationality: first?.nationality || "Unknown", team: first?.team || "Unknown" },
    races, metrics: calculateMetrics(races),
  };
}

export async function getF1DriverComparison(primaryId: string, rivalId: string): Promise<F1DriverComparison> {
  const cacheDirectory = path.join(process.cwd(), "DataBase", "cache", "formula-one", "comparisons");
  const cacheFile = path.join(cacheDirectory, `${primaryId}-${rivalId}.json`);
  try {
    const [primaryHistory, rivalHistory, nextRace] = await Promise.all([getF1DriverHistory(primaryId), getF1DriverHistory(rivalId), getNextF1Race()]);
    const [primaryCircuitBase, rivalCircuitRace] = nextRace ? await Promise.all([lastRaceAtCircuit(primaryId, nextRace.circuitId, nextRace.date), lastRaceAtCircuit(rivalId, nextRace.circuitId, nextRace.date)]) : [null, null];
    const primaryCircuitRace = primaryCircuitBase && nextRace ? await recordedCircuitStrategy(primaryCircuitBase, nextRace.locality) : null;
    const primary = { ...primaryHistory, lastAtUpcomingCircuit: primaryCircuitRace };
    const rival = { ...rivalHistory, lastAtUpcomingCircuit: rivalCircuitRace };
    const payload: F1DriverComparison = {
      fetchedAt: new Date().toISOString(), source: "Jolpica F1 · championship result archive", nextRace, primary, rival,
      dataCoverage: { primaryRaces: primary.races.length, rivalRaces: rival.races.length, primaryCircuitRace: Boolean(primaryCircuitRace), rivalCircuitRace: Boolean(rivalCircuitRace), complete: primary.races.length === 5 && rival.races.length === 5 && Boolean(primaryCircuitRace) && Boolean(rivalCircuitRace) },
    };
    try { await fs.mkdir(cacheDirectory, { recursive: true }); await fs.writeFile(cacheFile, JSON.stringify(payload)); } catch { /* Live response remains usable. */ }
    return payload;
  } catch (error) {
    try { return JSON.parse(await fs.readFile(cacheFile, "utf8")) as F1DriverComparison; } catch { throw error; }
  }
}
