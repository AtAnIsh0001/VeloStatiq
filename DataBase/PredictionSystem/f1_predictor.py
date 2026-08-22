#!/usr/bin/env python3
"""VeloStatiq Formula One prediction engine.

Uses only Python's standard library. Every forecast is produced from local CSV
records with linear weighted estimates and sigmoid probability calibration.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import statistics
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

SYSTEM_ROOT = Path(__file__).resolve().parent
DATA_ROOT = SYSTEM_ROOT.parent / "FormulaOne"


def rows(filename: str) -> list[dict[str, str]]:
    with (DATA_ROOT / filename).open(encoding="utf-8", newline="") as stream:
        return list(csv.DictReader(stream))


def numeric(value: Any, default: float = 0.0) -> float:
    try:
        parsed = float(value)
        return parsed if math.isfinite(parsed) else default
    except (TypeError, ValueError):
        return default


def median(values: list[float], default: float = 0.0) -> float:
    clean = [value for value in values if math.isfinite(value)]
    return statistics.median(clean) if clean else default


def mean(values: list[float], default: float = 0.0) -> float:
    clean = [value for value in values if math.isfinite(value)]
    return statistics.fmean(clean) if clean else default


def sigmoid(score: float) -> float:
    return 1.0 / (1.0 + math.exp(-max(-60.0, min(60.0, score))))


def mode(values: list[str], default: str) -> str:
    clean = [value for value in values if value]
    return Counter(clean).most_common(1)[0][0] if clean else default


def lap_label(seconds: float) -> str:
    minutes = int(seconds // 60)
    return f"{minutes}:{seconds % 60:06.3f}"


def predict(driver: str, race: str, track_temp: float, rain: float, fuel: float, safety_car: bool, recent_races: int = 0, recent_finish: float = 0.0, recent_points: float = 0.0, recent_dnf_rate: float = 0.0) -> dict[str, Any]:
    summaries = rows("driver_race_summary.csv")
    pits = rows("pit_strategy.csv")
    pit_stops = rows("pit_stops.csv")
    compounds = rows("compound_performance.csv")
    stints = rows("stint_analysis.csv")
    identities = rows("drivers.csv")

    driver = driver.upper().strip()
    driver_rows = [item for item in summaries if item.get("Driver", "").upper() == driver]
    has_driver_archive = bool(driver_rows)
    available_races = sorted({item["RaceName"] for item in (driver_rows or summaries) if item.get("RaceName")})
    selected_race = race if race in available_races else mode([item.get("RaceName", "") for item in (driver_rows or summaries)], available_races[0])
    exact_rows = [item for item in driver_rows if item.get("RaceName") == selected_race]
    field_rows = [item for item in summaries if item.get("RaceName") == selected_race]
    comparable = (exact_rows or driver_rows) if has_driver_archive else (field_rows or summaries)
    team = mode([item.get("Team", "") for item in comparable], "Unknown")

    best_laps = [numeric(item.get("best_lap_sec")) for item in comparable]
    best_laps = [value for value in best_laps if 45.0 < value < 180.0]
    historical_best = median(best_laps, 90.0)
    consistency = mean([numeric(item.get("pace_consistency")) for item in comparable if numeric(item.get("pace_consistency")) > 0], 5.0)

    circuit_rows = [item for item in compounds if item.get("RaceName") == selected_race]
    circuit_laps = [numeric(item.get("fastest_lap_sec")) for item in circuit_rows]
    circuit_laps = [value for value in circuit_laps if 45.0 < value < 180.0]
    circuit_benchmark = median(circuit_laps, historical_best)

    # Linear lap model. The environmental terms are explicit scenario penalties.
    temperature_penalty = abs(track_temp - 32.0) * 0.018
    rain_penalty = max(0.0, min(100.0, rain)) * 0.032
    fuel_penalty = max(0.0, min(120.0, fuel)) * 0.006
    predicted_seconds = (
        0.68 * historical_best
        + 0.32 * circuit_benchmark
        + min(1.2, consistency * 0.025)
        + temperature_penalty
        + rain_penalty
        + fuel_penalty
    )

    field_laps = [numeric(item.get("best_lap_sec")) for item in summaries if item.get("RaceName") == selected_race]
    field_laps = [value for value in field_laps if value > 0]
    percentile = sum(value >= historical_best for value in field_laps) / len(field_laps) if field_laps and has_driver_archive else 0.5
    recent_finish_score = max(0.0, min(1.0, (21.0 - recent_finish) / 20.0)) if recent_races else 0.5
    recent_points_score = max(0.0, min(1.0, recent_points / 25.0)) if recent_races else 0.5
    recent_reliability = 1.0 - max(0.0, min(1.0, recent_dnf_rate))
    fastest_probability = sigmoid(-0.70 + 1.75 * percentile - 0.025 * consistency - 0.012 * rain + 0.45 * recent_finish_score + 0.35 * recent_points_score + 0.25 * recent_reliability)

    matching_pits = [item for item in pits if item.get("Driver", "").upper() == driver and item.get("RaceName") == selected_race]
    driver_pits = matching_pits or [item for item in pits if item.get("Driver", "").upper() == driver]
    pit_laps = [numeric(item.get("LapNumber")) for item in driver_pits if numeric(item.get("LapNumber")) > 0]
    base_pit_lap = round(median(pit_laps, 24.0))
    pit_shift = -4 if safety_car else (-3 if rain > 45 else 0)
    pit_center = max(1, base_pit_lap + pit_shift)

    stops_per_race: dict[str, int] = defaultdict(int)
    for item in driver_pits:
        stops_per_race[f"{item.get('Season')}-{item.get('RaceName')}"] += 1
    expected_stops = max(1, round(mean(list(stops_per_race.values()), 1.6)))
    if rain > 55:
        expected_stops += 1

    identity = next((item for item in identities if item.get("code", "").upper() == driver), {})
    driver_id = identity.get("driverId")
    durations = [numeric(item.get("duration")) for item in pit_stops if item.get("driverId") == driver_id]
    durations = [value for value in durations if 15.0 <= value <= 60.0]
    predicted_pit_duration = median(durations, 24.2)

    used_compounds = [item.get("Compound", "") for item in driver_pits]
    start_compound = "INTERMEDIATE" if rain > 55 else mode(used_compounds, "MEDIUM")
    dry_alternatives = [item for item in ["SOFT", "MEDIUM", "HARD"] if item != start_compound]
    sequence = ([start_compound, "INTERMEDIATE", "WET"] if rain > 55 else [start_compound, *dry_alternatives])[: expected_stops + 1]
    tyre_plan: list[dict[str, Any]] = []
    running_lap = 1
    for compound in sequence:
        team_row = next((item for item in stints if item.get("Team") == team and item.get("Compound") == compound), None)
        fallback = {"SOFT": 16, "MEDIUM": 23, "HARD": 31, "INTERMEDIATE": 18, "WET": 16}.get(compound, 22)
        length = round(numeric(team_row.get("typical_stint_length") if team_row else None, fallback))
        tyre_plan.append({"compound": compound, "fromLap": running_lap, "length": max(5, length)})
        running_lap = pit_center if len(tyre_plan) == 1 else running_lap + max(5, length)

    archive_strength = min(2.0, len(comparable) * 0.13) if has_driver_archive else -0.35
    confidence_score = -1.10 + archive_strength + min(1.0, len(driver_pits) * 0.025) - consistency * 0.018 + min(0.6, recent_races * 0.12) - recent_dnf_rate * 0.25
    confidence = sigmoid(confidence_score)

    return {
        "engine": "Python 3 standard library",
        "method": "linear weighted estimates + sigmoid calibration",
        "driver": driver,
        "race": selected_race,
        "predictedLapSeconds": predicted_seconds,
        "predictedLap": lap_label(predicted_seconds),
        "fastestLapProbability": fastest_probability,
        "pitWindow": {"start": max(1, pit_center - 2), "end": pit_center + 3},
        "expectedStops": expected_stops,
        "predictedPitDuration": predicted_pit_duration,
        "tyrePlan": tyre_plan,
        "confidence": confidence,
        "scenario": {"trackTemperature": track_temp, "rainProbability": rain, "fuelLoad": fuel, "safetyCar": safety_car},
        "inputs": {
            "driverSamples": len(comparable) if has_driver_archive else 0,
            "pitSamples": len(driver_pits),
            "consistency": consistency,
            "historicalBest": historical_best,
            "circuitBenchmark": circuit_benchmark,
            "recentRaceSamples": recent_races,
            "recentAverageFinish": recent_finish,
            "recentPointsPerRace": recent_points,
            "recentDnfRate": recent_dnf_rate,
            "archiveFallback": not has_driver_archive,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate an VeloStatiq F1 race prediction from local CSV data.")
    parser.add_argument("--driver", default="VER", help="Three-letter driver code, for example VER or HAM")
    parser.add_argument("--race", default="", help="Historical race name used as the circuit model")
    parser.add_argument("--track-temp", type=float, default=32.0, help="Track temperature in Celsius")
    parser.add_argument("--rain", type=float, default=0.0, help="Rain probability from 0 to 100")
    parser.add_argument("--fuel", type=float, default=45.0, help="Fuel load in kilograms")
    parser.add_argument("--safety-car", action="store_true", help="Move the modeled pit window earlier")
    parser.add_argument("--recent-races", type=int, default=0, help="Number of recent live race results supplied")
    parser.add_argument("--recent-finish", type=float, default=0.0, help="Average finishing position over recent races")
    parser.add_argument("--recent-points", type=float, default=0.0, help="Average points per recent race")
    parser.add_argument("--recent-dnf-rate", type=float, default=0.0, help="Recent DNF share from zero to one")
    parser.add_argument("--output", type=Path, help="Optional JSON output file")
    args = parser.parse_args()
    result = predict(args.driver, args.race, args.track_temp, args.rain, args.fuel, args.safety_car, args.recent_races, args.recent_finish, args.recent_points, args.recent_dnf_rate)
    payload = json.dumps(result, indent=2, ensure_ascii=True)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload + "\n", encoding="utf-8")
    print(payload)


if __name__ == "__main__":
    main()
