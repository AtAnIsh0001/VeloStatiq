/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarDays, ChevronRight, CircleUserRound, Database, Gauge, Home, Menu, Radio, Search, Sparkles, Trophy, Users, X } from "lucide-react";
import CenterLiveMatch from "./CenterLiveMatch";
import BottomThreeConsole from "./BottomThreeConsole";
import WorkspaceView from "./WorkspaceView";
import { fixturePrediction } from "../lib/predictionEngine";
import Image from "next/image";
import Link from "next/link";

type View = "home" | "matches" | "players" | "predictions" | "f1" | "data" | "fantasy";
type Team = { id: string; name: string; shortName: string; abbreviation: string; logo: string; color: string; form: string; strength?: number };
type Fixture = { id: string; league: string; leagueSlug: string; date: string; state: string; status: string; venue: string; home: Team; away: Team; source: string };
type Player = { id: string; name: string; team: string; nationality: string; position: string; image: string | null; birthDate?: string; height?: string; description?: string; rating?: number; source: string };

const navigation: Array<{ id: View; label: string; icon: typeof Home }> = [
  { id: "home", label: "Overview", icon: Home }, { id: "matches", label: "Matches", icon: CalendarDays },
  { id: "players", label: "Players", icon: Users }, { id: "predictions", label: "Predictions", icon: Sparkles },
  { id: "f1", label: "Formula 1", icon: Gauge }, { id: "fantasy", label: "Fantasy", icon: Trophy }, { id: "data", label: "Data sources", icon: Database },
];

export default function FriendlyDashboard() {
  const [view, setView] = useState<View>("home");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [fixtureLoading, setFixtureLoading] = useState(true);
  const [fixtureSource, setFixtureSource] = useState("Connecting…");
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  useEffect(() => {
    fetch("/api/football?type=fixtures&days=21&leagues=eng.1,esp.1")
      .then((response) => response.json())
      .then((body: { fixtures: Fixture[]; source: string }) => { setFixtures(body.fixtures || []); setSelectedFixture(body.fixtures?.[0] || null); setFixtureSource(body.source); })
      .finally(() => setFixtureLoading(false));
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/api/football?type=search&q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((response) => response.json()).then((body: { players: Player[] }) => setPlayers(body.players || []))
        .catch(() => undefined).finally(() => setSearching(false));
    }, 220);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  const navigate = (next: View) => { setView(next); setMobileMenu(false); };
  return <div className="friendly-shell">
    <aside className={`friendly-sidebar ${mobileMenu ? "open" : ""}`}>
      <Link href="/" className="friendly-brand"><Image src="/assets/brand/velostatiq-logo.png" alt="VeloStatiq" width={72} height={48}/><span><strong>VeloStatiq</strong><small>Switch sport</small></span></Link>
      <nav>{navigation.map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => navigate(item.id)}><Icon size={19}/><span>{item.label}</span>{item.id === "matches" && fixtures.length > 0 && <b>{fixtures.length}</b>}</button>; })}</nav>
      <div className="friendly-source"><i/><div><strong>Live data connected</strong><span>{fixtureSource}</span></div></div>
    </aside>
    <main className="friendly-main">
      <header className="friendly-header"><button className="mobile-menu" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Open menu"><Menu/></button><div className="global-search"><Search size={20}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search any football player — try Messi or Ronaldo"/><kbd>⌘ K</kbd>{query.trim().length >= 2 && <SearchResults players={players} loading={searching} onPlayer={(player) => { setSelectedPlayer(player); setQuery(""); }}/>}</div><button className="user-button"><CircleUserRound/><span>Sports fan</span></button></header>
      <div className="friendly-content">
        {view === "home" && <HomeView fixtures={fixtures} loading={fixtureLoading} source={fixtureSource} selected={selectedFixture} onFixture={(fixture) => { setSelectedFixture(fixture); setView("predictions"); }} onSeeAll={() => setView("matches")} onQuickSearch={setQuery}/>} 
        {view === "matches" && <MatchesView fixtures={fixtures} loading={fixtureLoading} onFixture={(fixture) => { setSelectedFixture(fixture); setView("predictions"); }}/>} 
        {view === "players" && <PlayersView query={query} setQuery={setQuery} players={players} searching={searching} onPlayer={setSelectedPlayer}/>} 
        {view === "predictions" && <PredictionsView fixtures={fixtures} selected={selectedFixture} onSelect={setSelectedFixture}/>} 
        {view === "f1" && <F1View/>}
        {view === "data" && <div className="friendly-workspace"><WorkspaceView workspace="archive"/></div>}
        {view === "fantasy" && <div className="friendly-workspace"><WorkspaceView workspace="fantasy"/></div>}
      </div>
    </main>{selectedPlayer && <PlayerDrawer player={selectedPlayer} onClose={() => setSelectedPlayer(null)}/>} 
  </div>;
}

