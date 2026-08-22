"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

type Tone = "activate" | "navigate" | "hover";
const soundEvent="velostatiq-sound-change";
const subscribe=(callback:()=>void)=>{window.addEventListener(soundEvent,callback);window.addEventListener("storage",callback);return()=>{window.removeEventListener(soundEvent,callback);window.removeEventListener("storage",callback)}};
const getSnapshot=()=>localStorage.getItem("velostatiq-sound")==="on";
const getServerSnapshot=()=>false;

export default function SoundController() {
  const enabled=useSyncExternalStore(subscribe,getSnapshot,getServerSnapshot),context=useRef<AudioContext|null>(null),lastHover=useRef(0);

  const play=useCallback((tone:Tone)=>{if(!context.current)context.current=new AudioContext();const ctx=context.current;if(ctx.state==="suspended")void ctx.resume();const now=ctx.currentTime,path=window.location.pathname,base=path.includes("formula-one")?480:path.includes("football")?260:360,notes=tone==="activate"?[base,base*1.25,base*1.5]:[tone==="hover"?base*.75:base];notes.forEach((frequency,index)=>{const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.type=tone==="hover"?"sine":"triangle";oscillator.frequency.setValueAtTime(frequency,now+index*.055);gain.gain.setValueAtTime(.0001,now+index*.055);gain.gain.exponentialRampToValueAtTime(tone==="activate"?.09:.035,now+index*.055+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+index*.055+(tone==="activate"?.22:.09));oscillator.connect(gain).connect(ctx.destination);oscillator.start(now+index*.055);oscillator.stop(now+index*.055+(tone==="activate"?.24:.11))})},[]);
  useEffect(()=>{if(!enabled)return;const click=(event:MouseEvent)=>{const target=event.target as Element|null;if(target?.closest("a,button,[role='button']")&&!target.closest(".sound-toggle"))play("navigate")};const hover=(event:PointerEvent)=>{const target=event.target as Element|null;if(!target?.closest(".sport-choice,nav button,.news-card,.cinema-fixture-grid>button,.f1-driver-grid>button"))return;const now=performance.now();if(now-lastHover.current>140){lastHover.current=now;play("hover")}};document.addEventListener("click",click,true);document.addEventListener("pointerover",hover,true);return()=>{document.removeEventListener("click",click,true);document.removeEventListener("pointerover",hover,true)}},[enabled,play]);
  useEffect(()=>()=>{void context.current?.close()},[]);
  const toggle=()=>{const next=!enabled;localStorage.setItem("velostatiq-sound",next?"on":"off");window.dispatchEvent(new Event(soundEvent));if(next)play("activate")};
  return <button className={enabled?"sound-toggle active":"sound-toggle"} onClick={toggle} aria-label={enabled?"Turn VeloStatiq sound off":"Turn VeloStatiq sound on"} aria-pressed={enabled}>{enabled?<Volume2/>:<VolumeX/>}<span><strong>{enabled?"Sound on":"Sound off"}</strong><small>{enabled?"UI audio enabled":"Click to enable"}</small></span></button>;
}
