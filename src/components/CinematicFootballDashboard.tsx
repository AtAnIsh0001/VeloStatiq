/* eslint-disable @next/next/no-img-element */
"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  CircleUserRound,
  Database,
  Goal,
  Home,
  Menu,
  Newspaper,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import SportsNewsFeed, { type NewsFeedPayload } from "./SportsNewsFeed";

const FootballPredictionStudio = dynamic(
  () => import("./FootballPredictionStudio"),
  {
    loading: () => (
      <div className="cinema-empty">
        <strong>Opening prediction studio…</strong>
      </div>
    ),
  },
);

type View =
  | "home"
  | "matches"
  | "players"
  | "champions"
  | "predictions"
  | "news"
  | "sources";
type Team = {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  logo: string;
  color: string;
  form: string;
  strength?: number;
};
export type Fixture = {
  id: string;
  league: string;
  leagueSlug: string;
  date: string;
  venue: string;
  home: Team;
  away: Team;
  source: string;
};
type Player = {
  id: string;
  name: string;
  team: string;
  nationality: string;
  position: string;
  image: string | null;
  birthDate?: string;
  birthPlace?: string;
  height?: string;
  weight?: string;
  shirtNumber?: string;
  description?: string;
  rating?: number;
  source: string;
  dataStatus?: "current profile" | "historical archive";
  social?: { instagram?: string; twitter?: string; facebook?: string };
};
export type Champions = {
  competition: string;
  season: string;
  updatedAt: string;
  source: string;
  sourceUrl: string;
  format: {
    leaguePhaseTeams: number;
    automaticQualifiers: number;
    playoffQualifiers: number;
    leaguePhaseMatchesPerTeam: number;
  };
  milestones: Array<{ label: string; date: string }>;
  upcoming: Array<{
    id: string;
    date: string;
    publishedTime: string;
    home: string;
    away: string;
    path: string;
  }>;
};

const navigation: Array<{ id: View; label: string; icon: typeof Home }> = [
  { id: "home", label: "Home", icon: Home },
  { id: "matches", label: "Matches", icon: CalendarDays },
  { id: "players", label: "Players", icon: Users },
  { id: "champions", label: "Champions League", icon: Trophy },
  { id: "predictions", label: "Predictions", icon: Sparkles },
  { id: "news", label: "Football news", icon: Newspaper },
  { id: "sources", label: "Football data", icon: Database },
];
const leagueLabels: Record<string, string> = {
  "eng.1": "Premier League",
  "esp.1": "LaLiga",
  "ger.1": "Bundesliga",
  "ita.1": "Serie A",
  "fra.1": "Ligue 1",
  "ned.1": "Eredivisie",
  "por.1": "Primeira Liga",
  "uefa.champions": "Champions League",
  "uefa.champions_qual": "UCL Qualifying",
};
const ease = [0.16, 1, 0.3, 1] as const;

