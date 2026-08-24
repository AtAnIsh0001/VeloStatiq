"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Html, OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type Lap = { lap:number; seconds:number; time:string; position:number };
type View = "follow"|"overview";
type GeoFeature = { properties:{Name?:string;Location?:string};geometry:{type:string;coordinates:number[][]} };
type Motion = { position:THREE.Vector3;tangent:THREE.Vector3 };

const fallbackHungaroring = [[19.2495,47.5814],[19.2479,47.5824],[19.2456,47.5824],[19.2442,47.5816],[19.2442,47.5803],[19.2451,47.5794],[19.2470,47.5792],[19.2480,47.5782],[19.2496,47.5776],[19.2514,47.5779],[19.2525,47.5789],[19.2522,47.5800],[19.2510,47.5808],[19.2495,47.5814]];

function normalizeCircuit(raw:number[][]){
  const clean=raw.filter(p=>p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])); if(clean.length<4)return normalizeCircuit(fallbackHungaroring);
  const lat=clean.reduce((sum,p)=>sum+p[1],0)/clean.length,cos=Math.cos(lat*Math.PI/180);
  const metric=clean.map(p=>new THREE.Vector2(p[0]*cos,p[1]));const minX=Math.min(...metric.map(p=>p.x)),maxX=Math.max(...metric.map(p=>p.x)),minY=Math.min(...metric.map(p=>p.y)),maxY=Math.max(...metric.map(p=>p.y));const scale=10/Math.max(maxX-minX,maxY-minY),cx=(minX+maxX)/2,cy=(minY+maxY)/2;
  return metric.map(p=>[(p.x-cx)*scale,(p.y-cy)*-scale]);
}

function useCircuitCoordinates(name:string){
  const [raw,setRaw]=useState<number[][]>(fallbackHungaroring);
  useEffect(()=>{const controller=new AbortController();fetch("/assets/3d/f1-circuits.geojson",{signal:controller.signal}).then(r=>r.json()).then((body:{features:GeoFeature[]})=>{const key=name.toLowerCase().replace("circuit","").trim();const feature=body.features.find(item=>`${item.properties.Name||""} ${item.properties.Location||""}`.toLowerCase().includes(key))||body.features.find(item=>`${item.properties.Name||""}`.toLowerCase().includes("hungaroring"));if(feature?.geometry.type==="LineString")setRaw(feature.geometry.coordinates)}).catch(()=>undefined);return()=>controller.abort()},[name]);
  return useMemo(()=>normalizeCircuit(raw),[raw]);
}

function ribbon(curve:THREE.CatmullRomCurve3,width:number,lift:number,segments=420){
  const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
  for(let i=0;i<=segments;i++){const t=i/segments,p=curve.getPointAt(t),tan=curve.getTangentAt(t).normalize(),side=new THREE.Vector3(-tan.z,0,tan.x).normalize(),l=p.clone().addScaledVector(side,width/2),r=p.clone().addScaledVector(side,-width/2);l.y+=lift;r.y+=lift;positions.push(l.x,l.y,l.z,r.x,r.y,r.z);uvs.push(0,t*65,1,t*65);if(i<segments){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2)}}
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));g.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

