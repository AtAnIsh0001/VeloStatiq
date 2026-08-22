declare module "espn-fantasy-football-api/node" {
  export class Client {
    constructor(options: { leagueId: number; espnS2?: string; SWID?: string });
    setCookies(options: { espnS2: string; SWID: string }): void;
    getLeagueInfo(options: { seasonId: number }): Promise<Record<string, unknown>>;
    getTeamsAtWeek(options: { seasonId: number; scoringPeriodId?: number }): Promise<Array<Record<string, unknown>>>;
    getBoxscoreForWeek(options: { seasonId: number; matchupPeriodId?: number; scoringPeriodId?: number }): Promise<Array<Record<string, unknown>>>;
    getFreeAgents(options: { seasonId: number; scoringPeriodId?: number }): Promise<Array<Record<string, unknown>>>;
    getDraftInfo(options: { seasonId: number }): Promise<Array<Record<string, unknown>>>;
  }
}
