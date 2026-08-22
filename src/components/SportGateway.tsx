"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight, Flag, Gauge, Goal, Radio, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

export default function SportGateway() {
  return <main className="sport-gateway">
    <div className="gateway-noise"/><div className="gateway-orbit orbit-one"/><div className="gateway-orbit orbit-two"/>
    <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7 }}>
      <Link href="/" className="gateway-brand"><Image src="/assets/brand/velostatiq-logo.png" alt="VeloStatiq" width={96} height={64} priority/><strong>VeloStatiq</strong></Link>
      <div><i/><span>LIVE DATA SYSTEMS ONLINE</span></div>
    </motion.header>
    <section className="gateway-copy">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .2 }}>ONE PLATFORM · TWO WORLDS</motion.p>
      <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .9, delay: .1, ease }}>Choose your<br/><em>arena.</em></motion.h1>
      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .55 }}>Live schedules, deep athlete intelligence and transparent predictions. Where do you want to begin?</motion.span>
    </section>
    <section className="sport-choices">
      <SportChoice href="/football" type="football" eyebrow="THE BEAUTIFUL GAME" title="Football" description="Matches, global player search and explainable outcome predictions." stats={["62 upcoming", "20K+ players"]}/>
      <SportChoice href="/formula-one" type="f1" eyebrow="ENGINEER THE RACE" title="Formula One" description="Telemetry, drivers, tyre strategy and lap-by-lap race intelligence." stats={["17K+ data files", "Strategy models"]}/>
    </section>
    <motion.footer initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}><span>HOVER TO EXPLORE</span><div><Radio/> Live providers + local DataBase</div></motion.footer>
  </main>;
}

function SportChoice({ href, type, eyebrow, title, description, stats }: { href: string; type: "football" | "f1"; eyebrow: string; title: string; description: string; stats: string[] }) {
  const card = useRef<HTMLAnchorElement>(null); const x = useMotionValue(0); const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-.5,.5], [5,-5]), { stiffness: 180, damping: 22 });
  const rotateY = useSpring(useTransform(x, [-.5,.5], [-6,6]), { stiffness: 180, damping: 22 });
  return <motion.div initial={{ opacity: 0, y: 65 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .9, delay: type === "football" ? .42 : .56, ease }}>
    <motion.a ref={card} href={href} className={`sport-choice ${type}`} style={{ rotateX, rotateY, transformPerspective: 900 }} onMouseMove={(event) => { const box = card.current?.getBoundingClientRect(); if (box) { x.set((event.clientX - box.left) / box.width - .5); y.set((event.clientY - box.top) / box.height - .5); } }} onMouseLeave={() => { x.set(0); y.set(0); }}>
      <div className="choice-art">{type === "football" ? <><div className="gateway-ball"><span/><span/><span/></div><Goal/></> : <><div className="gateway-speed"><i/><i/><i/><i/></div><Gauge/></>}</div>
      <div className="choice-content"><div className="choice-kicker">{type === "football" ? <Flag/> : <Sparkles/>}{eyebrow}</div><h2>{title}</h2><p>{description}</p><div className="choice-stats">{stats.map((stat) => <span key={stat}>{stat}</span>)}</div><b>Enter {title}<ArrowUpRight/></b></div>
    </motion.a>
  </motion.div>;
}