function HomeView({ fixtures, loading, source, selected, onFixture, onSeeAll, onQuickSearch }: { fixtures: Fixture[]; loading: boolean; source: string; selected: Fixture | null; onFixture: (fixture: Fixture) => void; onSeeAll: () => void; onQuickSearch: (query: string) => void }) {
  const today = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  return <><section className="welcome-row"><div><p>{today}</p><h1>Your sports, clearly explained.</h1><span>Upcoming games, player profiles, and transparent predictions in one place.</span></div><div className="live-pill"><Radio size={15}/><span>{source === "offline cache" ? "Cached schedule" : "Live internet data"}</span></div></section><section className="friendly-stats"><div><span>UPCOMING</span><strong>{fixtures.length}</strong><small>matches loaded</small></div><div><span>LEAGUES</span><strong>2</strong><small>Premier League · LaLiga</small></div><div><span>PLAYER RECORDS</span><strong>20K+</strong><small>plus internet search</small></div><div><span>MODEL</span><strong>100%</strong><small>explainable</small></div></section><section className="content-section"><SectionTitle title="Coming up" subtitle="Live schedules from England and Spain" action="View all matches" onAction={onSeeAll}/><div className="fixture-grid">{loading ? <LoadingCards/> : fixtures.slice(0, 6).map((fixture) => <FixtureCard fixture={fixture} key={fixture.id} onClick={() => onFixture(fixture)}/>)}</div></section><div className="home-lower"><section className="content-section prediction-preview"><SectionTitle title="Prediction spotlight" subtitle="Tap a match to update the model"/>{selected ? <PredictionCard fixture={selected}/> : <EmptyMatches/>}</section><section className="content-section quick-find"><SectionTitle title="Popular player searches" subtitle="Local archive + free internet data"/><div>{["Lionel Messi","Cristiano Ronaldo","Kylian Mbappé","Mohamed Salah","Lamine Yamal","Erling Haaland"].map((name) => <button key={name} onClick={() => onQuickSearch(name)}><span>{name.split(" ").map((part) => part[0]).join("").slice(0,2)}</span>{name}<ChevronRight size={17}/></button>)}</div></section></div></>;
}

