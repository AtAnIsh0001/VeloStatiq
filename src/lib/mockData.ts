import type { Athlete, TelemetryPoint, TimelineEvent } from "./types";

export const athletes: Athlete[] = [
  {
    id: "bruno-fernandes", name: "Bruno Fernandes", shortName: "B. Fernandes", sport: "football",
    role: "Attacking Midfielder", team: "Manchester United", nationality: "Portugal", number: "08", rating: 87, status: "Match fit",
    metrics: [{ label: "Pace", value: 73 }, { label: "Shooting", value: 86 }, { label: "Passing", value: 91 }, { label: "Fitness", value: 84 }, { label: "Tactical", value: 93 }],
  },
  {
    id: "erling-haaland", name: "Erling Haaland", shortName: "E. Haaland", sport: "football",
    role: "Centre Forward", team: "Manchester City", nationality: "Norway", number: "09", rating: 90, status: "Peak condition",
    metrics: [{ label: "Pace", value: 89 }, { label: "Shooting", value: 94 }, { label: "Passing", value: 68 }, { label: "Fitness", value: 91 }, { label: "Tactical", value: 88 }],
  },
  {
    id: "jude-bellingham", name: "Jude Bellingham", shortName: "J. Bellingham", sport: "football",
    role: "Central Midfielder", team: "Real Madrid", nationality: "England", number: "05", rating: 91, status: "Match fit",
    metrics: [{ label: "Pace", value: 84 }, { label: "Shooting", value: 86 }, { label: "Passing", value: 90 }, { label: "Fitness", value: 94 }, { label: "Tactical", value: 92 }],
  },
  {
    id: "max-verstappen", name: "Max Verstappen", shortName: "M. Verstappen", sport: "f1",
    role: "Formula 1 Driver", team: "Oracle Red Bull Racing", nationality: "Netherlands", number: "01", rating: 96, status: "On track",
    metrics: [{ label: "Pace", value: 98 }, { label: "Racecraft", value: 97 }, { label: "Qualifying", value: 95 }, { label: "Tyres", value: 91 }, { label: "Consistency", value: 96 }],
  },
  {
    id: "lewis-hamilton", name: "Lewis Hamilton", shortName: "L. Hamilton", sport: "f1",
    role: "Formula 1 Driver", team: "Scuderia Ferrari HP", nationality: "United Kingdom", number: "44", rating: 94, status: "On track",
    metrics: [{ label: "Pace", value: 94 }, { label: "Racecraft", value: 98 }, { label: "Qualifying", value: 93 }, { label: "Tyres", value: 96 }, { label: "Consistency", value: 95 }],
  },
  {
    id: "charles-leclerc", name: "Charles Leclerc", shortName: "C. Leclerc", sport: "f1",
    role: "Formula 1 Driver", team: "Scuderia Ferrari HP", nationality: "Monaco", number: "16", rating: 93, status: "On track",
    metrics: [{ label: "Pace", value: 96 }, { label: "Racecraft", value: 92 }, { label: "Qualifying", value: 98 }, { label: "Tyres", value: 89 }, { label: "Consistency", value: 93 }],
  },
];

export const footballEvents: TimelineEvent[] = [
  { id: "f1", time: "67:42", type: "attack", title: "HIGH PRESS", detail: "Bellingham wins possession in the final third", side: "away" },
  { id: "f2", time: "64:18", type: "card", title: "YELLOW CARD", detail: "Camavinga · late challenge", side: "away" },
  { id: "f3", time: "58:03", type: "goal", title: "GOAL · MUN 1–1 RMA", detail: "B. Fernandes · xG 0.21", side: "home" },
  { id: "f4", time: "41:29", type: "goal", title: "GOAL · MUN 0–1 RMA", detail: "J. Bellingham · assisted by Vini Jr.", side: "away" },
];

export const f1Events: TimelineEvent[] = [
  { id: "r1", time: "LAP 42", type: "sector", title: "PURPLE SECTOR", detail: "VER · Sector 2 · 35.204", side: "home" },
  { id: "r2", time: "LAP 40", type: "pit", title: "PIT STOP · HAM", detail: "Medium → Hard · 2.31s", side: "away" },
  { id: "r3", time: "LAP 37", type: "flag", title: "YELLOW · TURN 12", detail: "Track clear · green flag", side: "away" },
  { id: "r4", time: "LAP 35", type: "sector", title: "FASTEST LAP · LEC", detail: "1:14.287 · +0.084", side: "home" },
];

export const footballTrend = [
  { distance: 0, primary: 48, secondary: 38 }, { distance: 12, primary: 53, secondary: 35 },
  { distance: 24, primary: 45, secondary: 44 }, { distance: 38, primary: 41, secondary: 49 },
  { distance: 45, primary: 36, secondary: 55 }, { distance: 58, primary: 52, secondary: 39 },
  { distance: 68, primary: 57, secondary: 33 }, { distance: 78, primary: 62, secondary: 29 },
  { distance: 90, primary: 64, secondary: 27 },
];

export const f1Telemetry: TelemetryPoint[] = Array.from({ length: 24 }, (_, index) => {
  const distance = index * 145;
  const wave = Math.abs(Math.sin(index * 0.72));
  return { distance, primary: Math.round(118 + wave * 184), secondary: Math.round(92 - wave * 49), gear: Math.max(2, Math.round(2 + wave * 6)) };
});

export const f1Standings = [
  { pos: 1, code: "VER", team: "RBR", gap: "LEADER", compound: "M", color: "#4f8cff" },
  { pos: 2, code: "LEC", team: "FER", gap: "+1.284", compound: "H", color: "#ff334f" },
  { pos: 3, code: "HAM", team: "FER", gap: "+3.921", compound: "H", color: "#ff334f" },
];

export const monacoPath = "M118 247 C91 251 90 297 103 333 L113 343 L121 390 C124 405 108 401 112 414 C119 440 134 461 158 469 C171 474 159 486 120 485 C113 484 122 467 111 453 C93 428 75 371 73 316 C72 279 76 257 94 250 C124 242 158 239 198 226 C236 214 262 197 296 188 C339 176 368 148 358 119 C352 100 331 94 342 77 L397 5 C407 -4 414 8 410 23 C408 33 427 48 423 61 C421 69 442 77 444 67 C447 58 429 52 424 39 C416 18 432 11 456 5 C472 2 470 38 462 77 C452 126 421 169 375 194 C336 216 313 219 270 225 C244 228 240 242 219 241 Z";
