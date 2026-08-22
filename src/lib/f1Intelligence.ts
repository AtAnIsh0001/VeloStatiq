import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { runF1PythonPrediction } from "./f1PythonPrediction";
import { getNextF1Race } from "./f1DriverHistory";

type Row = Record<string, string>;
type Driver = { code: string; name: string; number: string; nationality: string; team: string; races: number; fastestLap: number; consistency: number; bestFinish: number; bestLaps: number };
const root = path.join(process.cwd(), "DataBase", "FormulaOne");
let cache: Promise<{ summary: Row[]; compounds: Row[]; drivers: Row[] }> | null = null;

function parseLine(line: string) { const out: string[] = []; let value = "", quoted = false; for (let i=0;i<line.length;i++) { const char=line[i]; if(char==='"'&&line[i+1]==='"'){value+='"';i++;}else if(char==='"')quoted=!quoted;else if(char===","&&!quoted){out.push(value);value="";}else value+=char;} out.push(value); return out; }
async function csv(name: string) { const text=await fs.readFile(path.join(root,name),"utf8"); const [header,...lines]=text.split(/\r?\n/).filter(Boolean); const keys=parseLine(header); return lines.map((line)=>Object.fromEntries(parseLine(line).map((value,index)=>[keys[index],value]))); }
function data(){return cache ||= Promise.all([csv("driver_race_summary.csv"),csv("compound_performance.csv"),csv("drivers.csv")]).then(([summary,compounds,drivers])=>({summary,compounds,drivers}));}
function number(value:string|undefined){const parsed=Number(value);return Number.isFinite(parsed)?parsed:0;} function mean(values:number[]){return values.length?values.reduce((a,b)=>a+b,0)/values.length:0;} function mode(values:string[],fallback="Unknown"){const counts=new Map<string,number>();for(const value of values.filter(Boolean))counts.set(value,(counts.get(value)||0)+1);return [...counts].sort((a,b)=>b[1]-a[1])[0]?.[0]||fallback;}
function normalizeRaceName(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/grand prix|circuit|international|park|autodrome|autodromo|street|the|of/g,"").replace(/[^a-z0-9]/g,"");}
function matchArchiveRace(races:string[],nextRace:Awaited<ReturnType<typeof getNextF1Race>>){
  if(!nextRace)return races[0];
  const aliases:Record<string,string>={dutch:"Netherlands",british:"Britain",unitedstates:"USA",brazilian:"São Paulo",saopaulo:"São Paulo",mexicocity:"Mexico City",mexican:"Mexico City",hungarian:"Hungary",italian:"Italy",japanese:"Japan",spanish:"Spain",belgian:"Belgium",austrian:"Austria",australian:"Australia",canadian:"Canada",saudiarabian:"Saudi Arabia",emiliaromagna:"Emilia Romagna"};
  const candidates=[nextRace.name,nextRace.circuit,nextRace.locality,nextRace.country].map(normalizeRaceName);
  for(const candidate of candidates){const alias=aliases[candidate];if(alias&&races.includes(alias))return alias;const direct=races.find((race)=>{const value=normalizeRaceName(race);return value===candidate||value.includes(candidate)||candidate.includes(value)});if(direct)return direct;}
  return races[0];
}

export async function getF1Intelligence(driverCode="VER"){
  const [source,nextRaceRaw]=await Promise.all([data(),getNextF1Race()]); const nextRace=nextRaceRaw?{...nextRaceRaw,source:"Jolpica F1"}:null; const grouped=new Map<string,Row[]>(); for(const row of source.summary){const values=grouped.get(row.Driver)||[];values.push(row);grouped.set(row.Driver,values);} const identities=new Map(source.drivers.filter((row)=>row.code).map((row)=>[row.code,row]));
  const drivers:Driver[]=[...grouped].map(([code,values])=>{const identity=identities.get(code);const positions=values.map((row)=>number(row.best_position)).filter(Boolean);const laps=values.map((row)=>number(row.best_lap_sec)).filter(Boolean);return{code,name:identity?`${identity.forename} ${identity.surname}`:code,number:identity?.number==="\\N"?"—":identity?.number||"—",nationality:identity?.nationality||"Unknown",team:mode(values.map((row)=>row.Team)),races:values.length,fastestLap:laps.length?Math.min(...laps):0,consistency:mean(values.map((row)=>number(row.pace_consistency)).filter(Boolean)),bestFinish:positions.length?Math.min(...positions):0,bestLaps:values.reduce((sum,row)=>sum+number(row.personal_best_laps),0)};}).filter((driver)=>driver.races>=8).sort((a,b)=>b.races-a.races||a.fastestLap-b.fastestLap);
  const selected=drivers.find((driver)=>driver.code===driverCode)||drivers[0]; const races=[...new Set(source.summary.map((row)=>row.RaceName))].sort(); const selectedRace=matchArchiveRace(races,nextRaceRaw);
  const prediction=await runF1PythonPrediction({driver:selected.code,race:selectedRace});
  const compounds=["SOFT","MEDIUM","HARD"].map((compound)=>{const values=source.compounds.filter((row)=>row.Compound===compound);const fastest=values.map((row)=>number(row.fastest_lap_sec)).filter(Boolean);return{compound,averageLap:mean(values.map((row)=>number(row.avg_lap_time_sec)).filter(Boolean)),fastestLap:fastest.length?Math.min(...fastest):0,averageLife:mean(values.map((row)=>number(row.avg_tyre_life_laps)).filter(Boolean))};});
  return{generatedAt:new Date().toISOString(),source:"Python prediction engine · VeloStatiq DataBase",nextRace,drivers,races,selectedDriver:selected,selectedRace,prediction,compounds};
}
