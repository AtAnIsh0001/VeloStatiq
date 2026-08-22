"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Box, CircleDot, Flag, Goal, Radio, RotateCcw, Timer, Video } from "lucide-react";
import { f1Events, f1Standings, f1Telemetry, footballEvents, footballTrend } from "../lib/mockData";
import { f1WinProbability, footballWinProbability } from "../lib/predictionEngine";
import type { SportMode, TimelineEvent } from "../lib/types";

type Snapshot = { source: "openf1" | "local"; sessionName: string; meetingName: string; laps: unknown[] };

const icons: Record<TimelineEvent["type"], typeof Goal> = { goal: Goal, card: Box, attack: CircleDot, pit: Timer, flag: Flag, sector: Radio };

export default function CenterLiveMatch({ mode }: { mode: SportMode }) {
  const [camera, setCamera] = useState<"broadcast" | "tactical">("broadcast");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const events = mode === "football" ? footballEvents : f1Events;
  const probability = useMemo(() => mode === "football"
    ? footballWinProbability({ possession: 54, shotQuality: 0.73, fitness: 84, recentForm: 0.71 })
    : f1WinProbability({ paceDelta: 1.12, tyreLife: 72, trackPosition: 1, consistency: 96 }), [mode]);

  useEffect(() => {
    if (mode !== "f1") return;
    fetch("/api/openf1").then((response) => response.json()).then(setSnapshot).catch(() => setSnapshot(null));
  }, [mode]);

  return (
    <main className="center-stack">
      <section className="glass-panel live-panel">
        <div className="live-topbar">
          <div className="live-status"><span className="pulse-dot" /> LIVE <small>{mode === "football" ? "68:21" : "LAP 42 / 78"}</small></div>
          <div className="camera-tabs">
            <button className={camera === "broadcast" ? "active" : ""} onClick={() => setCamera("broadcast")}><Video size={13} /> {mode === "football" ? "MATCH FEED" : "COCKPIT"}</button>
            <button className={camera === "tactical" ? "active" : ""} onClick={() => setCamera("tactical")}><Box size={13} /> TACTICAL</button>
          </div>
          <button className="icon-button" aria-label="Reset camera" onClick={() => setCamera("broadcast")}><RotateCcw size={14} /></button>
        </div>

        <div className={`broadcast-stage ${mode} ${camera}`}>
          <div className="stage-noise" />
          {mode === "football" ? <FootballStage tactical={camera === "tactical"} /> : <RaceStage tactical={camera === "tactical"} />}
          <div className="broadcast-label">VELOSTATIQ // {camera.toUpperCase()} CAM <span>4K</span></div>
        </div>

        <div className="score-strip">
          {mode === "football" ? (
            <><TeamBadge code="MUN" color="#ef3d52" /><div className="score"><strong>1</strong><span>68:21<br />CHAMPIONS LEAGUE</span><strong>1</strong></div><TeamBadge code="RMA" color="#e9eef7" /></>
          ) : (
            <><TeamBadge code="VER" color="#4f8cff" /><div className="score"><strong>P1</strong><span>GAP<br />+1.284</span><strong>P2</strong></div><TeamBadge code="LEC" color="#ff334f" /></>
          )}
        </div>
      </section>

      <div className="analysis-grid">
        <section className="glass-panel ticker-panel">
          <div className="mini-heading"><span>LIVE INTELLIGENCE</span><small>AUTO-SCROLL</small></div>
          <div className="event-list">
            {events.map((event, index) => { const Icon = icons[event.type]; return <div className="event-row" key={event.id} style={{ opacity: 1 - index * .13 }}><time>{event.time}</time><i><Icon size={13} /></i><div><strong>{event.title}</strong><span>{event.detail}</span></div></div>; })}
          </div>
        </section>

        <section className="glass-panel probability-panel">
          <div className="mini-heading"><span>{mode === "football" ? "WIN PROBABILITY" : "PACE / THROTTLE"}</span><small>LINEAR + σ</small></div>
          <div className="probability-value"><strong>{Math.round(probability * 100)}%</strong><span>{mode === "football" ? "MUN ADVANTAGE" : "VER WIN MODEL"}</span></div>
          <ResponsiveContainer width="100%" height={124}>
            <AreaChart data={mode === "football" ? footballTrend : f1Telemetry} margin={{ top: 8, right: 0, bottom: 0, left: -27 }}>
              <defs><linearGradient id="lineGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity={.36}/><stop offset="1" stopColor="var(--accent)" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
              <XAxis dataKey="distance" tick={{ fontSize: 8, fill: "#687873" }} axisLine={false} tickLine={false} />
              <YAxis domain={mode === "football" ? [0, 100] : [0, 330]} tick={{ fontSize: 8, fill: "#687873" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#09120f", border: "1px solid rgba(255,255,255,.12)", fontSize: 10 }} />
              <Area type="monotone" dataKey="primary" stroke="var(--accent)" strokeWidth={2} fill="url(#lineGlow)" isAnimationActive />
              <Area type="monotone" dataKey="secondary" stroke="var(--accent-2)" strokeWidth={1.5} fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
          {mode === "f1" && <div className="openf1-state"><span className={snapshot?.source === "openf1" ? "online" : ""} /> OPENF1 · {snapshot?.source === "openf1" ? `${snapshot.laps.length} LIVE RECORDS` : "LOCAL CACHE"}</div>}
        </section>
      </div>

      {mode === "f1" && <section className="glass-panel standings"><div className="mini-heading"><span>RACE ORDER</span><small>MONACO · LAP 42</small></div>{f1Standings.map((driver) => <div key={driver.code} className="standing-row"><b>{driver.pos}</b><i style={{ background: driver.color }} /><strong>{driver.code}</strong><span>{driver.team}</span><em>{driver.compound}</em><time>{driver.gap}</time></div>)}</section>}
    </main>
  );
}

function TeamBadge({ code, color }: { code: string; color: string }) { return <div className="team-badge" style={{ borderColor: color, color }}>{code}</div>; }

function FootballStage({ tactical }: { tactical: boolean }) {
  return <div className={`pitch-visual ${tactical ? "topdown" : ""}`}><div className="pitch-lines"><span className="centre-circle" /><span className="penalty left" /><span className="penalty right" /></div>{[16,28,39,51,62,74,84].map((left, i) => <i key={left} className={`player-dot ${i % 2 ? "away" : ""}`} style={{ left: `${left}%`, top: `${28 + (i % 3) * 20}%` }} />)}<b className="ball-dot" /></div>;
}

function RaceStage({ tactical }: { tactical: boolean }) {
  return <div className={`race-visual ${tactical ? "topdown" : ""}`}><svg viewBox="0 0 500 500"><path d="M118 247 C91 251 90 297 103 333 L121 390 C124 405 108 401 112 414 C124 452 149 470 158 469 C171 474 159 486 120 485 C113 484 122 467 111 453 C83 416 62 331 76 279 C81 254 109 247 157 239 C228 226 283 202 324 178 C367 153 367 119 342 93 C329 80 343 68 397 5 C407 -4 414 8 410 23 C408 33 427 48 423 61 C421 69 442 77 444 67 C447 58 429 52 424 39 C416 18 432 11 456 5 C472 2 470 38 462 77 C452 126 421 169 375 194 C336 216 313 219 270 225 C244 228 240 242 219 241 Z" /></svg><div className="speed-hud"><strong>287</strong><span>KM/H</span><b>7</b><small>GEAR</small></div><i className="car-marker one">1</i><i className="car-marker two">16</i><i className="car-marker three">44</i></div>;
}
