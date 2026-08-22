/* eslint-disable @next/next/no-img-element */
"use client";

import { motion } from "framer-motion";
import { Activity, AlertCircle, BarChart3, CheckCircle2, ChevronRight, Database, Home, Info, ShieldCheck, Sparkles, Target, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fixturePrediction, FOOTBALL_MODEL_WEIGHTS } from "../lib/predictionEngine";

type Team = { id: string; name: string; shortName: string; abbreviation: string; logo: string; color: string; form: string; strength?: number };
export type PredictionFixture = { id: string; league: string; leagueSlug: string; date: string; venue: string; home: Team; away: Team; source: string };
type MatchRecord = { id: string; date: string; competition: string; venue: string; wasHome: boolean; team: Team; opponent: Team; teamScore: number; opponentScore: number; result: "W" | "D" | "L"; status: string; source: string };
type Metrics = { played: number; wins: number; draws: number; losses: number; points: number; pointsPerGame: number; goalsFor: number; goalsAgainst: number; goalDifference: number; averageGoalsFor: number; averageGoalsAgainst: number; cleanSheets: number; scoringMatches: number; formScore: number };
type TeamAnalysis = { team: Team; matches: MatchRecord[]; metrics: Metrics };
type FixtureAnalysis = { fixtureId: string; fetchedAt: string; source: string; cutoffDate: string; home: TeamAnalysis; away: TeamAnalysis; dataCoverage: { homeMatches: number; awayMatches: number; complete: boolean } };

const ease = [0.16, 1, 0.3, 1] as const;

export default function FootballPredictionStudio({ fixtures, selected, setSelected }: { fixtures: PredictionFixture[]; selected: PredictionFixture | null; setSelected: (fixture: PredictionFixture) => void }) {
  const [request, setRequest] = useState<{ fixtureId: string; analysis: FixtureAnalysis | null; error: string }>({ fixtureId: "", analysis: null, error: "" });
  const [competition,setCompetition]=useState(selected?.leagueSlug || "all");
  const competitions=useMemo(()=>[...new Map(fixtures.map((fixture)=>[fixture.leagueSlug,fixture.league])).entries()],[fixtures]);
  const visibleFixtures=competition==="all"?fixtures:fixtures.filter((fixture)=>fixture.leagueSlug===competition);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    const query = new URLSearchParams({
      type: "analysis", fixtureId: selected.id, league: selected.leagueSlug, date: selected.date,
      homeId: selected.home.id, homeName: selected.home.name, homeShort: selected.home.shortName, homeAbbr: selected.home.abbreviation,
      homeLogo: selected.home.logo, homeStrength: String(selected.home.strength ?? .75),
      awayId: selected.away.id, awayName: selected.away.name, awayShort: selected.away.shortName, awayAbbr: selected.away.abbreviation,
      awayLogo: selected.away.logo, awayStrength: String(selected.away.strength ?? .75),
    });
    fetch(`/api/football?${query}`, { signal: controller.signal })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "History unavailable"); return body as FixtureAnalysis; })
      .then((analysis) => setRequest({ fixtureId: selected.id, analysis, error: "" }))
      .catch((caught: Error) => { if (caught.name !== "AbortError") setRequest({ fixtureId: selected.id, analysis: null, error: caught.message }); });
    return () => controller.abort();
  }, [selected]);

  const currentRequest = selected && request.fixtureId === selected.id ? request : null;
  const analysis = currentRequest?.analysis || null;
  const error = currentRequest?.error || "";
  const loading = Boolean(selected && !currentRequest);

  return <>
    <header className="football-analysis-head">
      <div><p><Sparkles/> PREDICTION STUDIO</p><h1>Evidence before outcome.</h1><span>Compare both teams&apos; five latest completed games, then see exactly how the forecast was calculated.</span></div>
      {selected && <div className="analysis-viewing"><span>YOU ARE VIEWING</span><strong>{selected.home.name} <em>vs</em> {selected.away.name}</strong><small>{selected.league} · {matchDate(selected.date)}</small></div>}
    </header>
    <div className="football-analysis-layout">
      <aside className="analysis-fixture-picker"><span>SELECT A COMPETITION</span><select value={competition} onChange={(event)=>setCompetition(event.target.value)}><option value="all">All major competitions</option>{competitions.map(([slug,name])=><option key={slug} value={slug}>{name}</option>)}</select><span>SELECT A MATCH · {visibleFixtures.length}</span>{visibleFixtures.map((fixture) => <button key={fixture.id} className={selected?.id === fixture.id ? "active" : ""} onClick={() => setSelected(fixture)}><TeamLogo team={fixture.home}/><div><strong>{fixture.home.shortName}</strong><small>vs {fixture.away.shortName}</small><time>{shortDate(fixture.date)} · {fixture.league}</time></div><TeamLogo team={fixture.away}/><ChevronRight/></button>)}{!visibleFixtures.length&&<p className="no-history">No fixture has been published in the current 45-day window.</p>}</aside>
      <section className="analysis-workspace">
        {!selected && <Empty icon={Target} title="Choose a match" text="Select a future fixture to load both teams' latest completed games."/>}
        {selected && loading && <AnalysisLoading home={selected.home} away={selected.away}/>}
        {selected && error && <Empty icon={AlertCircle} title="History could not load" text={`${error} The prediction is hidden because VeloStatiq will not invent missing match evidence.`}/>} 
        {selected && analysis && <PredictionReport fixture={selected} analysis={analysis}/>} 
      </section>
    </div>
  </>;
}

