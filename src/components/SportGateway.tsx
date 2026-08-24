import { ArrowUpRight, Flag, Gauge, Goal, Radio, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import SoundToggle from "./SoundToggle";

export default function SportGateway() {
  return <main className="sport-gateway">
    <a className="skip-link" href="#sport-selection">Skip to sport selection</a>
    <div className="gateway-noise" aria-hidden="true"/><div className="gateway-orbit orbit-one" aria-hidden="true"/><div className="gateway-orbit orbit-two" aria-hidden="true"/>
    <header className="gateway-reveal reveal-header">
      <Link href="/" className="gateway-brand" aria-label="VeloStatiq home"><Image src="/assets/brand/velostatiq-logo-small.webp" alt="" width={96} height={64} sizes="96px" priority/><strong>VeloStatiq</strong></Link>
      <SoundToggle/>
      <div><i/><span>LIVE DATA SYSTEMS ONLINE</span></div>
    </header>
    <section className="gateway-copy gateway-reveal reveal-copy" aria-labelledby="gateway-title">
      <p>ONE PLATFORM · TWO WORLDS</p>
      <h1 id="gateway-title">Choose your<br/><em>arena.</em></h1>
      <span>Live schedules, deep athlete intelligence and transparent predictions. Where do you want to begin?</span>
    </section>
    <section className="sport-choices" id="sport-selection" aria-label="Choose a sport">
      <SportChoice href="/football" type="football" eyebrow="THE BEAUTIFUL GAME" title="Football" description="Matches, global player search and explainable outcome predictions." stats={["62 upcoming", "20K+ players"]}/>
      <SportChoice href="/formula-one" type="f1" eyebrow="ENGINEER THE RACE" title="Formula One" description="Telemetry, drivers, tyre strategy and lap-by-lap race intelligence." stats={["17K+ data files", "Strategy models"]}/>
    </section>
    <footer className="gateway-reveal reveal-footer"><span>CHOOSE TO EXPLORE</span><div><Radio/> Live providers + local DataBase</div></footer>
  </main>;
}

function SportChoice({ href, type, eyebrow, title, description, stats }: { href: string; type: "football" | "f1"; eyebrow: string; title: string; description: string; stats: string[] }) {
  return <div className={`gateway-reveal reveal-card ${type}`}>
    <Link href={href} prefetch={false} className={`sport-choice ${type}`}>
      <div className="choice-art" aria-hidden="true">{type === "football" ? <><div className="gateway-ball"><span/><span/><span/></div><Goal/></> : <><div className="gateway-speed"><i/><i/><i/><i/></div><Gauge/></>}</div>
      <div className="choice-content"><div className="choice-kicker">{type === "football" ? <Flag/> : <Sparkles/>}{eyebrow}</div><h2>{title}</h2><p>{description}</p><div className="choice-stats">{stats.map((stat) => <span key={stat}>{stat}</span>)}</div><b>Enter {title}<ArrowUpRight/></b></div>
    </Link>
  </div>;
}
