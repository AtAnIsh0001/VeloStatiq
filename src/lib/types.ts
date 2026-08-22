export type SportMode = "football" | "f1";

export type Metric = { label: string; value: number };

export type Athlete = {
  id: string;
  name: string;
  shortName: string;
  sport: SportMode;
  role: string;
  team: string;
  nationality: string;
  number: string;
  rating: number;
  status: string;
  metrics: Metric[];
};

export type TimelineEvent = {
  id: string;
  time: string;
  type: "goal" | "card" | "attack" | "pit" | "flag" | "sector";
  title: string;
  detail: string;
  side: "home" | "away";
};

export type TelemetryPoint = {
  distance: number;
  primary: number;
  secondary: number;
  gear?: number;
};
