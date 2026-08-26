import { NextRequest, NextResponse } from "next/server";
import { predictF1Race } from "../../../lib/f1PredictionEngine";
import { getF1DriverHistory } from "../../../lib/f1DriverHistory";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const driver = (params.get("driver") || "VER").replace(/[^A-Z]/gi, "").slice(0, 4).toUpperCase();
  const driverId = (params.get("driverId") || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 50);
  const history = driverId ? await getF1DriverHistory(driverId).catch(() => null) : null;
  const prediction = await predictF1Race({
    driver, race: (params.get("race") || "").slice(0, 80),
    trackTemperature: Math.min(70, Math.max(0, Number(params.get("trackTemp")) || 32)),
    rainProbability: Math.min(100, Math.max(0, Number(params.get("rain")) || 0)),
    fuelLoad: Math.min(120, Math.max(0, Number(params.get("fuel")) || 45)),
    safetyCar: params.get("safetyCar") === "true",
    recentRaceSamples: history?.metrics.races || 0,
    recentAverageFinish: history?.metrics.averageFinish || 0,
    recentPointsPerRace: history?.metrics.races ? history.metrics.points / history.metrics.races : 0,
    recentDnfRate: history?.metrics.races ? history.metrics.dnfs / history.metrics.races : 0,
  });
  return NextResponse.json(prediction, { headers: { "Cache-Control": "no-store" } });
}
