from __future__ import annotations

import json
import random
import threading
import time
from pathlib import Path

from flask import Flask, jsonify

app = Flask(__name__)

REPO_ROOT = Path(__file__).resolve().parents[2]
MAP_FILE = REPO_ROOT / "data" / "sylhet_map.json"
FLOODED_WEIGHT = 9999
CHAOS_INTERVAL_SECONDS = 30


def load_map_data() -> dict:
    with MAP_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


map_data = load_map_data()


def trigger_chaos() -> None:
    while True:
        time.sleep(CHAOS_INTERVAL_SECONDS)

        safe_roads = [
            edge
            for edge in map_data["edges"]
            if edge["type"] == "road" and not edge["is_flooded"]
        ]
        flooded_roads = [
            edge
            for edge in map_data["edges"]
            if edge["type"] == "road" and edge["is_flooded"]
        ]

        event_type = random.choices(["flood", "recede"], weights=[0.6, 0.4])[0]

        if event_type == "flood" and safe_roads:
            target = random.choice(safe_roads)
            target["is_flooded"] = True
            target["original_weight"] = target.get("base_weight_mins", 45)
            target["base_weight_mins"] = FLOODED_WEIGHT
            print(
                f"CHAOS EVENT: Flood! Route {target['id']} "
                f"({target['source']} -> {target['target']}) is washed out!"
            )
        elif event_type == "recede" and flooded_roads:
            target = random.choice(flooded_roads)
            target["is_flooded"] = False
            target["base_weight_mins"] = target.get("original_weight", 45)
            print(
                f"CHAOS EVENT: Water receded! Route {target['id']} "
                f"({target['source']} -> {target['target']}) is now clear!"
            )
        else:
            print("Chaos Engine: Water levels are stable this cycle.")


@app.get("/api/network/status")
def get_network_status():
    return jsonify(map_data)


@app.post("/api/network/reset")
def reset_network():
    global map_data
    map_data = load_map_data()
    return jsonify(
        {
            "status": "success",
            "message": "The floodwaters have receded. Map reset.",
        }
    )


def main() -> None:
    print("HackFusion 2026: Huntrix Delta Chaos API is running!")
    print(f"Scenario file: {MAP_FILE}")
    print("Endpoint available at: http://127.0.0.1:5000/api/network/status")

    chaos_thread = threading.Thread(target=trigger_chaos, daemon=True)
    chaos_thread.start()

    app.run(debug=False, port=5000)


if __name__ == "__main__":
    main()
