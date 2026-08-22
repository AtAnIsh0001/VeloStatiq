"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ChevronDown, Search, ShieldCheck, Sparkles } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { athletes } from "../lib/mockData";
import { wireframeAvatar } from "../lib/imageFetcher";
import type { Athlete, SportMode } from "../lib/types";

type Props = { mode: SportMode; selected: Athlete; onSelect: (athlete: Athlete) => void };

export default function LeftScoutingHUD({ mode, selected, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState({ name: selected.name, url: wireframeAvatar(selected.name) });
  const options = useMemo(() => athletes.filter((athlete) => athlete.sport === mode && athlete.name.toLowerCase().includes(query.toLowerCase())), [mode, query]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/athlete-image?name=${encodeURIComponent(selected.name)}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data: { url?: string }) => data.url && setImage({ name: selected.name, url: data.url }))
      .catch(() => undefined);
    return () => controller.abort();
  }, [selected]);

  return (
    <aside className="glass-panel scout-panel">
      <div className="section-kicker"><span>01</span> SCOUTING MATRIX</div>
      <div className="search-shell">
        <Search size={15} />
        <input value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder={`Search ${mode === "f1" ? "driver" : "player"}`} />
        <kbd>⌘ K</kbd>
        {open && query && (
          <div className="search-results">
            {options.map((athlete) => <button key={athlete.id} onClick={() => { onSelect(athlete); setQuery(""); setOpen(false); }}><span>{athlete.name}</span><small>{athlete.team}</small></button>)}
            {!options.length && <p>No records found</p>}
          </div>
        )}
      </div>

      <div className="athlete-portrait">
        <div className="portrait-grid" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.name === selected.name ? image.url : wireframeAvatar(selected.name)} alt={selected.name} onError={() => setImage({ name: selected.name, url: wireframeAvatar(selected.name) })} />
        <div className="scan-line" />
        <span className="portrait-number">{selected.number}</span>
        <div className="live-chip"><span /> ID VERIFIED</div>
      </div>

      <div className="athlete-name-row">
        <div><p>{selected.role}</p><h2>{selected.name}</h2><span>{selected.team} · {selected.nationality}</span></div>
        <button aria-label="Change athlete" onClick={() => { setOpen(true); setQuery(selected.name.split(" ")[0]); }}><ChevronDown size={17} /></button>
      </div>

      <div className="rating-row">
        <div className="rating-dial"><strong>{selected.rating}</strong><span>OVR</span></div>
        <div className="fitness-bars">
          <div><span>FORM</span><b>92%</b></div><i><em style={{ width: "92%" }} /></i>
          <div><span>FITNESS</span><b>84%</b></div><i><em style={{ width: "84%" }} /></i>
          <p><ShieldCheck size={13} /> {selected.status}</p>
        </div>
      </div>

      <div className="radar-shell">
        <div className="mini-heading"><span>PERFORMANCE DNA</span><Sparkles size={13} /></div>
        <ResponsiveContainer width="100%" height={190}>
          <RadarChart data={selected.metrics} outerRadius="70%">
            <PolarGrid stroke="rgba(166,255,229,.18)" />
            <PolarAngleAxis dataKey="label" tick={{ fill: "#7f928f", fontSize: 9, fontWeight: 600 }} />
            <Radar dataKey="value" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.18} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="data-foot"><Activity size={13} /><span>LOCAL DATA NODE</span><b>2.4ms</b></div>
    </aside>
  );
}
