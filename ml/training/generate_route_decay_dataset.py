from __future__ import annotations

import csv
import json
import math
import random
from dataclasses import dataclass
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
MAP_FILE = REPO_ROOT / "data" / "sylhet_map.json"
EDGE_CONTEXT_FILE = REPO_ROOT / "data" / "edge_environment_context.json"
SENSOR_OUTPUT = REPO_ROOT / "ml" / "training" / "rainfall_sensor_feed.csv"
TRAINING_OUTPUT = REPO_ROOT / "ml" / "training" / "route_decay_training.csv"

SECONDS = 360
WINDOW = 60
SEED = 20260412


@dataclass
class EdgeContext:
    edge_id: str
    edge_type: str
    elevation_m: float
    soil_saturation_base: float


def load_edges() -> list[EdgeContext]:
    with MAP_FILE.open("r", encoding="utf-8") as file:
        graph = json.load(file)
    with EDGE_CONTEXT_FILE.open("r", encoding="utf-8") as file:
        raw_context = json.load(file)

    edges: list[EdgeContext] = []
    for edge in graph["edges"]:
        context = raw_context[edge["id"]]
        edges.append(
            EdgeContext(
                edge_id=edge["id"],
                edge_type=edge["type"],
                elevation_m=float(context["elevation_m"]),
                soil_saturation_base=float(context["soil_saturation_base"]),
            )
        )
    return edges


def generate_sensor_feed(edges: list[EdgeContext]) -> list[dict[str, float | int | str]]:
    random.seed(SEED)
    rows: list[dict[str, float | int | str]] = []
    start_ts = 1_775_000_000

    for edge in edges:
        storm_center = random.randint(140, 310)
        storm_width = random.randint(28, 64)
        jitter = 4 if edge.edge_type == "airway" else 7

        for second in range(SECONDS):
            pulse = 42 * math.exp(-((second - storm_center) ** 2) / (2 * (storm_width**2)))
            trend = max(0, 0.035 * second)
            terrain_bias = (1 - (edge.elevation_m / 38)) * 8
            saturation_bias = edge.soil_saturation_base * 16
            noise = random.uniform(-jitter, jitter)
            rainfall_rate = max(0.0, 9 + pulse + trend + terrain_bias + saturation_bias + noise)

            rows.append(
                {
                    "timestamp": start_ts + second,
                    "edge_id": edge.edge_id,
                    "rainfall_rate_mm_h": round(rainfall_rate, 3),
                }
            )

    return rows


def build_training_rows(
    edges: list[EdgeContext],
    sensor_rows: list[dict[str, float | int | str]],
) -> list[dict[str, float | int | str]]:
    by_edge: dict[str, list[dict[str, float | int | str]]] = {}
    for row in sensor_rows:
        by_edge.setdefault(str(row["edge_id"]), []).append(row)

    training_rows: list[dict[str, float | int | str]] = []
    for edge in edges:
        series = by_edge[edge.edge_id]
        for end_idx in range(WINDOW, len(series), 12):
            window_rows = series[end_idx - WINDOW : end_idx]
            cumulative_rainfall = sum(float(row["rainfall_rate_mm_h"]) / 3600 for row in window_rows)
            rainfall_delta = float(window_rows[-1]["rainfall_rate_mm_h"]) - float(window_rows[0]["rainfall_rate_mm_h"])
            soil_saturation = min(
                1.0,
                edge.soil_saturation_base + cumulative_rainfall / 150 + max(rainfall_delta, 0) / 220,
            )
            flooding_score = (
                cumulative_rainfall * 0.055
                + rainfall_delta * 0.028
                + (1.0 - min(edge.elevation_m / 35, 1.0)) * 2.1
                + soil_saturation * 2.6
            )
            label = 1 if flooding_score > 3.9 else 0
            training_rows.append(
                {
                    "edge_id": edge.edge_id,
                    "edge_type": edge.edge_type,
                    "timestamp": int(window_rows[-1]["timestamp"]),
                    "cumulative_rainfall_mm": round(cumulative_rainfall, 6),
                    "rainfall_rate_change": round(rainfall_delta, 6),
                    "elevation_m": edge.elevation_m,
                    "soil_saturation_proxy": round(soil_saturation, 6),
                    "label_impassable_2h": label,
                }
            )

    return training_rows


def write_csv(path: Path, rows: list[dict[str, float | int | str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    edges = load_edges()
    sensor_rows = generate_sensor_feed(edges)
    training_rows = build_training_rows(edges, sensor_rows)
    write_csv(SENSOR_OUTPUT, sensor_rows)
    write_csv(TRAINING_OUTPUT, training_rows)
    print(f"Wrote {len(sensor_rows)} sensor rows to {SENSOR_OUTPUT}")
    print(f"Wrote {len(training_rows)} training rows to {TRAINING_OUTPUT}")


if __name__ == "__main__":
    main()
