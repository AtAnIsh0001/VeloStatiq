"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, ArrowRight, Database, Gauge, Search, Server, ShieldCheck, Trophy, Users } from "lucide-react";
import { f1WinProbability, footballWinProbability } from "../lib/predictionEngine";

export type Workspace = "command" | "intelligence" | "athletes" | "archive" | "fantasy";

type DatabaseAthlete = { id: string; sport: "football" | "f1"; name: string; nationality: string; role: string; team: string; number: string; rating: number; potential: number; source: string };
type Collection = { id: string; label: string; path: string; records: number; files: number; bytes: number };
type EspnResult = { connected: boolean; configured: boolean; message?: string; leagueId?: number | null; seasonId?: number; fetchedAt?: string; data: unknown };

export default function WorkspaceView({ workspace }: { workspace: Exclude<Workspace, "command"> }) {
  if (workspace === "athletes") return <AthletesWorkspace />;
  if (workspace === "archive") return <ArchiveWorkspace />;
  if (workspace === "fantasy") return <FantasyWorkspace />;
  return <IntelligenceWorkspace />;
}

function IntelligenceWorkspace() {
  const [openF1, setOpenF1] = useState<{ source?: string; laps?: unknown[] } | null>(null);
  useEffect(() => { fetch("/api/openf1").then((response) => response.json()).then(setOpenF1).catch(() => setOpenF1({ source: "local" })); }, []);
  const football = footballWinProbability({ possession: 54, shotQuality: .73, fitness: 84, recentForm: .71 });
  const f1 = f1WinProbability({ paceDelta: 1.12, tyreLife: 72, trackPosition: 1, consistency: 96 });
  return <div className="workspace-view">
    <WorkspaceHeader index="02" title="INTELLIGENCE CORE" subtitle="Transparent models and source diagnostics" />
    <div className="workspace-cards models-grid">
      <article className="workspace-card"><div className="card-icon"><Gauge/></div><p>FOOTBALL WIN MODEL</p><strong>{Math.round(football * 100)}%</strong><span>Manchester advantage</span><code>σ(Σ wᵢxᵢ + b)</code><small>Possession · shot quality · fitness · form</small></article>
      <article className="workspace-card"><div className="card-icon"><Activity/></div><p>F1 WIN MODEL</p><strong>{Math.round(f1 * 100)}%</strong><span>Verstappen probability</span><code>σ(Σ wᵢxᵢ + b)</code><small>Pace delta · tyre life · position · consistency</small></article>
      <article className="workspace-card source-diagnostic"><div className="card-icon"><Server/></div><p>OPENF1 PIPELINE</p><strong>{openF1?.source === "openf1" ? "ONLINE" : "CACHE"}</strong><span>{openF1?.laps?.length ?? 0} Monaco lap records</span><div className="diagnostic-line"><i className={openF1?.source === "openf1" ? "online" : ""}/><b>API V1</b><em>HEALTHY</em></div><small>Historical telemetry · 1 hour cache</small></article>
    </div>
    <section className="glass-panel formula-panel"><div className="mini-heading"><span>MODEL CONSTRAINTS</span><ShieldCheck size={14}/></div><div><p>Every probability shown in VeloStatiq is reproducible from a linear weighted score followed by sigmoid activation.</p><pre>z = w₁x₁ + w₂x₂ + … + b{"\n"}probability = 1 / (1 + e⁻ᶻ)</pre><span>No neural networks · no trees · no hidden external ML services</span></div></section>
  </div>;
}

function AthletesWorkspace() {
  const [query, setQuery] = useState(""); const [sport, setSport] = useState("all"); const [results, setResults] = useState<DatabaseAthlete[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { const controller = new AbortController(); const timer = setTimeout(() => { setLoading(true); fetch(`/api/database?view=athletes&sport=${sport}&query=${encodeURIComponent(query)}&limit=48`, { signal: controller.signal }).then((response) => response.json()).then((body: { results: DatabaseAthlete[] }) => setResults(body.results)).finally(() => setLoading(false)); }, 180); return () => { clearTimeout(timer); controller.abort(); }; }, [query, sport]);
  return <div className="workspace-view"><WorkspaceHeader index="03" title="ATHLETE DATABASE" subtitle="20,532 indexed records from the local SSD archive" />
    <div className="database-toolbar"><label><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, team, country, or role…"/></label><div><button className={sport === "all" ? "active" : ""} onClick={() => setSport("all")}>ALL</button><button className={sport === "football" ? "active" : ""} onClick={() => setSport("football")}>FOOTBALL</button><button className={sport === "f1" ? "active" : ""} onClick={() => setSport("f1")}>F1</button></div><span>{loading ? "QUERYING…" : `${results.length} RESULTS`}</span></div>
    <section className="glass-panel data-table"><div className="data-table-head"><span>ATHLETE</span><span>ROLE</span><span>TEAM</span><span>NATIONALITY</span><span>RATING</span><span>SOURCE</span></div>{results.map((athlete) => <div className="data-table-row" key={athlete.id}><strong><i className={athlete.sport}/>{athlete.name}</strong><span>{athlete.role}</span><span>{athlete.team || "—"}</span><span>{athlete.nationality}</span><b>{athlete.rating || "—"}</b><code>{athlete.source}</code></div>)}</section>
  </div>;
}