function ribbonEdge(curve:THREE.CatmullRomCurve3,width:number,top:number,bottom:number,segments=420){
  const positions:number[]=[],indices:number[]=[];
  for(let i=0;i<=segments;i++){const t=i/segments,p=curve.getPointAt(t),tan=curve.getTangentAt(t).normalize(),side=new THREE.Vector3(-tan.z,0,tan.x).normalize();for(const edge of [-1,1]){const point=p.clone().addScaledVector(side,edge*width/2);positions.push(point.x,top,point.z,point.x,bottom,point.z)}if(i<segments){const a=i*4;indices.push(a,a+1,a+4,a+1,a+5,a+4,a+2,a+6,a+3,a+3,a+6,a+7)}}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

function asphaltMap(){
  const size=128,data=new Uint8Array(size*size*4);let seed=1847;
  for(let i=0;i<size*size;i++){seed=(seed*1664525+1013904223)>>>0;const grain=((seed>>>24)-128)*.1,value=Math.max(31,Math.min(48,39+grain));data[i*4]=value;data[i*4+1]=value+1;data[i*4+2]=value+2;data[i*4+3]=255}
  const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(2,65);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;return texture;
}

function RealFormulaCar({carRef}:{carRef:React.RefObject<THREE.Group|null>}){
  const gltf=useGLTF("/assets/3d/formula-one-car.glb");
  const prepared=useMemo(()=>{const scene=gltf.scene.clone(true);scene.getObjectByName("Light")?.removeFromParent();scene.getObjectByName("Camera")?.removeFromParent();scene.traverse(child=>{if(child instanceof THREE.Mesh){child.castShadow=true;child.receiveShadow=true;const materials=Array.isArray(child.material)?child.material:[child.material];materials.forEach(material=>{if(material instanceof THREE.MeshStandardMaterial){material.envMapIntensity=1.25;material.roughness=Math.max(.18,material.roughness*.82);if(material.map)material.map.anisotropy=8}})}});const box=new THREE.Box3().setFromObject(scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),scale=.34/Math.max(size.x,size.z);return{scene,scale,offset:new THREE.Vector3(-center.x*scale,-box.min.y*scale,-center.z*scale)}},[gltf.scene]);
  return <group ref={carRef}><group position={prepared.offset} scale={prepared.scale}><primitive object={prepared.scene}/></group><pointLight position={[0,.04,-.08]} color="#ff1839" intensity={.22} distance={.3}/></group>;
}

function TrackWorld({coordinates,laps,onLap,motion}:{coordinates:number[][];laps:Lap[];onLap:(lap:Lap)=>void;motion:React.MutableRefObject<Motion>}){
  const car=useRef<THREE.Group>(null),lastLap=useRef(-1);const curve=useMemo(()=>new THREE.CatmullRomCurve3(coordinates.map(([x,z])=>new THREE.Vector3(x,0,z)),true,"centripetal",.2),[coordinates]);
  const road=useMemo(()=>ribbon(curve,.34,.05),[curve]),shoulder=useMemo(()=>ribbon(curve,.43,.038),[curve]),roadEdge=useMemo(()=>ribbonEdge(curve,.43,.038,-.035),[curve]),asphalt=useMemo(()=>asphaltMap(),[]);
  useEffect(()=>()=>asphalt.dispose(),[asphalt]);
  const durations=useMemo(()=>laps.map(l=>l.seconds||90),[laps]),total=durations.reduce((a,b)=>a+b,0)||1;
  const trackMarkers=useMemo(()=>Array.from({length:220},(_,i)=>{const t=i/220,p=curve.getPointAt(t),tan=curve.getTangentAt(t).normalize(),side=new THREE.Vector3(-tan.z,0,tan.x);return{p,tan,side,color:i%2?"#edece7":"#c8152e"}}),[curve]);
  const rails=useMemo(()=>[-1,1].map(edge=>new THREE.CatmullRomCurve3(Array.from({length:360},(_,i)=>{const p=curve.getPointAt(i/360),tan=curve.getTangentAt(i/360).normalize(),side=new THREE.Vector3(-tan.z,0,tan.x);return p.addScaledVector(side,edge*.29).add(new THREE.Vector3(0,.085,0))}),true,"centripetal",.2)),[curve]);
  const start=useMemo(()=>{const p=curve.getPointAt(.008),tan=curve.getTangentAt(.008).normalize();return{p,tan,side:new THREE.Vector3(-tan.z,0,tan.x),angle:Math.atan2(tan.x,tan.z)}},[curve]);
  useFrame(({clock})=>{if(!car.current||!laps.length)return;const raceSeconds=clock.getElapsedTime()%total;let elapsed=0,index=0;while(index<durations.length-1&&elapsed+durations[index]<raceSeconds)elapsed+=durations[index++];const progress=(raceSeconds-elapsed)/durations[index],p=curve.getPointAt(progress),tan=curve.getTangentAt(progress).normalize();car.current.position.copy(p).add(new THREE.Vector3(0,.064,0));car.current.rotation.y=Math.atan2(tan.x,tan.z);motion.current.position.copy(car.current.position);motion.current.tangent.copy(tan);if(lastLap.current!==index){lastLap.current=index;onLap(laps[index])}});
  return <>
    <mesh geometry={roadEdge} castShadow receiveShadow><meshStandardMaterial color="#151719" roughness={.82} metalness={.08}/></mesh>
    <mesh geometry={shoulder} receiveShadow><meshPhysicalMaterial color="#4b4e50" roughness={.96} clearcoat={.04}/></mesh><mesh geometry={road} receiveShadow><meshPhysicalMaterial map={asphalt} color="#a4a4a4" roughness={.92} clearcoat={.06} clearcoatRoughness={.8}/></mesh>
    {trackMarkers.map((k,i)=>[-1,1].map(edge=>{const p=k.p.clone().addScaledVector(k.side,edge*.188);return <mesh key={`${i}-${edge}`} position={[p.x,.057,p.z]} rotation={[0,Math.atan2(k.tan.x,k.tan.z),0]} castShadow receiveShadow><boxGeometry args={[.034,.014,.07]}/><meshPhysicalMaterial color={k.color} roughness={.62} clearcoat={.22}/></mesh>}))}
    {rails.map((rail,i)=><mesh key={i} castShadow><tubeGeometry args={[rail,420,.009,8,true]}/><meshStandardMaterial color="#aeb3b6" roughness={.28} metalness={.88}/></mesh>)}
    {Array.from({length:12},(_,i)=>{const p=start.p.clone().addScaledVector(start.side,(i-5.5)*.026);return <mesh key={`start-${i}`} position={[p.x,.058,p.z]} rotation={[0,start.angle,0]}><boxGeometry args={[.027,.004,.075]}/><meshStandardMaterial color={i%2?"#f5f5f1":"#141516"} roughness={.7}/></mesh>})}
    <Suspense fallback={<Html center><div className="model-loading">Loading detailed F1 car…</div></Html>}><RealFormulaCar carRef={car}/></Suspense>
  </>;
}

function CameraRig({mode,motion}:{mode:View;motion:React.MutableRefObject<Motion>}){
  const {camera}=useThree(),look=useRef(new THREE.Vector3());
  useFrame(()=>{if(mode!=="follow")return;const {position,tangent}=motion.current,side=new THREE.Vector3(-tangent.z,0,tangent.x),desired=position.clone().addScaledVector(tangent,-.5).addScaledVector(side,.12);desired.y+=.21;camera.position.lerp(desired,.075);look.current.lerp(position.clone().addScaledVector(tangent,.3).add(new THREE.Vector3(0,.04,0)),.11);camera.lookAt(look.current)});return null;
}

export default function CircuitReplay3D({laps,raceName,driverName}:{laps:Lap[];raceName:string;driverName:string}){
  const coordinates=useCircuitCoordinates(raceName),[current,setCurrent]=useState<Lap>(laps[0]||{lap:0,seconds:0,time:"—",position:0}),[view,setView]=useState<View>("overview"),motion=useRef<Motion>({position:new THREE.Vector3(),tangent:new THREE.Vector3(0,0,1)});
  return <div className="replay-shell realistic asset-replay"><div className="replay-vignette"/><div className="replay-hud"><span><i/> REAL-TIME LAP REPLAY</span><strong>LAP {current.lap||"—"} <em>/ {laps.length||"—"}</em></strong><b>{current.time}</b><small>Position {current.position||"—"} · {driverName}</small><div><i/><span>1× RECORDED LAP TIME · SLOW, TRUE-PACE VIEW</span></div></div>
    <div className="replay-camera-controls"><button aria-pressed={view==="overview"} className={view==="overview"?"active":""} onClick={()=>setView("overview")}>Circuit view</button><button aria-pressed={view==="follow"} className={view==="follow"?"active":""} onClick={()=>setView("follow")}>Follow car</button></div>
    <Canvas shadows dpr={[1,1.6]} gl={{antialias:true,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:.9}} camera={{near:.02,far:80}}>
      <color attach="background" args={["#080a0d"]}/><fog attach="fog" args={["#080a0d",13,27]}/><PerspectiveCamera key={view} makeDefault position={view==="follow"?[0,.3,-.8]:[7.4,7.8,8.8]} fov={view==="follow"?50:38}/><CameraRig mode={view} motion={motion}/>
      <hemisphereLight args={["#dcecff","#11161d",1.65]}/><directionalLight position={[-6,10,5]} intensity={3.8} color="#fff1d6" castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9}/>
      <TrackWorld coordinates={coordinates} laps={laps} onLap={setCurrent} motion={motion}/><Environment preset="warehouse" environmentIntensity={.72}/>
      {view==="overview"&&<OrbitControls enablePan={false} minDistance={6.5} maxDistance={16} minPolarAngle={.38} maxPolarAngle={1.18} enableDamping dampingFactor={.045} target={[0,0,0]} autoRotate autoRotateSpeed={.035}/>} 
    </Canvas>
    <div className="replay-caption"><div><strong>{raceName}</strong><small>REALISTIC 3D CIRCUIT MODEL · 1× LAP TIME</small></div><span>Only the circuit and car are shown. Drag and zoom in Circuit view, or choose Follow car. Circuit: bacinger/f1-circuits (MIT). Car: Excalibur (CC BY).</span></div>
  </div>;
}