function PredictionReport({ fixture, analysis }: { fixture: PredictionFixture; analysis: FixtureAnalysis }) {
  const result = useMemo(() => {
    const homeGoalRate = analysis.home.metrics.played ? analysis.home.metrics.goalDifference / analysis.home.metrics.played : 0;
    const awayGoalRate = analysis.away.metrics.played ? analysis.away.metrics.goalDifference / analysis.away.metrics.played : 0;
    return fixturePrediction({
      homeForm: analysis.home.metrics.formScore, awayForm: analysis.away.metrics.formScore, homeAdvantage: .72,
      squadStrengthDelta: (fixture.home.strength ?? .75) - (fixture.away.strength ?? .75),
      goalDifferenceDelta: clamp((homeGoalRate - awayGoalRate) / 4, -1, 1),
    });
  }, [analysis, fixture]);
  const outcomes = [{ key: "home", label: `${fixture.home.name} win`, value: result.home }, { key: "draw", label: "Draw", value: result.draw }, { key: "away", label: `${fixture.away.name} win`, value: result.away }];
  const top = [...outcomes].sort((a, b) => b.value - a.value)[0];
  const confidence = analysis.dataCoverage.complete ? Math.round(62 + (top.value - outcomes[1].value) * 30) : Math.round(analysis.home.metrics.played + analysis.away.metrics.played) * 5;
  const chartData = [
    { metric: "Points", [fixture.home.shortName]: analysis.home.metrics.points, [fixture.away.shortName]: analysis.away.metrics.points },
    { metric: "Goals", [fixture.home.shortName]: analysis.home.metrics.goalsFor, [fixture.away.shortName]: analysis.away.metrics.goalsFor },
    { metric: "Conceded", [fixture.home.shortName]: analysis.home.metrics.goalsAgainst, [fixture.away.shortName]: analysis.away.metrics.goalsAgainst },
    { metric: "Clean sheets", [fixture.home.shortName]: analysis.home.metrics.cleanSheets, [fixture.away.shortName]: analysis.away.metrics.cleanSheets },
  ];
  const reasons = buildReasons(fixture, analysis);

  return <motion.div key={fixture.id} initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55, ease }}>
    <section className="analysis-forecast-card">
      <div className="forecast-teams"><TeamIdentity team={fixture.home}/><div><small>MODEL&apos;S LEADING OUTCOME</small><Sparkles/><strong>{Math.round(top.value * 100)}%</strong><span>{top.label}</span><em>{confidence}% evidence confidence</em></div><TeamIdentity team={fixture.away}/></div>
      <div className="forecast-probabilities">{outcomes.map((outcome, index) => <div key={outcome.key}><span>{outcome.label}<b>{Math.round(outcome.value * 100)}%</b></span><i><motion.em initial={{ width: 0 }} animate={{ width: `${outcome.value * 100}%` }} transition={{ duration: 1, delay: index * .12, ease }}/></i></div>)}</div>
      <p className="forecast-boundary"><Info/> This is a team-level forecast for <strong>{fixture.home.name} vs {fixture.away.name}</strong>. It does not predict an individual player and is not betting advice.</p>
    </section>

    <section className="analysis-block">
      <BlockTitle icon={Activity} eyebrow="RECORDED EVIDENCE" title="All five latest games" text={`Completed league, cup, European and friendly matches before ${matchDate(fixture.date)} are included. Newest appears first.`}/>
      <div className="last-five-grid"><TeamHistory side="HOME TEAM" analysis={analysis.home}/><TeamHistory side="AWAY TEAM" analysis={analysis.away}/></div>
    </section>

    <section className="analysis-block">
      <BlockTitle icon={BarChart3} eyebrow="SIDE-BY-SIDE" title="Five-game comparison" text="Bars show observed totals from the match cards above—not predicted values."/>
      <div className="analysis-comparison-grid"><div className="analysis-chart"><ResponsiveContainer width="100%" height={320}><BarChart data={chartData} margin={{ top: 15, right: 12, left: -14, bottom: 0 }}><CartesianGrid stroke="rgba(255,255,255,.08)" vertical={false}/><XAxis dataKey="metric" tick={{ fill: "#aeb8c8", fontSize: 13 }} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{ fill: "#748096", fontSize: 13 }} axisLine={false} tickLine={false}/><Tooltip contentStyle={{ background: "rgba(5,10,18,.96)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 14 }}/><Legend/><Bar dataKey={fixture.home.shortName} fill="#2ee6a6" radius={[8,8,0,0]}/><Bar dataKey={fixture.away.shortName} fill="#4ea1ff" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer></div><MetricTable fixture={fixture} analysis={analysis}/></div>
    </section>

    <section className="analysis-block">
      <BlockTitle icon={TrendingUp} eyebrow="PLAIN-LANGUAGE REASONS" title="Why the model chose this outcome" text="Each reason is generated from the visible five-game evidence and the selected fixture context."/>
      <div className="analysis-reasons">{reasons.map((reason, index) => <motion.article key={reason.title} initial={{ opacity: 0, x: -18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: index * .08 }}><b>{String(index + 1).padStart(2, "0")}</b><div><strong>{reason.title}</strong><p>{reason.text}</p></div><span className={reason.edge}>{reason.value}</span></motion.article>)}</div>
    </section>

    <section className="analysis-block methodology-block">
      <BlockTitle icon={ShieldCheck} eyebrow="HOW IT IS CONDUCTED" title="The complete calculation" text="No hidden AI prompt and no Formula One data. The same fixed calculation runs for every football team."/>
      <div className="method-steps"><MethodStep n="1" title="Collect" text="Request each club's completed schedule, remove games after the selected fixture, sort newest first, and keep five."/><MethodStep n="2" title="Measure" text="Turn wins/draws/losses into points, then calculate form, goals scored, goals conceded, goal difference and clean sheets."/><MethodStep n="3" title="Score" text="Apply the fixed weights below to home-win, draw and away-win scores. Positive and negative evidence shifts each score."/><MethodStep n="4" title="Calibrate" text="Pass each score through a sigmoid curve, then normalize the three values so they add to exactly 100%."/></div>
      <div className="model-inputs"><ModelInput name="Home recent form" value={result.inputs.homeForm} detail={`${analysis.home.metrics.points} of ${analysis.home.metrics.played * 3} possible points`} weight={FOOTBALL_MODEL_WEIGHTS.home.homeForm}/><ModelInput name="Away recent form" value={result.inputs.awayForm} detail={`${analysis.away.metrics.points} of ${analysis.away.metrics.played * 3} possible points`} weight={FOOTBALL_MODEL_WEIGHTS.away.awayForm}/><ModelInput name="Home advantage" value={result.inputs.homeAdvantage} detail="Fixed contextual input for the listed home club" weight={FOOTBALL_MODEL_WEIGHTS.home.homeAdvantage}/><ModelInput name="Squad strength gap" value={result.inputs.squadStrengthDelta} detail="Difference between archived squad-rating summaries" weight={FOOTBALL_MODEL_WEIGHTS.home.squadStrengthDelta}/><ModelInput name="Goal-difference gap" value={result.inputs.goalDifferenceDelta} detail="Normalized per-game goal-difference comparison" weight={FOOTBALL_MODEL_WEIGHTS.home.goalDifferenceDelta}/></div>
      <div className="analysis-provenance"><Database/><div><strong>Source: {analysis.source}</strong><span>Retrieved {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(analysis.fetchedAt))} · {analysis.dataCoverage.homeMatches + analysis.dataCoverage.awayMatches} completed matches used</span></div>{analysis.dataCoverage.complete ? <em><CheckCircle2/> COMPLETE 5 + 5</em> : <em className="partial"><AlertCircle/> PARTIAL HISTORY</em>}</div>
    </section>
  </motion.div>;
}

