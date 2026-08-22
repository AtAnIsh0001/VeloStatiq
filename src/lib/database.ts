import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

export type DatabaseAthlete = {
  id: string; sport: "football" | "f1"; name: string; nationality: string; role: string;
  team: string; number: string; rating: number; potential: number; source: string;
};

type DatabaseIndex = {
  generatedAt: string;
  version: number;
  records: number;
  collections: Array<{ id: string; label: string; path: string; records: number; files: number; bytes: number }>;
  athletes: DatabaseAthlete[];
};

let databaseCache: DatabaseIndex | null = null;

export async function getDatabase(): Promise<DatabaseIndex> {
  if (databaseCache) return databaseCache;
  const indexPath = path.join(process.cwd(), "DataBase", "index.json");
  databaseCache = JSON.parse(await fs.readFile(indexPath, "utf8")) as DatabaseIndex;
  return databaseCache;
}

export async function searchDatabaseAthletes(options: { query?: string; sport?: string; limit?: number }) {
  const database = await getDatabase();
  const query = (options.query ?? "").trim().toLocaleLowerCase();
  const limit = Math.min(100, Math.max(1, options.limit ?? 30));
  return database.athletes.filter((athlete) => {
    const matchesSport = !options.sport || options.sport === "all" || athlete.sport === options.sport;
    const haystack = `${athlete.name} ${athlete.team} ${athlete.nationality} ${athlete.role}`.toLocaleLowerCase();
    return matchesSport && (!query || haystack.includes(query));
  }).slice(0, limit);
}
