"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { Crosshair, Expand, Layers3 } from "lucide-react";
import type { SportMode } from "../lib/types";

export default function BottomThreeConsole({ mode }: { mode: SportMode }) {
  const [layers, setLayers] = useState(true);
  const [tracking, setTracking] = useState(true);
  const [expanded, setExpanded] = useState(false);
  return (
    <section className={`glass-panel spatial-console ${expanded ? "expanded" : ""}`}>
      <div className="console-top"><div className="section-kicker"><span>03</span> SPATIAL DIGITAL TWIN</div><div><button className={layers ? "active" : ""} onClick={() => setLayers(!layers)}><Layers3 size={13}/> LAYERS</button><button className={tracking ? "active" : ""} onClick={() => setTracking(!tracking)}><Crosshair size={13}/> TRACK</button><button onClick={() => setExpanded(!expanded)} aria-label="Toggle expanded view"><Expand size={13}/></button></div></div>
      <div className="canvas-shell">
        <Canvas dpr={[1, 1.5]} camera={{ position: [0, 8, 9], fov: 42 }} gl={{ antialias: true, alpha: true }}>
          <ambientLight intensity={1.8} />
          <pointLight position={[2, 6, 3]} intensity={12} color={mode === "football" ? "#22efb8" : "#ff3b4f"} />
          <SceneRig>{mode === "football" ? <PitchScene layers={layers} tracking={tracking} /> : <CircuitScene layers={layers} tracking={tracking} />}</SceneRig>
        </Canvas>
        <div className="axis-labels"><span>N</span><span>LIVE VECTOR SPACE</span></div>
      </div>
      <div className="console-metrics">
        {mode === "football" ? <><Metric label="POSSESSION" value="54 : 46"/><Metric label="PASS ACCURACY" value="89.2%"/><Metric label="FIELD TILT" value="+8.4"/></> : <><Metric label="TRACK TEMP" value="41.2°C"/><Metric label="WIND" value="11 KM/H"/><Metric label="GRIP LEVEL" value="HIGH"/></>}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }

function SceneRig({ children }: { children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ pointer }) => {
    if (group.current) {
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, pointer.x * .13, .045);
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, pointer.y * -.05, .045);
    }
  });
  return <group ref={group}>{children}</group>;
}

function PolyLine({ points, color }: { points: [number, number, number][]; color: string }) {
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map((point) => new THREE.Vector3(...point)));
    return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color }));
  }, [points, color]);
  return <primitive object={line} />;
}

function PitchScene({ layers, tracking }: { layers: boolean; tracking: boolean }) {
  const ball = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (ball.current && tracking) { ball.current.position.x = Math.sin(clock.elapsedTime * .7) * 2.4; ball.current.position.z = Math.cos(clock.elapsedTime * .5) * 1.25; } });
  const players = useMemo(() => Array.from({ length: 14 }, (_, i) => [((i % 7) - 3) * 1.05, 0.12, i < 7 ? -1.4 + (i % 3) * .7 : .5 + (i % 3) * .7] as [number, number, number]), []);
  const boundary = useMemo<[number, number, number][]>(() => [[-5,.02,-3],[5,.02,-3],[5,.02,3],[-5,.02,3],[-5,.02,-3]], []);
  const middle = useMemo<[number, number, number][]>(() => [[0,.02,-3],[0,.02,3]], []);
  return <group>{layers && <gridHelper args={[12,24,"#1d6b57","#12372f"]}/>}<PolyLine points={boundary} color="#3ddfba"/><PolyLine points={middle} color="#3ddfba"/>{players.map((position, i) => <mesh position={position} key={i}><cylinderGeometry args={[.11,.11,.12,16]}/><meshStandardMaterial color={i < 7 ? "#27edb8" : "#ecf5ff"} emissive={i < 7 ? "#0b7b5e" : "#5f7188"}/></mesh>)}<mesh ref={ball} position={[0,.17,0]}><sphereGeometry args={[.1,16,16]}/><meshStandardMaterial color="#fff" emissive="#22efb8" emissiveIntensity={1}/></mesh></group>;
}

function CircuitScene({ layers, tracking }: { layers: boolean; tracking: boolean }) {
  const car = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (car.current && tracking) { const t = clock.elapsedTime * .34; car.current.position.set(Math.sin(t) * 3.8, .15, Math.sin(t * 2) * 1.7); } });
  const track: [number, number, number][] = [[-4,0,-1],[-3,0,2],[-1,0,2.4],[1,0,1],[3.7,0,1.5],[4,0,-1],[2,0,-2.4],[0,0,-1.4],[-2,0,-2.6],[-4,0,-1]];
  return <group>{layers && <gridHelper args={[12,24,"#572029","#241417"]}/>}<PolyLine points={track} color="#ff4055"/><mesh ref={car} position={[-4,.15,-1]}><boxGeometry args={[.28,.14,.5]}/><meshStandardMaterial color="#fff" emissive="#ff4055" emissiveIntensity={2}/></mesh>{[[3.7,.12,1.5],[-1,.12,2.4]].map((position,i)=><mesh position={position as [number,number,number]} key={i}><boxGeometry args={[.25,.12,.45]}/><meshStandardMaterial color={i ? "#ff334f" : "#4f8cff"} emissive={i ? "#ff334f" : "#4f8cff"}/></mesh>)}</group>;
}