function TeamHistory({ side, analysis }: { side: string; analysis: TeamAnalysis }) {
  return <article className="team-history"><header><TeamIdentity team={analysis.team}/><div><span>{side} · LAST {analysis.matches.length}</span><strong>{analysis.metrics.wins}W · {analysis.metrics.draws}D · {analysis.metrics.losses}L</strong><small>{analysis.metrics.points} points · {analysis.metrics.goalsFor} scored · {analysis.metrics.goalsAgainst} conceded</small></div></header><div className="form-ribbon">{analysis.matches.map((match) => <i key={match.id} className={match.result.toLowerCase()}>{match.result}</i>)}</div><div className="history-list">{analysis.matches.map((match, index) => <motion.div key={match.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * .06 }}><time>{compactDate(match.date)}</time><span className={`result ${match.result.toLowerCase()}`}>{match.result}</span><span className="ground">{match.wasHome ? <><Home/> HOME</> : "AWAY"}</span><TeamLogo team={match.opponent}/><strong>{match.opponent.shortName}</strong><b>{match.teamScore}–{match.opponentScore}</b><small title={`${match.competition} · ${match.venue}`}>{match.competition} · {match.venue}</small></motion.div>)}</div>{!analysis.matches.length && <p className="no-history">No completed matches were returned before this fixture.</p>}</article>;
}

