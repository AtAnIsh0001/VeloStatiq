###############################################
# f1 predictor thing (my summer project)
# it reads the csv files in the FormulaOne folder
# and tries to guess the lap time, pit stop
# window etc for a driver.
# only uses standard library!!
###############################################

import csv
import json
import math
import os
import statistics
import sys
from collections import Counter, defaultdict

# the csv files are one folder up in FormulaOne
HERE = os.path.dirname(os.path.abspath(__file__))
DATA_FOLDER = os.path.join(HERE, "..", "FormulaOne")


# reads one csv file and gives back a list of dicts
def read_csv_file(filename):
    f = open(os.path.join(DATA_FOLDER, filename))
    all_rows = list(csv.DictReader(f))
    f.close()
    return all_rows


# converts a value to a number. if it doesnt work give back the fallback
def to_number(value, fallback=0.0):
    try:
        number = float(value)
        if math.isfinite(number):
            return number
        else:
            return fallback
    except:
        return fallback


# median but it ignores broken values
def calc_median(numbers, fallback=0.0):
    good_values = []
    for n in numbers:
        if math.isfinite(n):
            good_values.append(n)
    if len(good_values) == 0:
        return fallback
    return statistics.median(good_values)


# average but it ignores broken values
def calc_average(numbers, fallback=0.0):
    good_values = []
    for n in numbers:
        if math.isfinite(n):
            good_values.append(n)
    if len(good_values) == 0:
        return fallback
    return statistics.fmean(good_values)


# squishes any score into a 0 to 1 probability (sigmoid, found on wikipedia)
def squish(score):
    if score > 60:
        score = 60.0
    if score < -60:
        score = -60.0
    return 1.0 / (1.0 + math.exp(-score))


# returns the value that shows up the most times
def most_common_value(values, fallback):
    clean_values = []
    for v in values:
        if v:
            clean_values.append(v)
    if len(clean_values) == 0:
        return fallback
    counts = Counter(clean_values)
    return counts.most_common(1)[0][0]


