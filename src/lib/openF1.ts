export const OPENF1_API = "https://api.openf1.org/v1";

export type OpenF1Snapshot = {
  source: "openf1" | "local";
  sessionKey?: number;
  sessionName: string;
  meetingName: string;
  drivers: Array<{ driverNumber: number; name: string; acronym: string; team: string }>;
  laps: Array<{ driverNumber: number; lapNumber: number; duration: number | null; s1: number | null; s2: number | null; s3: number | null }>;
};

export async function getMonacoSnapshot(): Promise<OpenF1Snapshot> {
  const fallback: OpenF1Snapshot = { source: "local", sessionName: "Race", meetingName: "Monaco Grand Prix", drivers: [], laps: [] };
  try {
    const sessionResponse = await fetch(`${OPENF1_API}/sessions?country_name=Monaco&year=2025&session_name=Race`, { next: { revalidate: 3600 } });
    if (!sessionResponse.ok) return fallback;
    const sessions = await sessionResponse.json() as Array<{ session_key: number; session_name: string; meeting_name: string }>;
    const session = sessions.at(-1);
    if (!session) return fallback;
    const [driversResponse, lapsResponse] = await Promise.all([
      fetch(`${OPENF1_API}/drivers?session_key=${session.session_key}`, { next: { revalidate: 3600 } }),
      fetch(`${OPENF1_API}/laps?session_key=${session.session_key}&lap_number>=70`, { next: { revalidate: 3600 } }),
    ]);
    if (!driversResponse.ok || !lapsResponse.ok) return fallback;
    const driverRows = await driversResponse.json() as Array<{ driver_number: number; full_name: string; name_acronym: string; team_name: string }>;
    const lapRows = await lapsResponse.json() as Array<{ driver_number: number; lap_number: number; lap_duration: number | null; duration_sector_1: number | null; duration_sector_2: number | null; duration_sector_3: number | null }>;
    const tracked = new Set([1, 16, 44]);
    return {
      source: "openf1", sessionKey: session.session_key, sessionName: session.session_name, meetingName: session.meeting_name,
      drivers: driverRows.filter((d) => tracked.has(d.driver_number)).map((d) => ({ driverNumber: d.driver_number, name: d.full_name, acronym: d.name_acronym, team: d.team_name })),
      laps: lapRows.filter((lap) => tracked.has(lap.driver_number)).slice(-18).map((lap) => ({ driverNumber: lap.driver_number, lapNumber: lap.lap_number, duration: lap.lap_duration, s1: lap.duration_sector_1, s2: lap.duration_sector_2, s3: lap.duration_sector_3 })),
    };
  } catch {
    return fallback;
  }
}
