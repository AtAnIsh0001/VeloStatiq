import "server-only";

// pulls fresh data from every external API every 15 minutes,
// even when nobody is visiting the site. each loader shares its
// fetch cache with the /api routes, so refreshing here keeps the
// responses warm and also rewrites the disk caches in DataBase/cache.

const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
let timer: ReturnType<typeof setInterval> | null = null;

async function refreshJolpicaRaceData() {
  const { getLatestF1RaceData } = await import("./f1RaceData");
  await getLatestF1RaceData();
  return "jolpica last race + standings";
}

async function refreshNextRace() {
  const { getNextF1Race } = await import("./f1DriverHistory");
  await getNextF1Race();
  return "jolpica next race";
}

async function refreshOpenF1() {
  const { getMonacoSnapshot } = await import("./openF1");
  const snapshot = await getMonacoSnapshot();
  return snapshot.source === "openf1" ? "openf1 monaco snapshot" : "openf1 unavailable (local fallback)";
}

async function refreshFootballFixtures() {
  const { getUpcomingFixtures, MAJOR_FOOTBALL_LEAGUES } = await import("./footballData");
  const payload = await getUpcomingFixtures(14, MAJOR_FOOTBALL_LEAGUES);
  return `football fixtures (${payload.fixtures.length}) via ${payload.source}`;
}

async function refreshFootballNews() {
  const { getSportsNews } = await import("./sportsNews");
  const feed = await getSportsNews("football");
  return `football news (${feed.items.length}) via ${feed.source}`;
}

async function refreshF1News() {
  const { getSportsNews } = await import("./sportsNews");
  const feed = await getSportsNews("formula-one");
  return `f1 news (${feed.items.length}) via ${feed.source}`;
}

const refreshJobs = [
  { label: "F1 race data", run: refreshJolpicaRaceData },
  { label: "F1 next race", run: refreshNextRace },
  { label: "OpenF1 telemetry", run: refreshOpenF1 },
  { label: "Football fixtures", run: refreshFootballFixtures },
  { label: "Football news", run: refreshFootballNews },
  { label: "F1 news", run: refreshF1News },
];

export async function refreshAllApis(): Promise<void> {
  const results = await Promise.allSettled(refreshJobs.map(async (job) => {
    try {
      const detail = await job.run();
      console.log(`[scheduled-refresh] ok · ${job.label} · ${detail}`);
    } catch (error) {
      console.warn(`[scheduled-refresh] failed · ${job.label} ·`, error instanceof Error ? error.message : error);
    }
  }));
  void results;
}

export function startScheduledRefresh(): void {
  if (timer) return; // already running in this server process

  if (process.env.DISABLE_SCHEDULED_REFRESH === "true") {
    console.log("[scheduled-refresh] disabled via DISABLE_SCHEDULED_REFRESH=true");
    return;
  }

  // warm everything once right after the server boots, then keep the cycle going
  void refreshAllApis();
  timer = setInterval(() => {
    void refreshAllApis();
  }, REFRESH_INTERVAL_MS);
  console.log(`[scheduled-refresh] every API now refreshes every ${REFRESH_INTERVAL_MS / 60000} minutes`);
}