function MetricTable({ fixture, analysis }: { fixture: PredictionFixture; analysis: FixtureAnalysis }) {
  const rows: Array<[string, string | number, string | number]> = [["Matches", analysis.home.metrics.played, analysis.away.metrics.played],["Wins", analysis.home.metrics.wins, analysis.away.metrics.wins],["Draws", analysis.home.metrics.draws, analysis.away.metrics.draws],["Losses", analysis.home.metrics.losses, analysis.away.metrics.losses],["Points per game", analysis.home.metrics.pointsPerGame.toFixed(2), analysis.away.metrics.pointsPerGame.toFixed(2)],["Goals per game", analysis.home.metrics.averageGoalsFor.toFixed(2), analysis.away.metrics.averageGoalsFor.toFixed(2)],["Conceded per game", analysis.home.metrics.averageGoalsAgainst.toFixed(2), analysis.away.metrics.averageGoalsAgainst.toFixed(2)],["Goal difference", signed(analysis.home.metrics.goalDifference), signed(analysis.away.metrics.goalDifference)],["Clean sheets", analysis.home.metrics.cleanSheets, analysis.away.metrics.cleanSheets],["Scored in", `${analysis.home.metrics.scoringMatches}/${analysis.home.metrics.played}`, `${analysis.away.metrics.scoringMatches}/${analysis.away.metrics.played}`]];
  return <div className="metric-table"><header><span>{fixture.home.shortName}</span><strong>METRIC</strong><span>{fixture.away.shortName}</span></header>{rows.map(([label, home, away]) => <div key={label}><b>{home}</b><span>{label}</span><b>{away}</b></div>)}</div>;
}