function MatchesView({ fixtures, loading, onFixture }: { fixtures: Fixture[]; loading: boolean; onFixture: (fixture: Fixture) => void }) { const [league, setLeague] = useState("all"); const filtered = fixtures.filter((fixture) => league === "all" || fixture.leagueSlug === league); const groups = groupFixtures(filtered); return <><PageTitle title="Upcoming matches" subtitle="Real schedules from the internet, refreshed every 15 minutes"/><div className="friendly-filters"><button className={league === "all" ? "active" : ""} onClick={() => setLeague("all")}>All leagues</button><button className={league === "eng.1" ? "active" : ""} onClick={() => setLeague("eng.1")}>Premier League</button><button className={league === "esp.1" ? "active" : ""} onClick={() => setLeague("esp.1")}>LaLiga</button></div>{loading ? <LoadingCards/> : <div className="fixture-days">{Object.entries(groups).map(([date, matches]) => <section key={date}><h2>{date}</h2>{matches.map((fixture) => <FixtureRow fixture={fixture} key={fixture.id} onClick={() => onFixture(fixture)}/>)}</section>)}</div>}</>; }
function PlayersView({ query, setQuery, players, searching, onPlayer }: { query: string; setQuery: (value: string) => void; players: Player[]; searching: boolean; onPlayer: (player: Player) => void }) { return <><PageTitle title="Find any player" subtitle="Searches 20,000+ local records and a free global internet catalog"/><div className="player-search-hero"><Search/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Type a player name, club, or nationality"/><span>{searching ? "Searching…" : query.length >= 2 ? `${players.length} found` : "Try: Ronaldo"}</span></div>{players.length ? <div className="player-grid">{players.map((player) => <PlayerCard player={player} key={player.id} onClick={() => onPlayer(player)}/>)}</div> : <div className="player-empty"><Users/><strong>{query.length >= 2 && !searching ? "No matching players" : "Start with a name"}</strong><span>Results combine your local database with current internet profiles.</span></div>}</>; }
function PredictionsView({ fixtures, selected, onSelect }: { fixtures: Fixture[]; selected: Fixture | null; onSelect: (fixture: Fixture) => void }) { return <><PageTitle title="Match predictions" subtitle="Simple probabilities with every input shown — no black box"/><div className="prediction-layout"><aside><h3>Choose a match</h3>{fixtures.slice(0, 18).map((fixture) => <button key={fixture.id} className={selected?.id === fixture.id ? "active" : ""} onClick={() => onSelect(fixture)}><TeamLogo team={fixture.home}/><span><strong>{fixture.home.shortName} vs {fixture.away.shortName}</strong><small>{formatFixtureDate(fixture.date)}</small></span><ChevronRight/></button>)}</aside><section>{selected ? <PredictionCard fixture={selected} detailed/> : <EmptyMatches/>}</section></div></>; }
function F1View() { return <><PageTitle title="Formula 1 center" subtitle="OpenF1 telemetry and the VeloStatiq spatial race console"/><div className="friendly-f1"><CenterLiveMatch mode="f1"/><BottomThreeConsole mode="f1"/></div></>; }

function SearchResults({ players, loading, onPlayer }: { players: Player[]; loading: boolean; onPlayer: (player: Player) => void }) { return <div className="global-results"><div className="result-label"><span>PLAYERS</span><small>{loading ? "Searching internet…" : `${players.length} results`}</small></div>{players.slice(0, 7).map((player) => <button key={player.id} onClick={() => onPlayer(player)}><PlayerImage player={player}/><span><strong>{player.name}</strong><small>{player.team} · {player.position}</small></span><em>{player.source.includes("local") ? "LOCAL" : "WEB"}</em></button>)}{!loading && !players.length && <p>No player found. Try a full or common name.</p>}</div>; }
function FixtureCard({ fixture, onClick }: { fixture: Fixture; onClick: () => void }) { return <button className="fixture-card" onClick={onClick}><div><span>{fixture.league}</span><time>{formatFixtureDate(fixture.date)}</time></div><div className="fixture-teams"><div><TeamLogo team={fixture.home}/><strong>{fixture.home.shortName}</strong></div><b>VS</b><div><TeamLogo team={fixture.away}/><strong>{fixture.away.shortName}</strong></div></div><footer><span>{fixture.venue}</span><em>See prediction <ChevronRight size={14}/></em></footer></button>; }
function FixtureRow({ fixture, onClick }: { fixture: Fixture; onClick: () => void }) { return <button className="fixture-row" onClick={onClick}><time>{new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(fixture.date))}</time><div><TeamLogo team={fixture.home}/><strong>{fixture.home.name}</strong></div><b>vs</b><div><TeamLogo team={fixture.away}/><strong>{fixture.away.name}</strong></div><span>{fixture.league}</span><em>Prediction <ChevronRight/></em></button>; }

function PredictionCard({ fixture, detailed = false }: { fixture: Fixture; detailed?: boolean }) { const result = useMemo(() => predictFixture(fixture), [fixture]); const top = [[fixture.home.name, result.home], ["Draw", result.draw], [fixture.away.name, result.away]].sort((a,b) => Number(b[1]) - Number(a[1]))[0]; return <article className={`friendly-prediction ${detailed ? "detailed" : ""}`}><div className="prediction-match"><div><TeamLogo team={fixture.home}/><strong>{fixture.home.name}</strong><span>{fixture.home.form || "Form unavailable"}</span></div><div><Sparkles/><b>{Math.round(Number(top[1]) * 100)}%</b><small>{top[0]} is most likely</small></div><div><TeamLogo team={fixture.away}/><strong>{fixture.away.name}</strong><span>{fixture.away.form || "Form unavailable"}</span></div></div><div className="probability-bars"><div><span>{fixture.home.name} win <b>{Math.round(result.home * 100)}%</b></span><i><em style={{ width: `${result.home * 100}%` }}/></i></div><div><span>Draw <b>{Math.round(result.draw * 100)}%</b></span><i><em style={{ width: `${result.draw * 100}%` }}/></i></div><div><span>{fixture.away.name} win <b>{Math.round(result.away * 100)}%</b></span><i><em style={{ width: `${result.away * 100}%` }}/></i></div></div>{detailed && <div className="prediction-explained"><h3>Why this prediction?</h3><div><Factor label={`${fixture.home.name} recent form`} value={result.inputs.homeForm}/><Factor label={`${fixture.away.name} recent form`} value={result.inputs.awayForm}/><Factor label={`${fixture.home.name} home-ground advantage`} value={result.inputs.homeAdvantage}/><Factor label="Squad strength gap" value={(result.inputs.squadStrengthDelta + 1) / 2}/></div><p><Activity/> Calculated only with linear weighted scores and sigmoid activation. Probabilities are estimates, not betting advice.</p></div>}</article>; }

