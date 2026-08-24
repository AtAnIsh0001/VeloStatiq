# VeloStatiq — Sports Intelligence OS
### Project Details & Team Information

---

## Name(s), Student ID(s), Section of all involved members

| # | Name | Student ID | Section |
|---|------|------------|---------|
| 1 | Ashish Rupakheti | 25029710 | *(fill in)* |
| 2 | Ayush Neupane | 25029576 | *(fill in)* |
| 3 | Shirish Bikram Shah | 25029668 | *(fill in)* |

**Project:** VeloStatiq — a full-stack sports analytics platform for **Formula One** and **Football**
**Repository:** https://github.com/AtAnIsh0001/VeloStatiq.git

---

## Executive Summary of the Project

**VeloStatiq** is a full-stack sports intelligence platform that brings together live data,
historical archives and transparent prediction models for two sports: **Formula One** and
**Football**, all in one cinematic web application.

On the **Formula One** side, the platform aggregates official championship data (results,
standings, pit stops, lap times) from the Jolpica F1 API and telemetry-style session data from
OpenF1, then fuses it with a local historical CSV archive. Its custom-built prediction engine —
written in pure Python using only the standard library — produces **explainable race forecasts**:
predicted fastest-lap time, fastest-lap probability, an optimal pit-stop window, expected number
of stops, a full tyre-compound plan per stint, and a calibrated confidence score. A driver
head-to-head comparison tool analyses each driver's last five races plus their most recent
appearance at the upcoming circuit.

On the **Football** side, VeloStatiq delivers upcoming fixtures across nine major leagues
(Premier League, LaLiga, Champions League, etc.), last-five-match form analysis with computed
metrics (points per game, goal difference, clean sheets, form score), footballer profile search,
ESPN fantasy-football league integration, and curated news feeds for both sports.

A key engineering feature is the **self-refreshing data pipeline**: every external API is polled
by a background scheduler every 15 minutes, with layered caching and offline disk-cache fallbacks,
so dashboards always show current data even without any visitor activity. The front end renders
this through an animated "cinematic" dashboard experience — including a 3D circuit replay, live
winner tracking that auto-updates when new race data lands, and a bespoke sound design with
synthesised Formula One engine-rev effects exclusive to the F1 section.

In short, VeloStatiq turns raw sports APIs into a living analytics product: real-time feeds in,
clear and honest predictions out.

---

## Technologies / Tools Used

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 16** (App Router) | Full-stack React framework; server-side API routes |
| **React 19** + **TypeScript 5** | Component architecture with strict typing |
| **Tailwind CSS 4** + custom CSS design system | Responsive cinematic UI styling |
| **Framer Motion** | Page/section transitions and animations |
| **Three.js + React Three Fiber (@react-three/fiber, drei)** | 3D circuit replay visualisation |
| **Recharts** | Data charts (lap times, form metrics) |
| **Lucide Icons** | UI iconography |

### Backend / Data Engineering
| Technology | Purpose |
|---|---|
| **Next.js Route Handlers (TypeScript)** | 10 REST endpoints (`/api/f1-race`, `/api/football`, `/api/news`, …) |
| **Python 3 (standard library only)** | Custom F1 prediction engine (`f1_predictor.py`) — linear weighted model + sigmoid calibration |
| **Next.js ISR fetch caching + background scheduler** (`instrumentation.ts`) | 15-minute automatic refresh of all external data sources |
| **Local data archive** (CSV + JSON + disk cache) | Historical F1 races, athlete database, offline resilience |

### External APIs Integrated
- **Jolpica F1 API** (Ergast successor) — race results, standings, pit stops, schedules
- **OpenF1 API** — sessions, drivers, lap/sector telemetry, tyre stints
- **ESPN Site API** — football fixtures/scoreboards fallback + news feeds
- **livescoreFootball adapter** — primary football fixtures provider
- **TheSportsDB** — football player profiles & images
- **Wikipedia MediaWiki API** — athlete headshots
- **espn-fantasy-football-api** — fantasy league, teams, boxscores, draft

### Tools & Workflow
- **Visual Studio Code**, **Git & GitHub** (version control), **npm**, **ESLint**, **Node.js**

---

## Unique Selling Point (USP) of the Project

> **One platform where live sports data becomes explainable predictions — never a black box.**

1. **Transparent, explainable predictions.** Unlike typical "AI predictor" projects that hide
   behind an opaque model, every VeloStatiq forecast shows its inputs: how much weight came from
   the driver's own best laps vs the circuit benchmark, which scenario penalties applied
   (temperature, rain, fuel load, safety car), and a confidence score that openly drops when
   driver data is missing. The entire prediction engine is ~200 lines of readable Python.

2. **Two sports, one intelligence layer.** The same pipeline pattern (live API → normalisation →
   metrics → cached analysis) powers both Formula One race strategy forecasts *and* football
   fixture form analysis — demonstrating reusable architecture rather than two disconnected demos.

3. **Self-healing 15-minute data pipeline.** A background scheduler refreshes every source on a
   fixed cycle with zero user interaction; each source has timeout guards, CDN revalidation, disk
   caching and graceful degradation to archived data — the dashboard never goes blank because an
   API went down.

4. **Broadcast-grade presentation.** Cinematic dashboards, a 3D circuit replay, auto-updating
   winner cards, and synthesised Formula-One engine sounds (Web Audio, no audio files) make it
   feel like a broadcast product rather than a student dashboard.

5. **Zero-cost by design.** Built entirely on free/public APIs and the standard library — no paid
   keys, no API quotas, fully reproducible by anyone who clones the repository.