function buildReasons(fixture: PredictionFixture, analysis: FixtureAnalysis) {
  const home = analysis.home.metrics, away = analysis.away.metrics;
  const formDelta = home.pointsPerGame - away.pointsPerGame;
  const goalDelta = (home.averageGoalsFor - home.averageGoalsAgainst) - (away.averageGoalsFor - away.averageGoalsAgainst);
  const strengthDelta = (fixture.home.strength ?? .75) - (fixture.away.strength ?? .75);
  return [
    { title: "Recent results", text: `${fixture.home.name} collected ${home.points} points (${home.pointsPerGame.toFixed(2)} per game); ${fixture.away.name} collected ${away.points} (${away.pointsPerGame.toFixed(2)} per game).`, value: Math.abs(formDelta) < .1 ? "EVEN" : `${formDelta > 0 ? fixture.home.shortName : fixture.away.shortName} +${Math.abs(formDelta).toFixed(2)} PPG`, edge: Math.abs(formDelta) < .1 ? "neutral" : formDelta > 0 ? "home" : "away" },
    { title: "Scoring and defending", text: `${fixture.home.name}: ${home.goalsFor} scored, ${home.goalsAgainst} conceded. ${fixture.away.name}: ${away.goalsFor} scored, ${away.goalsAgainst} conceded across the same five-match window.`, value: Math.abs(goalDelta) < .1 ? "EVEN" : `${goalDelta > 0 ? fixture.home.shortName : fixture.away.shortName} EDGE`, edge: Math.abs(goalDelta) < .1 ? "neutral" : goalDelta > 0 ? "home" : "away" },
    { title: "Venue context", text: `${fixture.home.name} is the listed home team at ${fixture.venue || "the scheduled venue"}. The model applies the same 0.72 home-context input to every fixture.`, value: `${fixture.home.shortName} HOME`, edge: "home" },
    { title: "Squad archive", text: `The local player archive gives a ${signed(strengthDelta * 100, 1)} percentage-point squad-strength difference. This is a supporting input, not a claim about today's starting lineup.`, value: Math.abs(strengthDelta) < .01 ? "EVEN" : `${strengthDelta > 0 ? fixture.home.shortName : fixture.away.shortName} EDGE`, edge: Math.abs(strengthDelta) < .01 ? "neutral" : strengthDelta > 0 ? "home" : "away" },
    { title: "Evidence limits", text: `The model knows these ${home.played + away.played} results and the listed venue. It does not yet know confirmed lineups, injuries, suspensions, weather or in-match events, so confidence stays limited.`, value: analysis.dataCoverage.complete ? "10 MATCHES" : "PARTIAL", edge: "neutral" },
  ];
}

function AnalysisLoading({ home, away }: { home: Team; away: Team }) { return <div className="analysis-loading"><div><TeamLogo team={home}/><i/><TeamLogo team={away}/></div><strong>Loading the evidence</strong><span>Finding completed games for {home.shortName} and {away.shortName}…</span>{Array.from({ length: 5 }, (_, index) => <b key={index}/>)}</div>; }
function Empty({ icon: Icon, title, text }: { icon: typeof Target; title: string; text: string }) { return <div className="analysis-empty"><Icon/><strong>{title}</strong><span>{text}</span></div>; }
function TeamIdentity({ team }: { team: Team }) { return <div className="team-identity"><TeamLogo team={team}/><div><strong>{team.name}</strong><span>{team.abbreviation}</span></div></div>; }
function TeamLogo({ team }: { team: Team }) { return team.logo ? <img className="analysis-team-logo" src={team.logo} alt={`${team.name} crest`}/> : <span className="analysis-team-logo fallback" style={{ background: `#${team.color}` }}>{team.abbreviation}</span>; }
function BlockTitle({ icon: Icon, eyebrow, title, text }: { icon: typeof Activity; eyebrow: string; title: string; text: string }) { return <header className="analysis-block-title"><Icon/><div><p>{eyebrow}</p><h2>{title}</h2><span>{text}</span></div></header>; }
function MethodStep({ n, title, text }: { n: string; title: string; text: string }) { return <article><b>{n}</b><div><strong>{title}</strong><p>{text}</p></div></article>; }
function ModelInput({ name, value, detail, weight }: { name: string; value: number; detail: string; weight: number }) { return <div><span><strong>{name}</strong><small>{detail}</small></span><b>{value >= 0 ? "+" : ""}{value.toFixed(2)}</b><em>home weight {weight >= 0 ? "+" : ""}{weight.toFixed(2)}</em></div>; }
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
function signed(value: number, digits = 0) { return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`; }
function shortDate(value: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value)); }
function compactDate(value: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "2-digit" }).format(new Date(value)); }
function matchDate(value: string) { return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kathmandu" }).format(new Date(value)); }
