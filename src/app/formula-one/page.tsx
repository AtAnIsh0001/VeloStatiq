import FormulaOneDashboard, {
  type RaceData,
} from "../../components/FormulaOneDashboard";
import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const metadata: Metadata = {
  title: "Formula One Intelligence · VeloStatiq",
  description:
    "Formula One drivers, race strategy, tyre models, pit-stop and fastest-lap predictions.",
};

export default async function FormulaOnePage() {
  let initialRace: RaceData | null = null;
  try {
    initialRace = JSON.parse(
      await readFile(
        path.join(
          process.cwd(),
          "DataBase",
          "cache",
          "formula-one",
          "last-race.json",
        ),
        "utf8",
      ),
    ) as RaceData;
  } catch {
    /* The dashboard falls back to its live endpoint. */
  }
  return <FormulaOneDashboard initialRace={initialRace} />;
}
