"use client";

import { AnimatePresence, motion } from "framer-motion";
import SoundToggle from "./SoundToggle";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ChevronRight,
  CircleGauge,
  CloudRain,
  Database,
  Flag,
  Gauge,
  Home,
  Info,
  Menu,
  Newspaper,
  Search,
  Sparkles,
  Timer,
  Trophy,
  Users,
  Wrench,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import SportsNewsFeed, { type NewsFeedPayload } from "./SportsNewsFeed";

const CircuitReplay3D = dynamic(() => import("./CircuitReplay3D"), {
  loading: () => (
    <div className="replay-shell f1-loader">
      <strong>Preparing 3D circuit…</strong>
    </div>
  ),
});
const F1LastFiveComparison = dynamic(() => import("./F1LastFiveComparison"), {
  loading: () => (
    <div className="f1-panel f1-loader">
      <strong>Preparing five-race comparison…</strong>
    </div>
  ),
});

type View = "latest" | "drivers" | "analysis" | "predictions" | "news" | "data";
type DriverCore = {
  id: string;
  code: string;
  name: string;
  number: string;
  birthDate: string;
  nationality: string;
  profileUrl: string;
};
type Result = {
  position: number;
  grid: number;
  positionsGained: number;
  points: number;
  laps: number;
  status: string;
  time: string;
  driver: DriverCore;
  team: { id: string; name: string; nationality: string };
  fastestLap: null | {
    rank: number;
    lap: number;
    time: string;
    seconds: number;
  };
};
type Standing = {
  position: number;
  points: number;
  wins: number;
  driver: DriverCore;
  team: string;
};
type Lap = { lap: number; position: number; time: string; seconds: number };
type Pit = {
  driverId: string;
  driverCode: string;
  driverName: string;
  lap: number;
  stop: number;
  clockTime: string;
  duration: number;
};
export type RaceData = {
  source: string;
  fetchedAt: string;
  race: {
    season: number;
    round: number;
    name: string;
    date: string;
    circuit: {
      id: string;
      name: string;
      locality: string;
      country: string;
      latitude: number;
      longitude: number;
    };
    winner: Result;
    fastestLap: null | {
      rank: number;
      lap: number;
      time: string;
      seconds: number;
      driverName: string;
      driverCode: string;
    };
    totalLaps: number;
    results: Result[];
    pitStops: Pit[];
    winnerLaps: Lap[];
  };
  standings: Standing[];
};
type ModelDriver = {
  code: string;
  name: string;
  number: string;
  nationality: string;
  team: string;
  races: number;
  fastestLap: number;
  consistency: number;
  bestFinish: number;
  bestLaps: number;
};
type Prediction = {
  predictedLapSeconds: number;
  predictedLap: string;
  fastestLapProbability: number;
  pitWindow: { start: number; end: number };
  expectedStops: number;
  predictedPitDuration: number;
  tyrePlan: Array<{ compound: string; fromLap: number; length: number }>;
  confidence: number;
  inputs: {
    driverSamples: number;
    pitSamples: number;
    consistency: number;
    historicalBest: number;
    circuitBenchmark: number;
    recentRaceSamples: number;
    recentAverageFinish: number;
    recentPointsPerRace: number;
    recentDnfRate: number;
    archiveFallback: boolean;
  };
};
type Intelligence = {
  generatedAt: string;
  source: string;
  nextRace: null | {
    name: string;
    round: number;
    date: string;
    circuitId: string;
    circuit: string;
    locality: string;
    country: string;
    source: string;
  };
  drivers: ModelDriver[];
  races: string[];
  selectedDriver: ModelDriver;
  selectedRace: string;
  prediction: Prediction;
  compounds: Array<{
    compound: string;
    averageLap: number;
    fastestLap: number;
    averageLife: number;
  }>;
};

const nav: Array<{ id: View; label: string; icon: typeof Home }> = [
  { id: "latest", label: "Latest race", icon: Flag },
  { id: "drivers", label: "Drivers", icon: Users },
  { id: "analysis", label: "Race analysis", icon: BarChart3 },
  { id: "predictions", label: "Predictions", icon: Sparkles },
  { id: "news", label: "F1 news", icon: Newspaper },
  { id: "data", label: "Data lab", icon: Database },
];
const red = "#ff2846",
  cyan = "#48d8ff",
  amber = "#ffcb45",
  green = "#4df3a1";
const ease = [0.16, 1, 0.3, 1] as const;
const portraitCache = new Map<string, string>();