function ArchiveWorkspace() {
  const [catalog, setCatalog] = useState<{ records: number; generatedAt: string; collections: Collection[] } | null>(null);
  useEffect(() => { fetch("/api/database?view=catalog").then((response) => response.json()).then(setCatalog); }, []);
  return <div className="workspace-view"><WorkspaceHeader index="04" title="DATA ARCHIVE" subtitle="All sports data organized under DataBase/" />
    <div className="archive-summary"><div><Database/><span>TOTAL SEARCH RECORDS</span><strong>{catalog?.records.toLocaleString() ?? "—"}</strong></div><div><Server/><span>COLLECTIONS</span><strong>{catalog?.collections.length ?? "—"}</strong></div><div><ShieldCheck/><span>INDEX GENERATED</span><strong>{catalog ? new Date(catalog.generatedAt).toLocaleDateString() : "—"}</strong></div></div>
    <section className="archive-list">{catalog?.collections.map((collection) => <article className="glass-panel" key={collection.id}><div className="collection-icon"><Database/></div><div><p>{collection.label}</p><code>DataBase/{collection.path}/</code></div><dl><div><dt>RECORDS</dt><dd>{collection.records.toLocaleString()}</dd></div><div><dt>FILES</dt><dd>{collection.files.toLocaleString()}</dd></div><div><dt>SIZE</dt><dd>{formatBytes(collection.bytes)}</dd></div></dl><ArrowRight/></article>)}</section>
  </div>;
}

function FantasyWorkspace() {
  const [leagueId, setLeagueId] = useState(""); const [season, setSeason] = useState("2025"); const [week, setWeek] = useState("1"); const [action, setAction] = useState("league"); const [result, setResult] = useState<EspnResult | null>(null); const [loading, setLoading] = useState(false);
  const load = () => { setLoading(true); fetch(`/api/espn?action=${action}&leagueId=${encodeURIComponent(leagueId)}&seasonId=${season}&week=${week}`).then((response) => response.json()).then(setResult).finally(() => setLoading(false)); };
  const rows = useMemo(() => Array.isArray(result?.data) ? result.data.slice(0, 24) : result?.data && typeof result.data === "object" ? [result.data] : [], [result]);
  return <div className="workspace-view"><WorkspaceHeader index="05" title="ESPN FANTASY FOOTBALL" subtitle="NFL fantasy league intelligence via ESPN API v3" />
    <section className="glass-panel espn-connect"><div className="espn-brand"><Trophy/><div><strong>ESPN LEAGUE LINK</strong><span>Public league ID or private server credentials</span></div></div><label>LEAGUE ID<input value={leagueId} onChange={(event) => setLeagueId(event.target.value.replace(/\D/g, ""))} placeholder="e.g. 123456" inputMode="numeric"/></label><label>SEASON<input value={season} onChange={(event) => setSeason(event.target.value.replace(/\D/g, ""))}/></label><label>WEEK<input value={week} onChange={(event) => setWeek(event.target.value.replace(/\D/g, ""))}/></label><button onClick={load} disabled={loading}>{loading ? "CONNECTING…" : "CONNECT"}</button></section>
    <div className="espn-actions">{[["league","LEAGUE"],["teams","TEAMS"],["boxscores","BOX SCORES"],["freeAgents","FREE AGENTS"],["draft","DRAFT"]].map(([value,label]) => <button key={value} onClick={() => setAction(value)} className={action === value ? "active" : ""}>{label}</button>)}</div>
    {!result && <section className="glass-panel empty-state"><Users/><strong>Connect an ESPN fantasy league</strong><span>Private leagues require ESPN_S2 and ESPN_SWID in the server environment. Credentials never enter the browser or DataBase.</span></section>}
    {result && !result.connected && <section className="glass-panel connection-error"><AlertCircle/><div><strong>ESPN CONNECTION NEEDS ATTENTION</strong><span>{result.message}</span></div></section>}
    {result?.connected && <section className="glass-panel espn-results"><div className="mini-heading"><span>{action.toUpperCase()} · LEAGUE {result.leagueId}</span><small>ESPN LIVE RESPONSE</small></div>{rows.map((row, index) => <ObjectCard value={row as Record<string, unknown>} key={index}/>)}</section>}
  </div>;
}

function ObjectCard({ value }: { value: Record<string, unknown> }) { const entries = Object.entries(value).filter(([, item]) => ["string","number","boolean"].includes(typeof item)).slice(0, 8); return <article className="object-card">{entries.map(([key,item]) => <div key={key}><span>{key.replace(/([A-Z])/g, " $1")}</span><strong>{String(item)}</strong></div>)}</article>; }
function WorkspaceHeader({ index, title, subtitle }: { index: string; title: string; subtitle: string }) { return <div className="workspace-header"><span>{index}</span><div><h1>{title}</h1><p>{subtitle}</p></div></div>; }
function formatBytes(bytes: number) { if (!bytes) return "—"; const unit = bytes > 1e9 ? "GB" : bytes > 1e6 ? "MB" : "KB"; const divisor = bytes > 1e9 ? 1e9 : bytes > 1e6 ? 1e6 : 1e3; return `${(bytes / divisor).toFixed(1)} ${unit}`; }