function PlayerCard({ player, onClick }: { player: Player; onClick: () => void }) { return <button className="player-card" onClick={onClick}><PlayerImage player={player}/><div><strong>{player.name}</strong><span>{player.position}</span><p>{player.team}</p></div><em>{player.rating ? `${player.rating} OVR` : player.nationality}</em></button>; }
function PlayerDrawer({ player, onClose }: { player: Player; onClose: () => void }) { return <div className="drawer-backdrop" onMouseDown={onClose}><aside className="player-drawer" onMouseDown={(event) => event.stopPropagation()}><button className="drawer-close" onClick={onClose}><X/></button><PlayerImage player={player}/><div className="player-title"><span>{player.position}</span><h2>{player.name}</h2><p>{player.team}</p></div><dl><div><dt>Nationality</dt><dd>{player.nationality}</dd></div><div><dt>Born</dt><dd>{player.birthDate || "Not available"}</dd></div><div><dt>Height</dt><dd>{player.height || "Not available"}</dd></div><div><dt>Rating</dt><dd>{player.rating || "—"}</dd></div></dl>{player.description && <p className="player-bio">{player.description}</p>}<footer><Database/><span>Source: {player.source}</span></footer></aside></div>; }
function PlayerImage({ player }: { player: Player }) { return player.image ? <img src={player.image} alt=""/> : <span className="player-initials">{player.name.split(" ").map((part) => part[0]).join("").slice(0,2)}</span>; }
function TeamLogo({ team }: { team: Team }) { return team.logo ? <img src={team.logo} alt={`${team.name} crest`}/> : <span className="team-initials" style={{ background: `#${team.color}` }}>{team.abbreviation}</span>; }
function Factor({ label, value }: { label: string; value: number }) { return <div><span>{label}<b>{Math.round(value * 100)}%</b></span><i><em style={{ width: `${Math.max(4, Math.min(100, value * 100))}%` }}/></i></div>; }
function SectionTitle({ title, subtitle, action, onAction }: { title: string; subtitle: string; action?: string; onAction?: () => void }) { return <div className="section-title"><div><h2>{title}</h2><p>{subtitle}</p></div>{action && <button onClick={onAction}>{action}<ChevronRight/></button>}</div>; }
function PageTitle({ title, subtitle }: { title: string; subtitle: string }) { return <div className="page-title"><div><p>VELOSTATIQ FOOTBALL</p><h1>{title}</h1><span>{subtitle}</span></div></div>; }
function LoadingCards() { return <>{[1,2,3].map((item) => <div className="friendly-skeleton" key={item}/>)}</>; }
function EmptyMatches() { return <div className="empty-matches"><CalendarDays/><strong>No upcoming match selected</strong><span>Choose a fixture to see the prediction.</span></div>; }
function formScore(form: string) { const values: number[] = [...form].map((value) => value === "W" ? 1 : value === "D" ? .5 : 0); return values.length ? values.reduce((sum,value) => sum + value, 0) / values.length : .5; }
function predictFixture(fixture: Fixture) { return fixturePrediction({ homeForm: formScore(fixture.home.form), awayForm: formScore(fixture.away.form), homeAdvantage: .72, squadStrengthDelta: (fixture.home.strength ?? .75) - (fixture.away.strength ?? .75) }); }
function formatFixtureDate(date: string) { return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(date)); }
function groupFixtures(fixtures: Fixture[]) { return fixtures.reduce<Record<string, Fixture[]>>((groups, fixture) => { const key = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date(fixture.date)); (groups[key] ||= []).push(fixture); return groups; }, {}); }
