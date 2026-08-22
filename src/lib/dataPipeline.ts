import type { Athlete, Metric, SportMode } from "./types";

type MessyRecord = Record<string, string | number | null | undefined>;

export function cleanText(value: unknown): string {
  return String(value ?? "").replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim();
}

export function formatName(value: unknown): string {
  return cleanText(value).toLocaleLowerCase().replace(/(^|[\s-])\p{L}/gu, (letter) => letter.toLocaleUpperCase());
}

export function finiteMetric(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : fallback;
}

export function backfillMetrics(metrics: Array<Partial<Metric>>): Metric[] {
  const valid = metrics.map((metric) => Number(metric.value)).filter(Number.isFinite);
  const average = valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 70;
  return metrics.map((metric, index) => ({ label: cleanText(metric.label) || `Metric ${index + 1}`, value: Math.round(finiteMetric(metric.value, average)) }));
}

export function normalizeAthlete(record: MessyRecord, sport: SportMode, metrics: Array<Partial<Metric>>): Athlete {
  const name = formatName(record.name ?? `${record.forename ?? ""} ${record.surname ?? ""}`);
  return {
    id: name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    name,
    shortName: name,
    sport,
    role: cleanText(record.position ?? (sport === "f1" ? "Formula 1 Driver" : "Player")),
    team: formatName(record.team) || "Independent",
    nationality: formatName(record.nationality ?? record.country) || "Unknown",
    number: cleanText(record.number) || "—",
    rating: Math.round(finiteMetric(record.rating ?? record.overall, 75)),
    status: "Data verified",
    metrics: backfillMetrics(metrics),
  };
}
