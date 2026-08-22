import "server-only";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execute = promisify(execFile);

export type F1Prediction = {
  engine: string; method: string; driver: string; race: string; predictedLapSeconds: number; predictedLap: string;
  fastestLapProbability: number; pitWindow: { start: number; end: number }; expectedStops: number; predictedPitDuration: number;
  tyrePlan: Array<{ compound: string; fromLap: number; length: number }>; confidence: number;
  scenario: { trackTemperature: number; rainProbability: number; fuelLoad: number; safetyCar: boolean };
  inputs: { driverSamples: number; pitSamples: number; consistency: number; historicalBest: number; circuitBenchmark: number; recentRaceSamples: number; recentAverageFinish: number; recentPointsPerRace: number; recentDnfRate: number; archiveFallback: boolean };
};

export async function runF1PythonPrediction(options: { driver: string; race?: string; trackTemperature?: number; rainProbability?: number; fuelLoad?: number; safetyCar?: boolean; recentRaceSamples?: number; recentAverageFinish?: number; recentPointsPerRace?: number; recentDnfRate?: number }): Promise<F1Prediction> {
  const script = path.join(process.cwd(), "DataBase", "PredictionSystem", "f1_predictor.py");
  const args = [script, "--driver", options.driver, "--race", options.race || "", "--track-temp", String(options.trackTemperature ?? 32), "--rain", String(options.rainProbability ?? 0), "--fuel", String(options.fuelLoad ?? 45)];
  args.push("--recent-races", String(options.recentRaceSamples ?? 0), "--recent-finish", String(options.recentAverageFinish ?? 0), "--recent-points", String(options.recentPointsPerRace ?? 0), "--recent-dnf-rate", String(options.recentDnfRate ?? 0));
  if (options.safetyCar) args.push("--safety-car");
  const { stdout } = await execute("python3", args, { timeout: 20_000, maxBuffer: 1_000_000 });
  return JSON.parse(stdout) as F1Prediction;
}