export default function CinematicFootballDashboard({
  initialFixtures = [],
  initialChampions = null,
}: {
  initialFixtures?: Fixture[];
  initialChampions?: Champions | null;
}) {
  const [view, setView] = useState<View>("home");
  const [menu, setMenu] = useState(false);
  const [fixtures, setFixtures] = useState<Fixture[]>(initialFixtures);
  const [fixturesComplete, setFixturesComplete] = useState(false);
  const [champions, setChampions] = useState<Champions | null>(
    initialChampions,
  );
  const [news, setNews] = useState<NewsFeedPayload | null>(null);
  const [newsLoading, setNewsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(
    initialFixtures[0] || null,
  );
  useEffect(() => {
    const controller = new AbortController();
    if (!initialFixtures.length)
      fetch("/api/football?type=fixtures&days=45&limit=12", {
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((football) => {
          setFixtures(football.fixtures || []);
          setSelectedFixture(football.fixtures?.[0] || null);
        })
        .catch(() => undefined);
    if (!initialChampions)
      fetch("/api/football?type=champions", { signal: controller.signal })
        .then((r) => r.json())
        .then(setChampions)
        .catch(() => undefined);
    return () => controller.abort();
  }, [initialChampions, initialFixtures.length]);
  useEffect(() => {
    if (view !== "news" || news) return;
    const controller = new AbortController();
    fetch("/api/news?sport=football", { signal: controller.signal })
      .then((r) => r.json())
      .then(setNews)
      .catch(() => undefined)
      .finally(() => setNewsLoading(false));
    return () => controller.abort();
  }, [view, news]);
  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/api/football?type=search&q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((body: { players: Player[] }) => setPlayers(body.players || []))
        .catch(() => undefined)
        .finally(() => setSearching(false));
    }, 240);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  const navigate = (next: View) => {
    setView(next);
    setMenu(false);
    if (!fixturesComplete && (next === "matches" || next === "predictions")) {
      setFixturesComplete(true);
      fetch("/api/football?type=fixtures&days=45")
        .then((response) => response.json())
        .then((body) => setFixtures(body.fixtures || []))
        .catch(() => setFixturesComplete(false));
    }
  };
  return (
    <main className="football-cinema">
      <div className="football-atmosphere">
        <i />
        <i />
        <i />
      </div>
      <aside className={`football-nav ${menu ? "open" : ""}`}>
        <Link href="/" className="football-mark">
          <Image
            src="/assets/brand/velostatiq-logo-small.webp"
            alt=""
            width={72}
            height={48}
          />
          <div>
            <strong>VeloStatiq</strong>
            <small>FOOTBALL INTELLIGENCE</small>
          </div>
        </Link>
        <nav>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={view === item.id ? "active" : ""}
                onClick={() => navigate(item.id)}
              >
                <Icon />
                <span>{item.label}</span>
                {item.id === "matches" && <b>{fixtures.length}</b>}
              </button>
            );
          })}
        </nav>
        <div className="football-data-state">
          <i />
          <div>
            <strong>FOOTBALL DATA ONLINE</strong>
            <span>Independent football workspace</span>
          </div>
        </div>
        <Link href="/" className="football-switch">
          <ArrowLeft /> Switch sport
        </Link>
      </aside>
      <section className="football-stage">
        <header className="football-top">
          <button
            className="football-menu"
            onClick={() => setMenu(!menu)}
            aria-label={
              menu ? "Close football navigation" : "Open football navigation"
            }
            aria-expanded={menu}
          >
            <Menu />
          </button>
          <div className="football-global-search">
            <Search />
            <input
              aria-label="Search football players"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search verified football profiles…"
            />
            <kbd>⌘ K</kbd>
            {query.trim().length >= 2 && view !== "players" && (
              <SearchPanel
                players={players}
                loading={searching}
                select={(player) => {
                  setSelectedPlayer(player);
                  setQuery("");
                }}
              />
            )}
          </div>
          <div className="football-live">
            <i /> LIVE FIXTURES
          </div>
          <button className="fan-profile">
            <CircleUserRound />
            <span>Football mode</span>
          </button>
        </header>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            className="football-content"
            key={view}
            initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0)" }}
            exit={{ opacity: 0, y: -15, filter: "blur(5px)" }}
            transition={{ duration: 0.5, ease }}
          >
            {view === "home" && (
              <FootballHome
                fixtures={fixtures}
                champions={champions}
                selectFixture={(fixture) => {
                  setSelectedFixture(fixture);
                  setView("predictions");
                }}
                go={navigate}
                search={setQuery}
              />
            )}{" "}
            {view === "matches" && (
              <Matches
                fixtures={fixtures}
                select={(fixture) => {
                  setSelectedFixture(fixture);
                  setView("predictions");
                }}
              />
            )}{" "}
            {view === "players" && (
              <Players
                query={query}
                setQuery={setQuery}
                players={players}
                loading={searching}
                select={setSelectedPlayer}
              />
            )}{" "}
            {view === "champions" && <ChampionsLeague data={champions} />}{" "}
            {view === "predictions" && (
              <Predictions
                fixtures={fixtures}
                selected={selectedFixture}
                setSelected={setSelectedFixture}
              />
            )}{" "}
            {view === "news" && (
              <SportsNewsFeed
                feed={news}
                loading={newsLoading}
                sport="football"
              />
            )}{" "}
            {view === "sources" && <FootballSources />}
          </motion.div>
        </AnimatePresence>
      </section>
      <AnimatePresence>
        {selectedPlayer && (
          <PlayerModal
            key={selectedPlayer.id}
            player={selectedPlayer}
            close={() => setSelectedPlayer(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function FootballHome({
  fixtures,
  champions,
  selectFixture,
  go,
  search,
}: {
  fixtures: Fixture[];
  champions: Champions | null;
  selectFixture: (fixture: Fixture) => void;
  go: (view: View) => void;
  search: (name: string) => void;
}) {
  return (
    <>
      <section className="football-hero">
        <div className="hero-mesh" />
        <motion.div
          className="football-hero-copy"
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease }}
        >
          <p>
            <i /> FOOTBALL COMMAND CENTER
          </p>
          <h1>
            The game,<strong>decoded.</strong>
          </h1>
          <span>
            Current fixtures, sourced player profiles and transparent
            predictions—with football data only.
          </span>
          <div>
            <button onClick={() => go("matches")}>
              Explore matches <ChevronRight />
            </button>
            <button onClick={() => go("champions")}>
              <Trophy /> Champions League
            </button>
          </div>
        </motion.div>
        <div className="hero-scoreline">
          <span>LIVE COVERAGE</span>
          <strong>{fixtures.length}</strong>
          <small>UPCOMING MATCHES</small>
        </div>
        <div className="football-scanline" />
      </section>
      <section className="cinema-stat-row">
        <Stat
          icon={CalendarDays}
          label="UPCOMING"
          value={String(fixtures.length)}
          detail="9 major competitions"
        />
        <Stat
          icon={Users}
          label="PLAYER INDEX"
          value="20,532"
          detail="Current profiles + labeled archive"
        />
        <Stat
          icon={Trophy}
          label="CHAMPIONS LEAGUE"
          value={champions?.season || "2026/27"}
          detail="Fixtures + official calendar"
        />
        <Stat
          icon={ShieldCheck}
          label="PROVENANCE"
          value="VISIBLE"
          detail="Every profile shows its source"
        />
      </section>
      <section className="cinema-section">
        <SectionHead
          number="01"
          title="Next on the pitch"
          subtitle="Internet fixtures · refreshed every 15 minutes"
          action="All matches"
          click={() => go("matches")}
        />
        <div className="cinema-fixture-grid">
          {fixtures.slice(0, 6).map((fixture, index) => (
            <motion.button
              key={fixture.id}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.07 }}
              onClick={() => selectFixture(fixture)}
            >
              <div>
                <span>{fixture.league}</span>
                <time>{date(fixture.date)}</time>
              </div>
              <div>
                <Team team={fixture.home} images={false} />
                <b>VS</b>
                <Team team={fixture.away} images={false} />
              </div>
              <footer>
                <span>{fixture.venue}</span>
                <em>
                  Prediction <ChevronRight />
                </em>
              </footer>
            </motion.button>
          ))}
        </div>
      </section>
      <div className="football-lower">
        <section className="cinema-section ucl-preview">
          <SectionHead
            number="02"
            title="Road to Madrid"
            subtitle="UEFA Champions League 2026/27"
            action="Competition hub"
            click={() => go("champions")}
          />
          <div className="ucl-trophy-art">
            <Trophy />
            <div>
              <p>LEAGUE PHASE DRAW</p>
              <strong>27 AUGUST 2026</strong>
              <span>36 teams · 8 matches per club · Final in Madrid</span>
            </div>
          </div>
        </section>
        <section className="cinema-section player-spotlight">
          <SectionHead
            number="03"
            title="Player spotlight"
            subtitle="Open a cinematic player dossier"
          />
          <div>
            {[
              "Lionel Messi",
              "Cristiano Ronaldo",
              "Kylian Mbappé",
              "Mohamed Salah",
            ].map((name) => (
              <button key={name} onClick={() => search(name)}>
                <span>{initials(name)}</span>
                <strong>{name}</strong>
                <ChevronRight />
              </button>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function Matches({
  fixtures,
  select,
}: {
  fixtures: Fixture[];
  select: (fixture: Fixture) => void;
}) {
  const [league, setLeague] = useState("all");
  const available = [...new Set(fixtures.map((fixture) => fixture.leagueSlug))];
  const visible = fixtures.filter(
    (fixture) => league === "all" || fixture.leagueSlug === league,
  );
  return (
    <>
      <PageHead
        eyebrow="MATCH CENTER"
        title="Every upcoming match."
        subtitle="Major domestic leagues and UEFA Champions League schedules. Choose any fixture to open its explainable prediction."
      />
      <div className="cinema-filters">
        <button
          className={league === "all" ? "active" : ""}
          onClick={() => setLeague("all")}
        >
          All competitions
        </button>
        {available.map((slug) => (
          <button
            key={slug}
            className={league === slug ? "active" : ""}
            onClick={() => setLeague(slug)}
          >
            {leagueLabels[slug] ||
              fixtures.find((fixture) => fixture.leagueSlug === slug)?.league ||
              slug}
          </button>
        ))}
      </div>
      <div className="cinema-match-list">
        {visible.map((fixture, index) => (
          <motion.button
            key={fixture.id}
            onClick={() => select(fixture)}
            initial={{ opacity: 0, x: -25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(0.35, index * 0.025) }}
          >
            <time>{date(fixture.date)}</time>
            <Team team={fixture.home} />
            <b>VS</b>
            <Team team={fixture.away} />
            <span>{fixture.league}</span>
            <em>
              Model <ChevronRight />
            </em>
          </motion.button>
        ))}
      </div>
      {!visible.length && (
        <div className="cinema-empty">
          <CalendarDays />
          <strong>No published fixtures in this window</strong>
          <span>
            The provider has not published an upcoming match for this
            competition yet.
          </span>
        </div>
      )}
    </>
  );
}

function Players({
  query,
  setQuery,
  players,
  loading,
  select,
}: {
  query: string;
  setQuery: (value: string) => void;
  players: Player[];
  loading: boolean;
  select: (player: Player) => void;
}) {
  return (
    <>
      <PageHead
        eyebrow="PLAYER DATABASE"
        title="Find the player. Know the source."
        subtitle="Current internet profiles appear first. Historical FIFA records are preserved but clearly labeled—never silently mixed."
      />
      <div className="cinema-player-search">
        <Search />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Messi, Ronaldo, club, country…"
        />
        <span>
          {loading
            ? "SEARCHING…"
            : query.length >= 2
              ? `${players.length} RESULTS`
              : "TYPE 2+ CHARACTERS"}
        </span>
      </div>
      {players.length && query.length >= 2 ? (
        <div className="cinema-player-grid">
          {players.map((player, index) => (
            <motion.button
              key={player.id}
              onClick={() => select(player)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(0.4, index * 0.035) }}
            >
              <PlayerVisual player={player} />
              <div>
                <small>
                  {player.dataStatus === "historical archive"
                    ? "HISTORICAL RECORD"
                    : "CURRENT PROFILE"}
                </small>
                <strong>{player.name}</strong>
                <p>
                  {player.position} · {player.team}
                </p>
                <span>{player.nationality}</span>
              </div>
              <ChevronRight />
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="cinema-empty">
          <Users />
          <strong>
            {loading
              ? "Searching verified sources…"
              : "Search for a football player"}
          </strong>
          <span>Profiles include their exact provider and data status.</span>
        </div>
      )}
    </>
  );
}

function ChampionsLeague({ data }: { data: Champions | null }) {
  if (!data)
    return (
      <div className="cinema-empty">
        <Trophy />
        <strong>Loading UEFA competition data…</strong>
      </div>
    );
  return (
    <>
      <section className="champions-hero">
        <div className="star-field">
          {Array.from({ length: 18 }, (_, i) => (
            <i key={i} />
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, x: -35 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <p>
            <Star /> UEFA CHAMPIONS LEAGUE
          </p>
          <h1>
            Road to<strong>Madrid.</strong>
          </h1>
          <span>{data.season} · Europe&apos;s elite club competition</span>
          <a href={data.sourceUrl} target="_blank" rel="noreferrer">
            <ShieldCheck /> Official UEFA source
          </a>
        </motion.div>
        <Trophy />
      </section>
      <section className="champions-format">
        <div>
          <strong>{data.format.leaguePhaseTeams}</strong>
          <span>League phase teams</span>
        </div>
        <div>
          <strong>{data.format.automaticQualifiers}</strong>
          <span>Automatic places</span>
        </div>
        <div>
          <strong>{data.format.playoffQualifiers}</strong>
          <span>Play-off winners</span>
        </div>
        <div>
          <strong>{data.format.leaguePhaseMatchesPerTeam}</strong>
          <span>Matches per club</span>
        </div>
      </section>
      <div className="champions-layout">
        <section className="cinema-section">
          <SectionHead
            number="01"
            title="Upcoming play-offs"
            subtitle={`Verified by UEFA · updated ${data.updatedAt}`}
          />
          <div className="ucl-fixtures">
            {data.upcoming.map((match, index) => (
              <motion.article
                key={match.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06 }}
              >
                <time>
                  {new Intl.DateTimeFormat("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  }).format(new Date(`${match.date}T12:00:00Z`))}
                  <small>{match.publishedTime}</small>
                </time>
                <div>
                  <strong>{match.home}</strong>
                  <b>VS</b>
                  <strong>{match.away}</strong>
                </div>
                <span>{match.path}</span>
              </motion.article>
            ))}
          </div>
        </section>
        <section className="cinema-section ucl-calendar">
          <SectionHead
            number="02"
            title="Competition timeline"
            subtitle="Official 2026/27 milestones"
          />
          <div>
            {data.milestones.map((item, index) => (
              <motion.article
                key={item.label}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.12 }}
              >
                <i />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.date}</small>
                </span>
              </motion.article>
            ))}
          </div>
          <p>
            <ShieldCheck /> Dates are stored with their UEFA attribution and
            never combined with Formula One records.
          </p>
        </section>
      </div>
    </>
  );
}

function Predictions({
  fixtures,
  selected,
  setSelected,
}: {
  fixtures: Fixture[];
  selected: Fixture | null;
  setSelected: (fixture: Fixture) => void;
}) {
  return (
    <FootballPredictionStudio
      fixtures={fixtures}
      selected={selected}
      setSelected={setSelected}
    />
  );
}

function FootballSources() {
  const sources = [
    {
      name: "livescoreFootball",
      role: "Primary fixtures where the provider covers a competition",
      state: "LIVE",
    },
    {
      name: "ESPN soccer",
      role: "Premier League, LaLiga, Bundesliga, Serie A, Ligue 1, Eredivisie, Primeira Liga and UEFA Champions League schedules plus completed-match form",
      state: "LIVE",
    },
    {
      name: "TheSportsDB",
      role: "Current global football player profiles and photography",
      state: "LIVE",
    },
    {
      name: "Fifa.csv",
      role: "Historical player ratings, always labeled as archive data",
      state: "LOCAL",
    },
    {
      name: "UEFA.com",
      role: "Official Champions League calendar, format and play-offs",
      state: "VERIFIED",
    },
  ];
  return (
    <>
      <PageHead
        eyebrow="FOOTBALL DATA"
        title="One sport. Clear provenance."
        subtitle="Independent football providers, archives, competition records and prediction inputs."
      />
      <div className="source-grid">
        {sources.map((source, index) => (
          <motion.article
            key={source.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <Database />
            <div>
              <strong>{source.name}</strong>
              <p>{source.role}</p>
            </div>
            <span>{source.state}</span>
          </motion.article>
        ))}
      </div>
    </>
  );
}

function PlayerModal({ player, close }: { player: Player; close: () => void }) {
  const [picture, setPicture] = useState(player.image || "");
  useEffect(() => {
    if (player.image) return;
    fetch(
      `/api/athlete-image?name=${encodeURIComponent(`${player.name} footballer`)}`,
    )
      .then((r) => r.json())
      .then((body: { url: string }) => setPicture(body.url))
      .catch(() => undefined);
  }, [player.image, player.name]);
  return (
    <motion.div
      className="player-modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={close}
    >
      <motion.article
        className="football-player-modal"
        initial={{ scale: 0.82, y: 70, rotateX: 8 }}
        animate={{ scale: 1, y: 0, rotateX: 0 }}
        exit={{ scale: 0.9, y: 45, opacity: 0 }}
        transition={{ duration: 0.55, ease }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="modal-x"
          onClick={close}
          aria-label="Close player details"
        >
          <X />
        </button>
        <div className="modal-photo">
          {picture ? (
            <img
              src={picture}
              alt={player.name}
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span>{initials(player.name)}</span>
          )}
          <div className="modal-photo-shade" />
          <div className="modal-number">
            {player.shirtNumber || player.rating || player.position.slice(0, 2)}
          </div>
          <div className="modal-scan" />
        </div>
        <div className="modal-info">
          <p
            className={
              player.dataStatus === "historical archive" ? "archive" : "current"
            }
          >
            <ShieldCheck /> {player.dataStatus || "sourced profile"}
          </p>
          <h2>{player.name}</h2>
          <h3>{player.team}</h3>
          <div className="modal-stat-grid">
            <div>
              <span>POSITION</span>
              <strong>{player.position || "Not listed"}</strong>
            </div>
            <div>
              <span>NATIONALITY</span>
              <strong>{player.nationality || "Not listed"}</strong>
            </div>
            <div>
              <span>BORN</span>
              <strong>{player.birthDate || "Not available"}</strong>
            </div>
            <div>
              <span>BIRTHPLACE</span>
              <strong>{player.birthPlace || "Not available"}</strong>
            </div>
            <div>
              <span>HEIGHT / WEIGHT</span>
              <strong>
                {[player.height, player.weight].filter(Boolean).join(" · ") ||
                  "Not available"}
              </strong>
            </div>
            <div>
              <span>SHIRT NUMBER</span>
              <strong>{player.shirtNumber || "Not available"}</strong>
            </div>
            {player.rating && (
              <div>
                <span>ARCHIVE RATING</span>
                <strong>{player.rating}</strong>
              </div>
            )}
          </div>
          {player.description ? (
            <p className="modal-bio">{player.description}</p>
          ) : (
            <p className="modal-bio">
              No verified biography was returned by this provider. VeloStatiq
              leaves unavailable fields empty instead of inventing details.
            </p>
          )}
          <footer>
            <Database />
            <span>Source: {player.source}</span>
          </footer>
        </div>
      </motion.article>
    </motion.div>
  );
}

function SearchPanel({
  players,
  loading,
  select,
}: {
  players: Player[];
  loading: boolean;
  select: (player: Player) => void;
}) {
  return (
    <div className="cinema-search-panel">
      <header>
        <span>FOOTBALL PLAYERS</span>
        <small>
          {loading ? "SEARCHING SOURCES…" : `${players.length} RESULTS`}
        </small>
      </header>
      {players.slice(0, 7).map((player) => (
        <button key={player.id} onClick={() => select(player)}>
          <PlayerVisual player={player} />
          <div>
            <strong>{player.name}</strong>
            <small>
              {player.team} · {player.position}
            </small>
          </div>
          <span>
            {player.dataStatus === "historical archive" ? "ARCHIVE" : "CURRENT"}
          </span>
        </button>
      ))}
      {!loading && !players.length && (
        <p>No sourced player matched that search.</p>
      )}
    </div>
  );
}
function PlayerVisual({ player }: { player: Player }) {
  return player.image ? (
    <img src={player.image} alt="" />
  ) : (
    <span className="cinema-initials">{initials(player.name)}</span>
  );
}
function Stat({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Goal;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <motion.article whileHover={{ y: -5 }}>
      <Icon />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </motion.article>
  );
}
function Team({ team, images = true }: { team: Team; images?: boolean }) {
  return (
    <div className="cinema-team">
      <TeamLogo team={images ? team : { ...team, logo: "" }} />
      <strong>{team.shortName}</strong>
    </div>
  );
}
function TeamLogo({ team }: { team: Team }) {
  return team.logo ? (
    <img
      src={team.logo}
      alt={`${team.name} crest`}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
    />
  ) : (
    <span style={{ background: `#${team.color}` }}>{team.abbreviation}</span>
  );
}
function SectionHead({
  number,
  title,
  subtitle,
  action,
  click,
}: {
  number: string;
  title: string;
  subtitle: string;
  action?: string;
  click?: () => void;
}) {
  return (
    <header className="cinema-section-head">
      <span>{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {action && (
        <button onClick={click}>
          {action}
          <ChevronRight />
        </button>
      )}
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
    <header className="cinema-page-head">
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <span>{subtitle}</span>
    </header>
  );
}
function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
function date(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kathmandu",
  }).format(new Date(value));
}
