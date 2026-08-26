import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "DataBase", "FormulaOne");
type Row = Record<string, string>;

export type F1Prediction = {
  engine: string; method: string; driver: string; race: string; predictedLapSeconds: number; predictedLap: string;
  fastestLapProbability: number; pitWindow: { start: number; end: number }; expectedStops: number; predictedPitDuration: number;
  tyrePlan: Array<{ compound: string; fromLap: number; length: number }>; confidence: number;
  scenario: { trackTemperature: number; rainProbability: number; fuelLoad: number; safetyCar: boolean };
  inputs: { driverSamples: number; pitSamples: number; consistency: number; historicalBest: number; circuitBenchmark: number; recentRaceSamples: number; recentAverageFinish: number; recentPointsPerRace: number; recentDnfRate: number; archiveFallback: boolean };
};

function parseLine(line: string) {
  const out: string[] = [];
  let value = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') { value += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { out.push(value); value = ""; }
    else value += char;
  }
  out.push(value);
  return out;
}

async function csv(name: string): Promise<Row[]> {
  const text = await fs.readFile(path.join(root, name), "utf8");
  const [header, ...lines] = text.split(/\r?\n/).filter(Boolean);
  const keys = parseLine(header);
  return lines.map((line) => Object.fromEntries(parseLine(line).map((value, index) => [keys[index], value])));
}

let cache: Promise<{ summaries: Row[]; pits: Row[]; pitStops: Row[]; compounds: Row[]; stints: Row[]; identities: Row[] }> | null = null;
function data() {
  return (cache ||= Promise.all([
    csv("driver_race_summary.csv"), csv("pit_strategy.csv"), csv("pit_stops.csv"),
    csv("compound_performance.csv"), csv("stint_analysis.csv"), csv("drivers.csv"),
  ]).then(([summaries, pits, pitStops, compounds, stints, identities]) => ({ summaries, pits, pitStops, compounds, stints, identities })));
}

function toNumber(value: string | undefined, fallback = 0): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function median(values: number[], fallback: number): number {
  if (values.length === 0) return fallback;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function average(values: number[], fallback: number): number {
  return values.length === 0 ? fallback : values.reduce((sum, value) => sum + value, 0) / values.length;
}
function squish(score: number): number {
  return 1 / (1 + Math.exp(-Math.min(60, Math.max(-60, score))));
}
function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}
function mostCommon(values: string[], fallback: string): string {
  const clean = values.filter(Boolean);
  if (clean.length === 0) return fallback;
  const counts = new Map<string, number>();
  for (const value of clean) counts.set(value, (counts.get(value) || 0) + 1);
  let best = clean[0], bestCount = 0;
  for (const [value, count] of counts) if (count > bestCount) { best = value; bestCount = count; }
  return best;
}
function niceLapTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  let text = (seconds % 60).toFixed(3);
  while (text.length < 6) text = "0" + text;
  return `${minutes}:${text}`;
}

const NORMAL_STINT_LENGTH: Record<string, number> = { SOFT: 16, MEDIUM: 23, HARD: 31, INTERMEDIATE: 18, WET: 16 };

