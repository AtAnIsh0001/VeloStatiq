import CinematicFootballDashboard, {
  type Champions,
  type Fixture,
} from "../../components/CinematicFootballDashboard";
import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const metadata: Metadata = {
  title: "Football Intelligence · VeloStatiq",
  description:
    "Football fixtures, sourced player profiles, Champions League details, and explainable match predictions.",
};

export default async function FootballPage() {
  let initialFixtures: Fixture[] = [],
    initialChampions: Champions | null = null;
  try {
    const cache = JSON.parse(
      await readFile(
        path.join(
          process.cwd(),
          "DataBase",
          "cache",
          "football",
          "upcoming.json",
        ),
        "utf8",
      ),
    ) as { fixtures?: Fixture[] };
    initialFixtures = (cache.fixtures || []).slice(0, 12);
  } catch {
    /* The dashboard falls back to its live endpoint. */
  }
  try {
    initialChampions = JSON.parse(
      await readFile(
        path.join(
          process.cwd(),
          "DataBase",
          "sources",
          "champions-league-2026-27.json",
        ),
        "utf8",
      ),
    ) as Champions;
  } catch {
    /* The dashboard falls back to its live endpoint. */
  }
  return (
    <CinematicFootballDashboard
      initialFixtures={initialFixtures}
      initialChampions={initialChampions}
    />
  );
}