# turns 88.165 seconds into 1:28.165 because that looks nicer
def nice_lap_time(seconds):
    minutes = int(seconds // 60)
    seconds_left = seconds % 60
    text = "%.3f" % seconds_left
    while len(text) < 6:
        text = "0" + text
    return str(minutes) + ":" + text


# the main prediction function. driver is like "VER", race is optional
def predict(driver, race, track_temp=32.0, rain=0.0, fuel=45.0, safety_car=False,
            recent_races=0, recent_finish=0.0, recent_points=0.0, recent_dnf_rate=0.0):

    # first load ALL the csv files
    summaries = read_csv_file("driver_race_summary.csv")
    pits = read_csv_file("pit_strategy.csv")
    pit_stops = read_csv_file("pit_stops.csv")
    compounds = read_csv_file("compound_performance.csv")
    stints = read_csv_file("stint_analysis.csv")
    identities = read_csv_file("drivers.csv")

    # uppercase so it always matches the csv
    driver = driver.upper().strip()

    # step 1: find all the rows we have for this driver
    driver_rows = []
    for row in summaries:
        if row.get("Driver", "").upper() == driver:
            driver_rows.append(row)

    has_driver_archive = len(driver_rows) > 0

    # if we dont know this driver just use everybody instead
    if has_driver_archive:
        source_rows = driver_rows
    else:
        source_rows = summaries

    # step 2: figure out which race to use
    available_races = []
    for row in source_rows:
        race_name = row.get("RaceName")
        if race_name and race_name not in available_races:
            available_races.append(race_name)
    available_races.sort()

    if race in available_races:
        selected_race = race
    else:
        # take the race that shows up the most in his data
        all_race_names = []
        for row in source_rows:
            all_race_names.append(row.get("RaceName", ""))
        selected_race = most_common_value(all_race_names, available_races[0])

    # rows for this driver at this exact race + rows for the whole field
    exact_rows = []
    for row in driver_rows:
        if row.get("RaceName") == selected_race:
            exact_rows.append(row)

    field_rows = []
    for row in summaries:
        if row.get("RaceName") == selected_race:
            field_rows.append(row)

    # which rows do we compare against
    if has_driver_archive:
        if len(exact_rows) > 0:
            comparable = exact_rows
        else:
            comparable = driver_rows
    else:
        if len(field_rows) > 0:
            comparable = field_rows
        else:
            comparable = summaries

    # step 3: what team does he drive for (most common team in the rows)
    team_names = []
    for row in comparable:
        team_names.append(row.get("Team", ""))
    team = most_common_value(team_names, "Unknown")

    # step 4: best laps. throw away crazy values (under 45s or over 180s is impossible)
    best_laps = []
    for row in comparable:
        value = to_number(row.get("best_lap_sec"))
        if 45.0 < value < 180.0:
            best_laps.append(value)
    historical_best = calc_median(best_laps, 90.0)

    # how consistent is he (only count positive values)
    consistency_values = []
    for row in comparable:
        value = to_number(row.get("pace_consistency"))
        if value > 0:
            consistency_values.append(value)
    consistency = calc_average(consistency_values, 5.0)

    # step 5: fastest lap ever on this track (cleaned up the same way)
    circuit_laps = []
    for row in compounds:
        if row.get("RaceName") == selected_race:
            value = to_number(row.get("fastest_lap_sec"))
            if 45.0 < value < 180.0:
                circuit_laps.append(value)
    circuit_benchmark = calc_median(circuit_laps, historical_best)

    # step 6: THE ACTUAL PREDICTION!!
    # mix of his own best lap and the track record plus penalties:
    temp_penalty = abs(track_temp - 32.0) * 0.018   # too hot or too cold track is slower

    rain_clamped = rain
    if rain_clamped < 0:
        rain_clamped = 0.0
    if rain_clamped > 100:
        rain_clamped = 100.0
    rain_penalty = rain_clamped * 0.032             # rain makes you slow

    fuel_clamped = fuel
    if fuel_clamped < 0:
        fuel_clamped = 0.0
    if fuel_clamped > 120:
        fuel_clamped = 120.0
    fuel_penalty = fuel_clamped * 0.006             # heavy car = slow

    consistency_part = consistency * 0.025
    if consistency_part > 1.2:
        consistency_part = 1.2

    predicted_seconds = (0.68 * historical_best
                         + 0.32 * circuit_benchmark
                         + consistency_part
                         + temp_penalty
                         + rain_penalty
                         + fuel_penalty)

    # step 7: chance of getting the fastest lap
    # compare his best lap against everyones best lap in this race
    field_laps = []
    for row in summaries:
        if row.get("RaceName") == selected_race:
            value = to_number(row.get("best_lap_sec"))
            if value > 0:
                field_laps.append(value)

    if len(field_laps) > 0 and has_driver_archive:
        how_many_slower = 0
        for value in field_laps:
            if value >= historical_best:
                how_many_slower += 1
        percentile = how_many_slower / len(field_laps)
    else:
        percentile = 0.5  # no data so pretend he is average

    # recent form scores (only if the user gave us recent races)
    if recent_races:
        recent_finish_score = (21.0 - recent_finish) / 20.0
        if recent_finish_score < 0.0:
            recent_finish_score = 0.0
        if recent_finish_score > 1.0:
            recent_finish_score = 1.0

        recent_points_score = recent_points / 25.0
        if recent_points_score < 0.0:
            recent_points_score = 0.0
        if recent_points_score > 1.0:
            recent_points_score = 1.0
    else:
        recent_finish_score = 0.5
        recent_points_score = 0.5

    recent_dnf = recent_dnf_rate
    if recent_dnf < 0.0:
        recent_dnf = 0.0
    if recent_dnf > 1.0:
        recent_dnf = 1.0
    recent_reliability = 1.0 - recent_dnf

    fastest_probability = squish(-0.70
                                 + 1.75 * percentile
                                 - 0.025 * consistency
                                 - 0.012 * rain
                                 + 0.45 * recent_finish_score
                                 + 0.35 * recent_points_score
                                 + 0.25 * recent_reliability)

    # step 8: pit stop window
    # first try his pits at THIS race, otherwise all his pits everywhere
    matching_pits = []
    for row in pits:
        if row.get("Driver", "").upper() == driver and row.get("RaceName") == selected_race:
            matching_pits.append(row)

    if len(matching_pits) > 0:
        driver_pits = matching_pits
    else:
        driver_pits = []
        for row in pits:
            if row.get("Driver", "").upper() == driver:
                driver_pits.append(row)

    pit_laps = []
    for row in driver_pits:
        lap = to_number(row.get("LapNumber"))
        if lap > 0:
            pit_laps.append(lap)
    base_pit_lap = round(calc_median(pit_laps, 24.0))

    # safety car or lots of rain means pitting earlier
    if safety_car == True:
        pit_shift = -4
    elif rain > 45:
        pit_shift = -3
    else:
        pit_shift = 0

    pit_center = base_pit_lap + pit_shift
    if pit_center < 1:
        pit_center = 1

    # how many stops does he usually do per race
    stops_per_race = defaultdict(int)
    for row in driver_pits:
        key = str(row.get("Season")) + "-" + str(row.get("RaceName"))
        stops_per_race[key] += 1
    expected_stops = round(calc_average(list(stops_per_race.values()), 1.6))
    if expected_stops < 1:
        expected_stops = 1
    if rain > 55:
        expected_stops += 1  # wet race needs an extra stop

    # step 9: how long do HIS pit stops usually take
    identity = {}
    for row in identities:
        if row.get("code", "").upper() == driver:
            identity = row
            break
    driver_id = identity.get("driverId")

    pit_durations = []
    for row in pit_stops:
        if row.get("driverId") == driver_id:
            duration = to_number(row.get("duration"))
            if 15.0 <= duration <= 60.0:
                pit_durations.append(duration)
    predicted_pit_duration = calc_median(pit_durations, 24.2)

    # step 10: the tyre plan
    used_compounds = []
    for row in driver_pits:
        used_compounds.append(row.get("Compound", ""))

    if rain > 55:
        start_compound = "INTERMEDIATE"
    else:
        start_compound = most_common_value(used_compounds, "MEDIUM")

    # build the list of tyres he will use, in order
    if rain > 55:
        compound_sequence = [start_compound, "INTERMEDIATE", "WET"]
    else:
        compound_sequence = [start_compound]
        for compound in ["SOFT", "MEDIUM", "HARD"]:
            if compound != start_compound:
                compound_sequence.append(compound)
    compound_sequence = compound_sequence[:expected_stops + 1]

    # normal stint lengths for when we cant find the team data
    normal_stint_length = {"SOFT": 16, "MEDIUM": 23, "HARD": 31, "INTERMEDIATE": 18, "WET": 16}

    tyre_plan = []
    running_lap = 1
    for compound in compound_sequence:
        # look up how long his team normally stays on this tyre
        stint_row = None
        for row in stints:
            if row.get("Team") == team and row.get("Compound") == compound:
                stint_row = row
                break

        if compound in normal_stint_length:
            fallback_length = normal_stint_length[compound]
        else:
            fallback_length = 22

        if stint_row != None:
            length = round(to_number(stint_row.get("typical_stint_length"), fallback_length))
        else:
            length = fallback_length
        if length < 5:
            length = 5

        tyre_plan.append({"compound": compound, "fromLap": running_lap, "length": length})

        # the first stint always ends at the pit window
        if len(tyre_plan) == 1:
            running_lap = pit_center
        else:
            running_lap = running_lap + length

    # step 11: how sure are we about all of this
    if has_driver_archive:
        archive_strength = len(comparable) * 0.13
        if archive_strength > 2.0:
            archive_strength = 2.0
    else:
        archive_strength = -0.35  # no data about this driver so trust it less

    pit_data_bonus = len(driver_pits) * 0.025
    if pit_data_bonus > 1.0:
        pit_data_bonus = 1.0

    recent_form_bonus = recent_races * 0.12
    if recent_form_bonus > 0.6:
        recent_form_bonus = 0.6

    confidence_score = (-1.10
                        + archive_strength
                        + pit_data_bonus
                        - consistency * 0.018
                        + recent_form_bonus
                        - recent_dnf_rate * 0.25)
    confidence = squish(confidence_score)

    # step 12: put everything together for the json
    result = {
        "engine": "Python 3 standard library",
        "method": "linear weighted estimates + sigmoid calibration",
        "driver": driver,
        "race": selected_race,
        "predictedLapSeconds": predicted_seconds,
        "predictedLap": nice_lap_time(predicted_seconds),
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
    return result


# this part runs when you do: python3 f1_predictor.py
def main():
    arguments = sys.argv[1:]

    # default settings
    driver = "VER"
    race = ""
    track_temp = 32.0
    rain = 0.0
    fuel = 45.0
    safety_car = False
    recent_races = 0
    recent_finish = 0.0
    recent_points = 0.0
    recent_dnf_rate = 0.0
    output_file = None

    # read the command line options (i is where we are in the list)
    i = 0
    while i < len(arguments):
        option = arguments[i]

        if option == "--driver":
            driver = arguments[i + 1]
            i += 2
        elif option == "--race":
            race = arguments[i + 1]
            i += 2
        elif option == "--track-temp":
            track_temp = float(arguments[i + 1])
            i += 2
        elif option == "--rain":
            rain = float(arguments[i + 1])
            i += 2
        elif option == "--fuel":
            fuel = float(arguments[i + 1])
            i += 2
        elif option == "--safety-car":
            safety_car = True
            i += 1
        elif option == "--recent-races":
            recent_races = int(arguments[i + 1])
            i += 2
        elif option == "--recent-finish":
            recent_finish = float(arguments[i + 1])
            i += 2
        elif option == "--recent-points":
            recent_points = float(arguments[i + 1])
            i += 2
        elif option == "--recent-dnf-rate":
            recent_dnf_rate = float(arguments[i + 1])
            i += 2
        elif option == "--output":
            output_file = arguments[i + 1]
            i += 2
        elif option == "--help" or option == "-h":
            print("usage: python3 f1_predictor.py [--driver VER] [--race \"Abu Dhabi\"]")
            print("  --track-temp 32       track temperature in celsius")
            print("  --rain 0              rain chance from 0 to 100")
            print("  --fuel 45             fuel load in kg")
            print("  --safety-car          moves the pit window earlier")
            print("  --recent-races 5      how many recent races you watched")
            print("  --recent-finish 3.2   average finish position recently")
            print("  --recent-points 15    average points recently")
            print("  --recent-dnf-rate 0   did he crash lately (0 to 1)")
            print("  --output file.json    also save the result to a file")
            return
        else:
            # dont crash on unknown options just skip them
            print("i dont know this option:", option)
            i += 1

    result = predict(driver, race, track_temp, rain, fuel, safety_car,
                     recent_races, recent_finish, recent_points, recent_dnf_rate)

    result_json = json.dumps(result, indent=2, ensure_ascii=True)

    # also save it to a file if the user asked for it
    if output_file != None:
        output_folder = os.path.dirname(output_file)
        if output_folder != "" and os.path.exists(output_folder) == False:
            os.makedirs(output_folder)
        f = open(output_file, "w")
        f.write(result_json + "\n")
        f.close()

    print(result_json)


if __name__ == "__main__":
    main()