export default function FormulaOneDashboard({
  initialRace = null,
}: {
  initialRace?: RaceData | null;
}) {
  const [view, setView] = useState<View>("latest"),
    [raceData, setRaceData] = useState<RaceData | null>(initialRace),
    [model, setModel] = useState<Intelligence | null>(null),
    [news, setNews] = useState<NewsFeedPayload | null>(null),
    [newsLoading, setNewsLoading] = useState(true),
    [menu, setMenu] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    if (!initialRace)
      fetch("/api/f1-race", { signal: controller.signal })
        .then((r) => r.json())
        .then(setRaceData)
        .catch(() => setError("The racing data service could not be reached."));
    fetch("/api/f1-intelligence", { signal: controller.signal })
      .then((r) => r.json())
      .then(setModel)
      .catch(() => undefined);
    return () => controller.abort();
  }, [initialRace]);
  // keep the "Latest race" and "Race analysis" tabs in sync with the data service:
  // poll /api/f1-race every 15 minutes (same cadence as the server refresh cycle)
  // and swap the data in the moment a new race, winner or result shows up.
  useEffect(() => {
    const POLL_MS = 15 * 60 * 1000;
    let cancelled = false;

    // compact fingerprint of everything these two tabs display
    const signature = (data: RaceData | null) =>
      data && data.race
        ? [
            data.race.season,
            data.race.round,
            data.race.name,
            data.race.winner?.driver.id ?? "",
            (data.race.results || []).map((r) => r.driver.id + r.position).join(","),
            (data.standings || []).map((s) => s.driver.id + s.position + s.points).join(","),
          ].join("|")
        : "";

    const checkForFreshData = async () => {
      try {
        const response = await fetch("/api/f1-race", { cache: "no-store" });
        if (!response.ok) return;
        const fresh = (await response.json()) as RaceData;
        if (cancelled || !fresh?.race) return;
        setRaceData((current) => {
          if (!current) return fresh; // nothing loaded yet, take it
          if (signature(fresh) === signature(current)) return current; // unchanged, keep existing object
          console.info(
            "[f1-dashboard] fresh race data loaded:",
            `${fresh.race.name} · winner ${fresh.race.winner?.driver.name}`,
          );
          return fresh; // new race/winner/results -> both tabs re-render automatically
        });
      } catch {
        // service hiccup: keep showing the data we already have
      }
    };

    // check right away when entering the dashboard or one of these tabs
    if (view === "latest" || view === "analysis") void checkForFreshData();

    const timer = setInterval(checkForFreshData, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [view]);
  useEffect(() => {
    if (view !== "news" || news) return;
    const controller = new AbortController();
    fetch("/api/news?sport=formula-one", { signal: controller.signal })
      .then((r) => r.json())
      .then(setNews)
      .catch(() => undefined)
      .finally(() => setNewsLoading(false));
    return () => controller.abort();
  }, [view, news]);
  return (
    <main className="f1-os f1-v2">
      <aside className={`f1-nav ${menu ? "open" : ""}`}>
        <Link href="/" className="f1-mark">
          <Image
            src="/assets/brand/velostatiq-logo-small.webp"
            alt=""
            width={72}
            height={48}
          />
          <div>
            <strong>VeloStatiq</strong>
            <small>FORMULA ONE</small>
          </div>
        </Link>
        <nav>
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={view === item.id ? "active" : ""}
                onClick={() => {
                  setView(item.id);
                  setMenu(false);
                }}
              >
                <Icon />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="f1-nav-status">
          <i />
          <div>
            <strong>LIVE ARCHIVE ONLINE</strong>
            <span>Jolpica + local DataBase</span>
          </div>
        </div>
        <Link href="/" className="switch-sport">
          <ArrowLeft /> Switch sport
        </Link>
      </aside>
      <section className="f1-stage">
        <header className="f1-topbar">
          <button
            className="f1-menu"
            onClick={() => setMenu(!menu)}
            aria-label={
              menu
                ? "Close Formula One navigation"
                : "Open Formula One navigation"
            }
            aria-expanded={menu}
          >
            <Menu />
          </button>
          <div className="f1-top-title">
            <i />
            <span>
              <small>LAST COMPLETED GRAND PRIX</small>
              <strong>{raceData?.race.name || "Loading race…"}</strong>
            </span>
          </div>
          <SoundToggle />
          <div className="f1-live">
            <i />
            <span>VERIFIED DATA</span>
          </div>
          {raceData && (
            <button className="winner-chip" onClick={() => setView("drivers")}>
              <DriverImage name={raceData.race.winner.driver.name} />
              <span>
                <small>RACE WINNER</small>
                <strong>{raceData.race.winner.driver.name}</strong>
              </span>
            </button>
          )}
        </header>
        {view === "news" ? (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              className="f1-content"
              key="news"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease }}
            >
              <SportsNewsFeed
                feed={news}
                loading={newsLoading}
                sport="formula-one"
              />
            </motion.div>
          </AnimatePresence>
        ) : !raceData ||
          ((view === "predictions" || view === "data") && !model) ? (
          <LoadingView error={error} />
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              className="f1-content"
              key={view}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease }}
            >
              {view === "latest" && (
                <LatestRace
                  data={raceData}
                  onExplore={() => setView("analysis")}
                />
              )}{" "}
              {view === "drivers" && <Drivers data={raceData} />}{" "}
              {view === "analysis" && <Analysis data={raceData} />}{" "}
              {view === "predictions" && model && (
                <PredictionLab model={model} data={raceData} />
              )}{" "}
              {view === "data" && model && (
                <DataLab race={raceData} model={model} />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </section>
    </main>
  );
}

function LatestRace({
  data,
  onExplore,
}: {
  data: RaceData;
  onExplore: () => void;
}) {
  const race = data.race;
  return (
    <>
      <section className="latest-hero">
        <div className="hero-grid" />
        <div className="race-hero-copy">
          <span className="f1-eyebrow">
            <i /> OFFICIAL RESULT · ROUND {race.round}
          </span>
          <p>{race.season} FIA FORMULA ONE WORLD CHAMPIONSHIP</p>
          <h1>{race.name}</h1>
          <div className="race-place">
            <CalendarDays />
            <span>
              {formatDate(race.date)}
              <small>
                {race.circuit.name} · {race.circuit.locality},{" "}
                {race.circuit.country}
              </small>
            </span>
          </div>
          <button onClick={onExplore}>
            Explore race telemetry <ChevronRight />
          </button>
        </div>
        <div className="winner-visual">
          <div className="winner-aura" />
          <DriverImage name={race.winner.driver.name} />
          <span className="winner-position">01</span>
          <div>
            <small>RACE WINNER</small>
            <strong>{race.winner.driver.name}</strong>
            <p>
              {race.winner.team.name} · Started P{race.winner.grid}
            </p>
          </div>
        </div>
      </section>
      <section className="fact-strip">
        <Fact
          icon={Trophy}
          label="WINNER"
          value={race.winner.driver.code}
          detail={race.winner.time}
        />
        <Fact
          icon={Timer}
          label="FASTEST LAP"
          value={race.fastestLap?.time || "—"}
          detail={`${race.fastestLap?.driverName || "Unknown"} · lap ${race.fastestLap?.lap || "—"}`}
        />
        <Fact
          icon={Wrench}
          label="PIT STOPS"
          value={String(race.pitStops.length)}
          detail={`${new Set(race.pitStops.map((p) => p.driverId)).size} drivers stopped`}
        />
        <Fact
          icon={CircleGauge}
          label="RACE DISTANCE"
          value={`${race.totalLaps} LAPS`}
          detail={`${race.results.length} classified entries`}
        />
      </section>
      <section className="podium-grid">
        {race.results.slice(0, 3).map((result, index) => (
          <motion.article
            key={result.driver.id}
            className={`podium-card p${index + 1}`}
            whileHover={{ y: -8 }}
          >
            <span className="podium-rank">0{index + 1}</span>
            <DriverImage name={result.driver.name} />
            <div>
              <small>{result.team.name}</small>
              <strong>{result.driver.name}</strong>
              <p>
                Grid P{result.grid} · {result.points} pts
              </p>
            </div>
          </motion.article>
        ))}
      </section>
      <section className="latest-grid">
        <article className="f1-panel chart-panel">
          <PanelTitle
            index="01"
            title={`${race.winner.driver.code} race pace`}
            meta={`${race.winnerLaps.length} RECORDED LAPS`}
          />
          <LapChart laps={race.winnerLaps} />
        </article>
        <article className="f1-panel standings-mini">
          <PanelTitle
            index="02"
            title="Championship pulse"
            meta={`AFTER ROUND ${race.round}`}
          />
          {data.standings.slice(0, 6).map((s) => (
            <div key={s.driver.id}>
              <b>{s.position.toString().padStart(2, "0")}</b>
              <DriverImage name={s.driver.name} />
              <span>
                <strong>{s.driver.name}</strong>
                <small>{s.team}</small>
              </span>
              <em>{s.points} PTS</em>
            </div>
          ))}
        </article>
      </section>
      <section className="f1-panel classification">
        <PanelTitle
          index="03"
          title="Full classification"
          meta={`${data.source.toUpperCase()} · ${formatFresh(data.fetchedAt)}`}
        />
        <ResultsTable results={race.results} />
      </section>
    </>
  );
}

function Drivers({ data }: { data: RaceData }) {
  const [search, setSearch] = useState(""),
    [selected, setSelected] = useState<Standing | null>(null);
  const filtered = data.standings.filter((s) =>
    `${s.driver.name} ${s.team} ${s.driver.nationality}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHead
        eyebrow="DRIVERS"
        title="Meet every driver."
        subtitle="Search for a driver, then click their card to see simple facts and their latest race result."
      />
      <div className="f1-search">
        <Search />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Type a driver, team or country…"
        />
        <span>{filtered.length} drivers</span>
      </div>
      <div className="f1-driver-grid v2">
        {filtered.map((standing, index) => {
          const last = data.race.results.find(
            (r) => r.driver.id === standing.driver.id,
          );
          return (
            <motion.button
              key={standing.driver.id}
              onClick={() => setSelected(standing)}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.22,
                delay: Math.min(0.18, index * 0.012),
              }}
            >
              <div className="driver-card-photo">
                <DriverImage name={standing.driver.name} load />
                <span>{standing.driver.number}</span>
              </div>
              <div className="driver-card-copy">
                <small>{standing.team}</small>
                <strong>{standing.driver.name}</strong>
                <p>{standing.driver.nationality}</p>
                <div>
                  <b>
                    P{standing.position}
                    <em>CURRENT PLACE</em>
                  </b>
                  <b>
                    {standing.points}
                    <em>POINTS</em>
                  </b>
                  <b>
                    {last ? `P${last.position}` : "—"}
                    <em>LAST RACE</em>
                  </b>
                </div>
              </div>
              <ChevronRight />
            </motion.button>
          );
        })}
      </div>
      <AnimatePresence>
        {selected && (
          <DriverModal
            standing={selected}
            result={data.race.results.find(
              (r) => r.driver.id === selected.driver.id,
            )}
            raceName={data.race.name}
            close={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function DriverModal({
  standing,
  result,
  raceName,
  close,
}: {
  standing: Standing;
  result?: Result;
  raceName: string;
  close: () => void;
}) {
  return (
    <motion.div
      className="driver-modal-wrap"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) close();
      }}
    >
      <motion.article
        className="driver-dossier"
        initial={{ scale: 0.97, y: 10, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.98, opacity: 0 }}
        transition={{ duration: 0.18, ease }}
      >
        <button
          className="modal-close"
          onClick={close}
          aria-label="Close driver details"
        >
          <X />
        </button>
        <div className="dossier-visual">
          <div className="dossier-glow" />
          <DriverImage name={standing.driver.name} load eager />
          <span>{standing.driver.number}</span>
        </div>
        <div className="dossier-copy">
          <p>DRIVER DETAILS · {standing.team}</p>
          <h2>{standing.driver.name}</h2>
          <div className="dossier-kpis">
            <b>
              P{standing.position}
              <small>CURRENT PLACE</small>
            </b>
            <b>
              {standing.points}
              <small>POINTS</small>
            </b>
            <b>
              {standing.wins}
              <small>RACE WINS</small>
            </b>
          </div>
          <dl>
            <div>
              <dt>Country</dt>
              <dd>{standing.driver.nationality}</dd>
            </div>
            <div>
              <dt>Born</dt>
              <dd>{standing.driver.birthDate || "Not listed"}</dd>
            </div>
            <div>
              <dt>Car number</dt>
              <dd>#{standing.driver.number}</dd>
            </div>
            <div>
              <dt>Team</dt>
              <dd>{standing.team}</dd>
            </div>
          </dl>
          <section>
            <strong>What happened in the last race: {raceName}</strong>
            {result ? (
              <div className="latest-result">
                <span>
                  <b>P{result.position}</b>
                  <small>FINISHED</small>
                </span>
                <span>
                  <b>P{result.grid}</b>
                  <small>STARTED</small>
                </span>
                <span>
                  <b>{result.points}</b>
                  <small>POINTS</small>
                </span>
                <span>
                  <b>{result.fastestLap?.time || "—"}</b>
                  <small>BEST LAP</small>
                </span>
              </div>
            ) : (
              <p>This driver has no recorded finish in the latest race.</p>
            )}
          </section>
          {standing.driver.profileUrl && (
            <a
              href={standing.driver.profileUrl}
              target="_blank"
              rel="noreferrer"
            >
              Read the full driver story <ChevronRight />
            </a>
          )}
          <small className="dossier-source">
            Facts: Jolpica F1 · photo: Wikipedia/Wikimedia when available
          </small>
        </div>
      </motion.article>
    </motion.div>
  );
}

function Analysis({ data }: { data: RaceData }) {
  const validPits = data.race.pitStops.filter(
    (p) => Number.isFinite(p.duration) && p.duration < 60,
  );
  const gains = data.race.results
    .slice()
    .sort((a, b) => b.positionsGained - a.positionsGained)
    .slice(0, 10);
  const fastest = data.race.results
    .filter((r) => r.fastestLap?.seconds)
    .sort(
      (a, b) => (a.fastestLap?.seconds || 999) - (b.fastestLap?.seconds || 999),
    )
    .slice(0, 10);
  const pitByDriver = Object.values(
    validPits.reduce<
      Record<
        string,
        { driver: string; stops: number; average: number; total: number }
      >
    >((acc, p) => {
      const item = acc[p.driverId] || {
        driver: p.driverCode,
        stops: 0,
        average: 0,
        total: 0,
      };
      item.stops++;
      item.total += p.duration;
      item.average = item.total / item.stops;
      acc[p.driverId] = item;
      return acc;
    }, {}),
  ).sort((a, b) => a.average - b.average);
  return (
    <>
      <PageHead
        eyebrow="LAST RACE ANALYSIS"
        title="Every lap tells the story."
        subtitle="Recorded lap timing, pit execution, position changes and classification—never mixed with forecasts."
      />
      <CircuitReplay3D
        laps={data.race.winnerLaps}
        raceName={data.race.circuit.name}
        driverName={data.race.winner.driver.name}
      />
      <div className="analysis-grid">
        <article className="f1-panel wide">
          <PanelTitle
            index="01"
            title="Winner lap trace"
            meta="RECORDED TIMING"
          />
          <LapChart laps={data.race.winnerLaps} />
        </article>
        <article className="f1-panel">
          <PanelTitle index="02" title="Grid movement" meta="TOP GAINS" />
          <SimpleBars
            rows={gains.map((item, index) => ({
              label: item.driver.code,
              value: item.positionsGained,
              display:
                item.positionsGained > 0
                  ? `+${item.positionsGained}`
                  : String(item.positionsGained),
              color:
                item.positionsGained >= 0 ? (index < 3 ? green : cyan) : red,
            }))}
          />
        </article>
        <article className="f1-panel">
          <PanelTitle
            index="03"
            title="Pit service average"
            meta={`${validPits.length} VALID STOPS`}
          />
          <SimpleBars
            rows={pitByDriver
              .slice(0, 12)
              .map((item) => ({
                label: item.driver,
                value: item.average,
                display: `${item.average.toFixed(2)}s`,
                color: amber,
              }))}
          />
        </article>
        <article className="f1-panel wide">
          <PanelTitle index="04" title="Fastest laps" meta="TOP 10" />
          <SimpleBars
            rows={fastest.map((item) => ({
              label: item.driver.code,
              value: item.fastestLap?.seconds || 0,
              display: item.fastestLap?.time || "—",
              color: red,
            }))}
          />
        </article>
      </div>
      <section className="f1-panel classification">
        <PanelTitle
          index="05"
          title="Race classification"
          meta="FACTUAL RESULT"
        />
        <ResultsTable results={data.race.results} />
      </section>
    </>
  );
}

function PredictionLab({
  model,
  data,
}: {
  model: Intelligence;
  data: RaceData;
}) {
  const [driver, setDriver] = useState(model.selectedDriver.code),
    [temperature, setTemperature] = useState(34),
    [rain, setRain] = useState(10),
    [fuel, setFuel] = useState(45),
    [safetyCar, setSafetyCar] = useState(false),
    [prediction, setPrediction] = useState(model.prediction),
    [busy, setBusy] = useState(false);
  const race = model.selectedRace;
  const currentDrivers = data.standings.map(
    (standing) =>
      model.drivers.find(
        (candidate) => candidate.code === standing.driver.code,
      ) || {
        code: standing.driver.code,
        name: standing.driver.name,
        number: standing.driver.number,
        nationality: standing.driver.nationality,
        team: standing.team,
        races: 0,
        fastestLap: 0,
        consistency: 0,
        bestFinish: 0,
        bestLaps: 0,
      },
  );
  const selected =
    currentDrivers.find((d) => d.code === driver) || model.selectedDriver;
  const selectedStanding = data.standings.find(
    (standing) => standing.driver.code.toUpperCase() === driver.toUpperCase(),
  );
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setBusy(true);
      fetch(
        `/api/f1-predict?driver=${encodeURIComponent(driver)}&driverId=${encodeURIComponent(selectedStanding?.driver.id || "")}&race=${encodeURIComponent(race)}&trackTemp=${temperature}&rain=${rain}&fuel=${fuel}&safetyCar=${safetyCar ? "true" : "false"}`,
        { signal: controller.signal },
      )
        .then((r) => r.json())
        .then(setPrediction)
        .finally(() => setBusy(false));
    }, 280);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    driver,
    race,
    temperature,
    rain,
    fuel,
    safetyCar,
    selectedStanding?.driver.id,
  ]);
  const tyrePie = prediction.tyrePlan.map((p, i) => ({
    name: p.compound,
    value: p.length,
    color: [red, amber, "#e8edf2"][i] || cyan,
  }));
  return (
    <>
      <PageHead
        eyebrow="AUTOMATIC NEXT-RACE STUDY"
        title="Five recent races. One returning circuit."
        subtitle="Choose a driver. VeloStatiq automatically studies the real next Grand Prix, five latest results and the previous race at that circuit."
      />
      <section className="prediction-driver-banner">
        <div className="prediction-driver-photo">
          <DriverImage name={selected.name} load eager />
          <span>{selected.number}</span>
        </div>
        <div>
          <small>YOU ARE VIEWING A PREDICTION FOR</small>
          <h2>{selected.name}</h2>
          <p>
            {selected.team} · {selected.code} · model race: <b>{race}</b>
          </p>
        </div>
        <span className={busy ? "computing" : ""}>
          <i />
          <b>{busy ? "Updating…" : "Prediction ready"}</b>
          <small>Made by VeloStatiq engine</small>
        </span>
      </section>
      <div className="model-selector friendly">
        <label>
          Choose a current driver
          <select value={driver} onChange={(e) => setDriver(e.target.value)}>
            {currentDrivers.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name} · {d.code}
              </option>
            ))}
          </select>
        </label>
        <article className="automatic-race-target">
          <small>AUTOMATIC UPCOMING TARGET</small>
          <strong>{model.nextRace?.name || race}</strong>
          <span>
            {model.nextRace
              ? `${formatDate(model.nextRace.date)} · ${model.nextRace.circuit}, ${model.nextRace.country}`
              : `Archive circuit match · ${race}`}
          </span>
        </article>
      </div>
      <section className="prediction-help">
        <Info />
        <p>
          <strong>How to read this page</strong>
          <span>
            “Last time here” is the selected driver&apos;s recorded race at the
            upcoming circuit. “Prediction” is the model&apos;s estimate for the
            next event on that same track.
          </span>
        </p>
      </section>
      <div className="prediction-command v2">
        <section className="prediction-result">
          <div className="prediction-orbit">
            <i />
            <span>
              <Sparkles />
              <strong>{prediction.predictedLap}</strong>
              <small>GUESSED BEST LAP</small>
            </span>
          </div>
          <div className="prediction-kpis">
            <span>
              Chance of fastest lap{" "}
              <b>{pct(prediction.fastestLapProbability)}</b>
            </span>
            <span>
              Best time to make the first stop{" "}
              <b>
                Lap {prediction.pitWindow.start}–{prediction.pitWindow.end}
              </b>
            </span>
            <span>
              Number of stops <b>{prediction.expectedStops}</b>
            </span>
            <span>
              How sure is the model? <b>{pct(prediction.confidence)}</b>
            </span>
            <span>
              Guessed pit-stop time{" "}
              <b>{prediction.predictedPitDuration.toFixed(2)}s</b>
            </span>
          </div>
        </section>
        <section className="scenario-controls">
          <h2>Change the race conditions</h2>
          <p className="control-help">
            Move these controls to see how weather and fuel can change the
            guess.
          </p>
          <Slider
            label="Track temperature"
            value={temperature}
            setValue={setTemperature}
            min={15}
            max={55}
            suffix="°C"
            icon={Gauge}
          />
          <Slider
            label="Chance of rain"
            value={rain}
            setValue={setRain}
            min={0}
            max={100}
            suffix="%"
            icon={CloudRain}
          />
          <Slider
            label="Fuel in the car"
            value={fuel}
            setValue={setFuel}
            min={5}
            max={110}
            suffix=" kg"
            icon={Activity}
          />
          <button
            className={safetyCar ? "active" : ""}
            onClick={() => setSafetyCar(!safetyCar)}
          >
            <Flag />
            <span>
              <strong>Safety car</strong>
              <small>
                {safetyCar
                  ? "Yes — include it in the guess"
                  : "No — click to include it"}
              </small>
            </span>
            <i />
          </button>
        </section>
      </div>
      <F1LastFiveComparison
        standings={data.standings}
        selectedCode={driver}
        prediction={prediction}
        race={race}
        conditions={{ temperature, rain, fuel, safetyCar }}
      />
      <section className="prediction-reasons">
        <header>
          <span>02</span>
          <div>
            <strong>Why did the model make this prediction?</strong>
            <p>Four simple reasons explain the result.</p>
          </div>
        </header>
        <div>
          <ReasonCard
            number="1"
            title="The driver’s past speed"
            text={`The model found ${prediction.inputs.driverSamples} matching race record${prediction.inputs.driverSamples === 1 ? "" : "s"}. The best useful lap was ${seconds(prediction.inputs.historicalBest)}.`}
          />
          <ReasonCard
            number="2"
            title="The track used for the guess"
            text={`It compares the driver with a ${seconds(prediction.inputs.circuitBenchmark)} track benchmark for ${race}. Different tracks naturally have different lap times.`}
          />
          <ReasonCard
            number="3"
            title="Weather and fuel"
            text={`You selected ${temperature}°C, ${rain}% rain and ${fuel} kg of fuel. More rain and fuel usually make the guessed lap slower.`}
          />
          <ReasonCard
            number="4"
            title="How much data we have"
            text={`The confidence is ${pct(prediction.confidence)} because there are ${prediction.inputs.driverSamples} driver records and ${prediction.inputs.pitSamples} pit records. Less data means less certainty.`}
          />
        </div>
      </section>
      <div className="prediction-viz-grid">
        <article className="f1-panel">
          <PanelTitle index="03" title="Suggested tyres" meta="PREDICTION" />
          <div className="tyre-pie">
            <TyreDonut data={tyrePie} />
            <div>
              {prediction.tyrePlan.map((p) => (
                <span key={`${p.compound}-${p.fromLap}`}>
                  <i className={p.compound.toLowerCase()} />
                  <b>{friendlyTyre(p.compound)}</b>
                  <small>
                    Lap {p.fromLap} to {p.fromLap + p.length - 1}
                  </small>
                </span>
              ))}
            </div>
          </div>
        </article>
        <article className="f1-panel">
          <PanelTitle index="04" title="Data used" meta={selected.name} />
          <ModelEvidence prediction={prediction} />
        </article>
      </div>
      <div className="model-disclaimer">
        <Info />
        <p>
          <strong>This is only a computer guess.</strong>
          <span>
            The model cannot know future crashes, car upgrades, exact weather or
            team decisions. Do not use it for betting.
          </span>
        </p>
      </div>
    </>
  );
}

function ReasonCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <article>
      <b>{number}</b>
      <span>
        <strong>{title}</strong>
        <p>{text}</p>
      </span>
    </article>
  );
}

function DataLab({ race, model }: { race: RaceData; model: Intelligence }) {
  const files = [
    "DataBase/PredictionSystem/f1_predictor.py",
    "DataBase/PredictionSystem/sample_prediction.json",
    "DataBase/FormulaOne/driver_race_summary.csv",
    "DataBase/FormulaOne/pit_strategy.csv",
    "DataBase/FormulaOne/pit_stops.csv",
    "DataBase/FormulaOne/compound_performance.csv",
    "DataBase/FormulaOne/stint_analysis.csv",
    "DataBase/cache/formula-one/last-race.json",
  ];
  return (
    <>
      <PageHead
        eyebrow="DATA PROVENANCE"
        title="Know where every number came from."
        subtitle="Live race facts and historical model inputs are stored separately, labeled clearly, and never presented as the same thing."
      />
      <div className="data-source-cards">
        <article>
          <Database />
          <span>
            <small>LIVE RACE SOURCE</small>
            <strong>Jolpica F1</strong>
            <p>
              Results, standings, laps and pit stops · fetched{" "}
              {formatFresh(race.fetchedAt)}
            </p>
          </span>
        </article>
        <article>
          <Activity />
          <span>
            <small>FORECAST ENGINE</small>
            <strong>TypeScript · Node.js runtime</strong>
            <p>
              Historical weighted model · generated{" "}
              {formatFresh(model.generatedAt)}
            </p>
          </span>
        </article>
        <article>
          <BarChart3 />
          <span>
            <small>REPORT</small>
            <strong>Prediction system guide</strong>
            <p>output/pdf/VeloStatiq_F1_Prediction_System_Report.pdf</p>
          </span>
        </article>
      </div>
      <section className="f1-panel dataset-list">
        <PanelTitle
          index="01"
          title="Active data assets"
          meta={`${files.length} TRACEABLE FILES`}
        />
        {files.map((file, index) => (
          <motion.div
            key={file}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <Database />
            <span>
              <strong>{file.split("/").at(-1)}</strong>
              <small>{file}</small>
            </span>
            <i>ACTIVE</i>
          </motion.div>
        ))}
      </section>
      <section className="source-note">
        <Info />
        <p>
          <strong>Truthfulness boundary</strong>
          <span>
            Jolpica supplies recorded championship data. The local archive
            supplies historical training evidence. The model produces estimates.
            The 3D track is an illustrative reconstruction with recorded lap
            durations controlling replay speed.
          </span>
        </p>
      </section>
    </>
  );
}

function DriverImage({
  name,
  eager = false,
  load = false,
}: {
  name: string;
  eager?: boolean;
  load?: boolean;
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(eager);
  const [loaded, setLoaded] = useState(() => ({
    name,
    url: portraitCache.get(name) || "",
  }));
  const url = loaded.name === name ? loaded.url : portraitCache.get(name) || "";
  useEffect(() => {
    if (!load || eager || visible) return;
    const node = anchor.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [eager, load, visible]);
  useEffect(() => {
    if (!load || !visible || portraitCache.has(name)) return;
    const controller = new AbortController();
    fetch(`/api/athlete-image?name=${encodeURIComponent(name)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((b: { url?: string }) => {
        if (b.url) {
          portraitCache.set(name, b.url);
          setLoaded({ name, url: b.url });
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [load, name, visible]);
  return url ? (
    <Image
      src={url}
      alt={name}
      width={480}
      height={591}
      unoptimized
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      crossOrigin="anonymous"
      referrerPolicy="no-referrer"
    />
  ) : (
    <span
      ref={anchor}
      className="portrait-fallback"
      role="img"
      aria-label={`${name} portrait`}
    >
      {initials(name)}
    </span>
  );
}
function LapChart({ laps }: { laps: Lap[] }) {
  const clean = laps.filter((lap) => lap.seconds > 30 && lap.seconds < 180);
  const values = clean.map((lap) => lap.seconds);
  const min = Math.min(...values),
    max = Math.max(...values),
    spread = Math.max(1, max - min);
  const points = clean
    .map(
      (lap, index) =>
        `${20 + (index / Math.max(1, clean.length - 1)) * 760},${235 - ((lap.seconds - min) / spread) * 190}`,
    )
    .join(" ");
  const fastest = clean.reduce<Lap | null>(
    (best, lap) => (!best || lap.seconds < best.seconds ? lap : best),
    null,
  );
  return (
    <figure
      className="native-lap-chart"
      aria-label={`Lap time chart with ${clean.length} recorded laps`}
    >
      <svg
        viewBox="0 0 800 260"
        role="img"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="lapFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={red} stopOpacity=".48" />
            <stop offset="1" stopColor={red} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[50, 110, 170, 230].map((y) => (
          <line key={y} x1="20" x2="780" y1={y} y2={y} stroke="#ffffff12" />
        ))}
        {points && (
          <>
            <polygon points={`20,245 ${points} 780,245`} fill="url(#lapFill)" />
            <polyline
              points={points}
              fill="none"
              stroke={red}
              strokeWidth="4"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
      </svg>
      <figcaption>
        <span>Lap 1</span>
        <strong>
          {fastest
            ? `Fastest ${fastest.time} · lap ${fastest.lap}`
            : "No clean laps"}
        </strong>
        <span>Lap {clean.at(-1)?.lap || "—"}</span>
      </figcaption>
    </figure>
  );
}
function SimpleBars({
  rows,
}: {
  rows: Array<{ label: string; value: number; display: string; color: string }>;
}) {
  const max = Math.max(1, ...rows.map((row) => Math.abs(row.value)));
  return (
    <div
      className="native-bars"
      role="img"
      aria-label={rows.map((row) => `${row.label}: ${row.display}`).join(", ")}
    >
      {rows.map((row) => (
        <div key={`${row.label}-${row.display}`}>
          <b>{row.label}</b>
          <i>
            <em
              style={{
                width: `${Math.max(4, (Math.abs(row.value) / max) * 100)}%`,
                background: row.color,
              }}
            />
          </i>
          <span>{row.display}</span>
        </div>
      ))}
    </div>
  );
}
function TyreDonut({
  data,
}: {
  data: Array<{ name: string; value: number; color: string }>;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  const stops = data
    .map((item, index) => {
      const start = data.slice(0, index).reduce((sum, entry) => sum + (entry.value / total) * 360, 0);
      const end = start + (item.value / total) * 360;
      return `${item.color} ${start}deg ${end}deg`;
    })
    .join(",");
  return (
    <div
      className="native-donut"
      role="img"
      aria-label={data
        .map((item) => `${item.name}: ${item.value} laps`)
        .join(", ")}
      style={{ background: `conic-gradient(${stops})` }}
    >
      <span>
        {total}
        <small>LAPS</small>
      </span>
    </div>
  );
}
function ResultsTable({ results }: { results: Result[] }) {
  return (
    <div className="results-table">
      <div className="result-row head">
        <span>POS</span>
        <span>DRIVER</span>
        <span>TEAM</span>
        <span>GRID</span>
        <span>CHANGE</span>
        <span>FASTEST LAP</span>
        <span>TIME / STATUS</span>
      </div>
      {results.map((r) => (
        <div className="result-row" key={r.driver.id}>
          <b>P{r.position}</b>
          <span className="result-driver">
            <DriverImage name={r.driver.name} />
            <i>
              <strong>{r.driver.name}</strong>
              <small>
                #{r.driver.number} · {r.driver.code}
              </small>
            </i>
          </span>
          <span>{r.team.name}</span>
          <span>P{r.grid}</span>
          <em
            className={
              r.positionsGained > 0
                ? "gain"
                : r.positionsGained < 0
                  ? "loss"
                  : ""
            }
          >
            {r.positionsGained > 0
              ? `+${r.positionsGained}`
              : r.positionsGained}
          </em>
          <span>{r.fastestLap?.time || "—"}</span>
          <span>{r.time !== "—" ? r.time : r.status}</span>
        </div>
      ))}
    </div>
  );
}
function Fact({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <motion.article whileHover={{ y: -5 }}>
      <Icon />
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
        <p>{detail}</p>
      </span>
    </motion.article>
  );
}
function PanelTitle({
  index,
  title,
  meta,
}: {
  index: string;
  title: string;
  meta: string;
}) {
  return (
    <header className="f1-panel-title">
      <span>{index}</span>
      <strong>{title}</strong>
      <small>{meta}</small>
    </header>
  );
}
function PageHead({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="f1-page-head">
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <span>{subtitle}</span>
    </header>
  );
}
function Slider({
  label,
  value,
  setValue,
  min,
  max,
  suffix,
  icon: Icon,
}: {
  label: string;
  value: number;
  setValue: (v: number) => void;
  min: number;
  max: number;
  suffix: string;
  icon: typeof Gauge;
}) {
  return (
    <label className="scenario-slider">
      <span>
        <Icon />
        <strong>{label}</strong>
        <b>
          {value}
          {suffix}
        </b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
      />
    </label>
  );
}
function ModelEvidence({ prediction }: { prediction: Prediction }) {
  const p = prediction.inputs;
  return (
    <div className="model-evidence">
      <div>
        <span>Driver&apos;s best past lap</span>
        <b>{seconds(p.historicalBest)}</b>
        <i>
          <em style={{ width: "86%" }} />
        </i>
      </div>
      <div>
        <span>Track comparison time</span>
        <b>{seconds(p.circuitBenchmark)}</b>
        <i>
          <em style={{ width: "78%" }} />
        </i>
      </div>
      <div>
        <span>How much lap times changed</span>
        <b>±{p.consistency.toFixed(3)}s</b>
        <i>
          <em style={{ width: `${Math.max(15, 100 - p.consistency * 8)}%` }} />
        </i>
      </div>
      <div>
        <span>Amount of useful data</span>
        <b>{p.driverSamples + p.pitSamples} records</b>
        <i>
          <em
            style={{
              width: `${Math.min(100, (p.driverSamples + p.pitSamples) * 2)}%`,
            }}
          />
        </i>
      </div>
      <p>
        <Activity /> The model combines these past results to make the guess.
      </p>
    </div>
  );
}
function LoadingView({ error }: { error: string }) {
  return (
    <div className="f1-loader">
      <div>
        <i />
        <i />
        <i />
      </div>
      <strong>{error || "SYNCING RACE CONTROL"}</strong>
      <span>
        {error
          ? "Check the local server and data cache."
          : "Loading results, laps, pit stops and standings…"}
      </span>
    </div>
  );
}
function seconds(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  const minutes = Math.floor(value / 60);
  return `${minutes}:${(value % 60).toFixed(3).padStart(6, "0")}`;
}
function pct(value: number) {
  return `${Math.round((value <= 1 ? value : value / 100) * 100)}%`;
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}
function formatFresh(value: string) {
  const hours = Math.round((new Date(value).getTime() - Date.now()) / 3600000);
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
    hours,
    "hour",
  );
}
function initials(name: string) {
  return name
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("");
}
function friendlyTyre(compound: string) {
  return (
    (
      {
        SOFT: "Soft tyre",
        MEDIUM: "Medium tyre",
        HARD: "Hard tyre",
        INTERMEDIATE: "Rain tyre",
        WET: "Heavy-rain tyre",
      } as Record<string, string>
    )[compound] || compound
  );
}