export async function predictF1Race(options: { driver: string; race?: string; trackTemperature?: number; rainProbability?: number; fuelLoad?: number; safetyCar?: boolean; recentRaceSamples?: number; recentAverageFinish?: number; recentPointsPerRace?: number; recentDnfRate?: number }): Promise<F1Prediction> {
  const { summaries, pits, pitStops, compounds, stints, identities } = await data();

  const driver = options.driver.toUpperCase().trim();
  const race = options.race || "";
  const trackTemp = options.trackTemperature ?? 32;
  const rain = options.rainProbability ?? 0;
  const fuel = options.fuelLoad ?? 45;
  const safetyCar = Boolean(options.safetyCar);
  const recentRaces = options.recentRaceSamples ?? 0;
  const recentFinish = options.recentAverageFinish ?? 0;
  const recentPoints = options.recentPointsPerRace ?? 0;
  const recentDnfRate = options.recentDnfRate ?? 0;

  const driverRows = summaries.filter((row) => (row.Driver || "").toUpperCase() === driver);
  const hasDriverArchive = driverRows.length > 0;
  const sourceRows = hasDriverArchive ? driverRows : summaries;

  const availableRaces: string[] = [];
  for (const row of sourceRows) if (row.RaceName && !availableRaces.includes(row.RaceName)) availableRaces.push(row.RaceName);
  availableRaces.sort();

  const selectedRace = availableRaces.includes(race) ? race : mostCommon(sourceRows.map((row) => row.RaceName || ""), availableRaces[0] || "");

  const exactRows = driverRows.filter((row) => row.RaceName === selectedRace);
  const fieldRows = summaries.filter((row) => row.RaceName === selectedRace);
  const comparable = hasDriverArchive
    ? (exactRows.length > 0 ? exactRows : driverRows)
    : (fieldRows.length > 0 ? fieldRows : summaries);

  const team = mostCommon(comparable.map((row) => row.Team || ""), "Unknown");

  const bestLaps = comparable.map((row) => toNumber(row.best_lap_sec)).filter((value) => value > 45 && value < 180);
  const historicalBest = median(bestLaps, 90.0);

  const consistencyValues = comparable.map((row) => toNumber(row.pace_consistency)).filter((value) => value > 0);
  const consistency = average(consistencyValues, 5.0);

  const circuitLaps = compounds.filter((row) => row.RaceName === selectedRace).map((row) => toNumber(row.fastest_lap_sec)).filter((value) => value > 45 && value < 180);
  const circuitBenchmark = median(circuitLaps, historicalBest);

  const tempPenalty = Math.abs(trackTemp - 32.0) * 0.018;
  const rainPenalty = clamp(rain, 0, 100) * 0.032;
  const fuelPenalty = clamp(fuel, 0, 120) * 0.006;
  const consistencyPart = Math.min(consistency * 0.025, 1.2);

  const predictedSeconds = 0.68 * historicalBest + 0.32 * circuitBenchmark + consistencyPart + tempPenalty + rainPenalty + fuelPenalty;

  const fieldLaps = summaries.filter((row) => row.RaceName === selectedRace).map((row) => toNumber(row.best_lap_sec)).filter((value) => value > 0);
  const percentile = fieldLaps.length > 0 && hasDriverArchive
    ? fieldLaps.filter((value) => value >= historicalBest).length / fieldLaps.length
    : 0.5;

  const recentFinishScore = recentRaces ? clamp((21.0 - recentFinish) / 20.0, 0, 1) : 0.5;
  const recentPointsScore = recentRaces ? clamp(recentPoints / 25.0, 0, 1) : 0.5;
  const recentReliability = 1.0 - clamp(recentDnfRate, 0, 1);

  const fastestLapProbability = squish(-0.70 + 1.75 * percentile - 0.025 * consistency - 0.012 * rain + 0.45 * recentFinishScore + 0.35 * recentPointsScore + 0.25 * recentReliability);

  const matchingPits = pits.filter((row) => (row.Driver || "").toUpperCase() === driver && row.RaceName === selectedRace);
  const driverPits = matchingPits.length > 0 ? matchingPits : pits.filter((row) => (row.Driver || "").toUpperCase() === driver);

  const pitLaps = driverPits.map((row) => toNumber(row.LapNumber)).filter((value) => value > 0);
  const basePitLap = Math.round(median(pitLaps, 24.0));

  const pitShift = safetyCar ? -4 : (rain > 45 ? -3 : 0);
  const pitCenter = Math.max(1, basePitLap + pitShift);

  const stopsPerRace = new Map<string, number>();
  for (const row of driverPits) {
    const key = `${row.Season}-${row.RaceName}`;
    stopsPerRace.set(key, (stopsPerRace.get(key) || 0) + 1);
  }
  let expectedStops = Math.round(average([...stopsPerRace.values()], 1.6));
  if (expectedStops < 1) expectedStops = 1;
  if (rain > 55) expectedStops += 1;

  const identity = identities.find((row) => (row.code || "").toUpperCase() === driver);
  const driverId = identity?.driverId;

  const pitDurations = pitStops.filter((row) => row.driverId === driverId).map((row) => toNumber(row.duration)).filter((value) => value >= 15 && value <= 60);
  const predictedPitDuration = median(pitDurations, 24.2);

  const startCompound = rain > 55 ? "INTERMEDIATE" : mostCommon(driverPits.map((row) => row.Compound || ""), "MEDIUM");
  const compoundSequence = (rain > 55
    ? [startCompound, "INTERMEDIATE", "WET"]
    : [startCompound, ...["SOFT", "MEDIUM", "HARD"].filter((compound) => compound !== startCompound)]
  ).slice(0, expectedStops + 1);

  const tyrePlan: Array<{ compound: string; fromLap: number; length: number }> = [];
  let runningLap = 1;
  for (const compound of compoundSequence) {
    const stintRow = stints.find((row) => row.Team === team && row.Compound === compound);
    const fallbackLength = NORMAL_STINT_LENGTH[compound] ?? 22;
    let length = stintRow ? Math.round(toNumber(stintRow.typical_stint_length, fallbackLength)) : fallbackLength;
    if (length < 5) length = 5;
    tyrePlan.push({ compound, fromLap: runningLap, length });
    runningLap = tyrePlan.length === 1 ? pitCenter : runningLap + length;
  }

  const archiveStrength = hasDriverArchive ? Math.min(comparable.length * 0.13, 2.0) : -0.35;
  const pitDataBonus = Math.min(driverPits.length * 0.025, 1.0);
  const recentFormBonus = Math.min(recentRaces * 0.12, 0.6);
  const confidence = squish(-1.10 + archiveStrength + pitDataBonus - consistency * 0.018 + recentFormBonus - recentDnfRate * 0.25);

  return {
    engine: "TypeScript (Node.js runtime)",
    method: "linear weighted estimates + sigmoid calibration",
    driver, race: selectedRace,
    predictedLapSeconds: predictedSeconds, predictedLap: niceLapTime(predictedSeconds),
    fastestLapProbability,
    pitWindow: { start: Math.max(1, pitCenter - 2), end: pitCenter + 3 },
    expectedStops, predictedPitDuration, tyrePlan, confidence,
    scenario: { trackTemperature: trackTemp, rainProbability: rain, fuelLoad: fuel, safetyCar },
    inputs: {
      driverSamples: hasDriverArchive ? comparable.length : 0,
      pitSamples: driverPits.length, consistency, historicalBest, circuitBenchmark,
      recentRaceSamples: recentRaces, recentAverageFinish: recentFinish, recentPointsPerRace: recentPoints, recentDnfRate,
      archiveFallback: !hasDriverArchive,
    },
  };
}
