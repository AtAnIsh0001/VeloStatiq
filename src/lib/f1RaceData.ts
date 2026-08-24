import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

const BASE = "https://api.jolpi.ca/ergast/f1";
const headers = { "User-Agent": "VeloStatiqSports/0.2" };
const cachePath = path.join(process.cwd(), "DataBase", "cache", "formula-one", "last-race.json");

type DriverInfo = { driverId: string; permanentNumber?: string; code?: string; url?: string; givenName: string; familyName: string; dateOfBirth: string; nationality: string };
type ConstructorInfo = { constructorId: string; name: string; nationality: string };
type RawResult = { number: string; position: string; points: string; Driver: DriverInfo; Constructor: ConstructorInfo; grid: string; laps: string; status: string; Time?: { millis?: string; time?: string }; FastestLap?: { rank: string; lap: string; Time?: { time?: string } } };
type RawRace = { season: string; round: string; raceName: string; date: string; time?: string; Circuit: { circuitId: string; circuitName: string; Location: { locality: string; country: string; lat?: string; long?: string } }; Results?: RawResult[]; PitStops?: Array<{ driverId: string; lap: string; stop: string; time: string; duration: string }>; Laps?: Array<{ number: string; Timings: Array<{ driverId: string; position: string; time: string }> }> };
type RawStanding = { position: string; points: string; wins: string; Driver: DriverInfo; Constructors: ConstructorInfo[] };

function timeSeconds(value?: string) { if (!value) return 0; const parts=value.split(":").map(Number); if(parts.length===3)return parts[0]*3600+parts[1]*60+parts[2]; if(parts.length===2)return parts[0]*60+parts[1]; return Number(value)||0; }
async function getJson(url:string){const response=await fetch(url,{headers,next:{revalidate:900},signal:AbortSignal.timeout(9000)});if(!response.ok)throw new Error(`Jolpica request failed: ${response.status}`);return response.json();}

export async function getLatestF1RaceData(){
  try{
    const [resultsBody,pitsBody,standingsBody]=await Promise.all([getJson(`${BASE}/current/last/results/?limit=100`),getJson(`${BASE}/current/last/pitstops/?limit=100`),getJson(`${BASE}/current/driverstandings/?limit=100`)]);
    const race=(resultsBody as {MRData:{RaceTable:{Races:RawRace[]}}}).MRData.RaceTable.Races[0]; if(!race?.Results?.length)throw new Error("No completed race returned");
    const pitRace=(pitsBody as {MRData:{RaceTable:{Races:RawRace[]}}}).MRData.RaceTable.Races[0];
    const rawStandings=(standingsBody as {MRData:{StandingsTable:{StandingsLists:Array<{season:string;round:string;DriverStandings:RawStanding[]}>}}}).MRData.StandingsTable.StandingsLists[0];
    const winner=race.Results[0]; const lapsBody=await getJson(`${BASE}/current/last/drivers/${winner.Driver.driverId}/laps/?limit=100`); const lapRace=(lapsBody as {MRData:{RaceTable:{Races:RawRace[]}}}).MRData.RaceTable.Races[0];
    const results=race.Results.map((result)=>({position:Number(result.position),grid:Number(result.grid),positionsGained:Number(result.grid)-Number(result.position),points:Number(result.points),laps:Number(result.laps),status:result.status,time:result.Time?.time||"—",driver:{id:result.Driver.driverId,code:result.Driver.code||result.number,name:`${result.Driver.givenName} ${result.Driver.familyName}`,number:result.Driver.permanentNumber||result.number,birthDate:result.Driver.dateOfBirth,nationality:result.Driver.nationality,profileUrl:result.Driver.url||""},team:{id:result.Constructor.constructorId,name:result.Constructor.name,nationality:result.Constructor.nationality},fastestLap:result.FastestLap?{rank:Number(result.FastestLap.rank),lap:Number(result.FastestLap.lap),time:result.FastestLap.Time?.time||"—",seconds:timeSeconds(result.FastestLap.Time?.time)}:null}));
    const pitStops=(pitRace?.PitStops||[]).map((pit)=>{const result=results.find((item)=>item.driver.id===pit.driverId);return{driverId:pit.driverId,driverCode:result?.driver.code||pit.driverId.toUpperCase().slice(0,3),driverName:result?.driver.name||pit.driverId,lap:Number(pit.lap),stop:Number(pit.stop),clockTime:pit.time,duration:Number(pit.duration)};});
    const winnerLaps=(lapRace?.Laps||[]).map((lap)=>({lap:Number(lap.number),position:Number(lap.Timings[0]?.position||1),time:lap.Timings[0]?.time||"—",seconds:timeSeconds(lap.Timings[0]?.time)}));
    const standings=(rawStandings?.DriverStandings||[]).map((standing)=>({position:Number(standing.position),points:Number(standing.points),wins:Number(standing.wins),driver:{id:standing.Driver.driverId,code:standing.Driver.code||standing.Driver.permanentNumber||"—",name:`${standing.Driver.givenName} ${standing.Driver.familyName}`,number:standing.Driver.permanentNumber||"—",birthDate:standing.Driver.dateOfBirth,nationality:standing.Driver.nationality,profileUrl:standing.Driver.url||""},team:standing.Constructors[0]?.name||"Unknown"}));
    const fastest=results.filter((item)=>item.fastestLap).sort((a,b)=>(a.fastestLap?.rank||99)-(b.fastestLap?.rank||99))[0];
    const payload={source:"Jolpica F1",fetchedAt:new Date().toISOString(),race:{season:Number(race.season),round:Number(race.round),name:race.raceName,date:`${race.date}T${race.time||"00:00:00Z"}`,circuit:{id:race.Circuit.circuitId,name:race.Circuit.circuitName,locality:race.Circuit.Location.locality,country:race.Circuit.Location.country,latitude:Number(race.Circuit.Location.lat||0),longitude:Number(race.Circuit.Location.long||0)},winner:results[0],fastestLap:fastest?.fastestLap?{...fastest.fastestLap,driverName:fastest.driver.name,driverCode:fastest.driver.code}:null,totalLaps:Number(winner.laps),results,pitStops,winnerLaps},standings};
    try{await fs.mkdir(path.dirname(cachePath),{recursive:true});await fs.writeFile(cachePath,JSON.stringify(payload));}catch{}
    return payload;
  }catch(error){try{return JSON.parse(await fs.readFile(cachePath,"utf8"));}catch{throw error;}}
}
