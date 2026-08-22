import { promises as fs } from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "DataBase");

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { values.push(value); value = ""; }
    else value += char;
  }
  values.push(value);
  return values;
}

async function readCsv(relativePath) {
  const content = await fs.readFile(path.join(root, relativePath), "utf8");
  const [headerLine, ...lines] = content.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(headerLine);
  return lines.map((line) => Object.fromEntries(parseCsvLine(line).map((value, index) => [headers[index], value])));
}

async function scan(directory) {
  let files = 0;
  let bytes = 0;
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await scan(fullPath); files += nested.files; bytes += nested.bytes;
    } else {
      files += 1; bytes += (await fs.stat(fullPath)).size;
    }
  }
  return { files, bytes };
}

const footballRows = await readCsv("Football/data/Fifa.csv");
const driverRows = await readCsv("FormulaOne/drivers.csv");
const providerManifest = JSON.parse(await fs.readFile(path.join(root, "sources", "football-providers.json"), "utf8"));
const [footballStats, formulaOneStats, sourceStats] = await Promise.all([scan(path.join(root, "Football")), scan(path.join(root, "FormulaOne")), scan(path.join(root, "sources"))]);

const athletes = [
  ...footballRows.map((row, index) => ({
    id: `football-${index + 1}`, sport: "football", name: row.Name, nationality: row.Country,
    role: row.Position, team: row.Team, number: "—", rating: Number(row.Overall_Rating) || 0,
    potential: Number(row["Future Potential"]) || 0, source: "Fifa.csv",
  })),
  ...driverRows.map((row) => ({
    id: `f1-${row.driverId}`, sport: "f1", name: `${row.forename} ${row.surname}`.trim(), nationality: row.nationality,
    role: "Formula 1 Driver", team: "Formula 1", number: row.number === "\\N" ? "—" : row.number,
    rating: 0, potential: 0, source: "drivers.csv",
  })),
];

const index = {
  generatedAt: new Date().toISOString(),
  version: 2,
  records: athletes.length,
  collections: [
    { id: "football", label: "Association Football", path: "Football", records: footballRows.length, ...footballStats },
    { id: "formula-one", label: "Formula One", path: "FormulaOne", records: driverRows.length, ...formulaOneStats },
    { id: "espn-fantasy", label: "ESPN Fantasy Football (NFL)", path: "cache/espn", records: 0, files: 0, bytes: 0 },
    { id: "data-sources", label: "Sports Data Sources and Models", path: "sources", records: providerManifest.providers.length + Math.max(0, sourceStats.files - 1), ...sourceStats },
  ],
  athletes,
};

await fs.mkdir(path.join(root, "cache", "espn"), { recursive: true });
await fs.writeFile(path.join(root, "index.json"), JSON.stringify(index));
console.log(`Indexed ${athletes.length.toLocaleString()} athletes across ${footballStats.files + formulaOneStats.files} files.`);
