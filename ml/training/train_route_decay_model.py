from __future__ import annotations

import csv
import json
import math
import random
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
TRAINING_INPUT = REPO_ROOT / "ml" / "training" / "route_decay_training.csv"
MODEL_OUTPUT = REPO_ROOT / "ml" / "artifacts" / "route_decay_model.json"
METRICS_OUTPUT = REPO_ROOT / "ml" / "artifacts" / "route_decay_metrics.json"
SEED = 20260412
FEATURES = [
    "cumulative_rainfall_mm",
    "rainfall_rate_change",
    "elevation_m",
    "soil_saturation_proxy",
]


def load_rows():
    rows = []
    with TRAINING_INPUT.open("r", encoding="utf-8") as file:
        for row in csv.DictReader(file):
            rows.append(row)
    return rows


def standardize(train_rows):
    means = {}
    scales = {}
    for feature in FEATURES:
        values = [float(row[feature]) for row in train_rows]
        mean = sum(values) / len(values)
        variance = sum((value - mean) ** 2 for value in values) / len(values)
        scale = math.sqrt(variance) or 1.0
        means[feature] = mean
        scales[feature] = scale
    return means, scales


def vectorize(rows, means, scales):
    xs = []
    ys = []
    for row in rows:
      xs.append([(float(row[feature]) - means[feature]) / scales[feature] for feature in FEATURES])
      ys.append(int(row["label_impassable_2h"]))
    return xs, ys


def sigmoid(value):
    if value >= 0:
        z = math.exp(-value)
        return 1 / (1 + z)
    z = math.exp(value)
    return z / (1 + z)


def train_logistic(xs, ys, learning_rate=0.12, epochs=1800):
    weights = [0.0 for _ in FEATURES]
    bias = 0.0

    for _ in range(epochs):
        grad_w = [0.0 for _ in FEATURES]
        grad_b = 0.0
        for features, label in zip(xs, ys):
            logit = bias + sum(weight * feature for weight, feature in zip(weights, features))
            prediction = sigmoid(logit)
            error = prediction - label
            for index, feature in enumerate(features):
                grad_w[index] += error * feature
            grad_b += error

        sample_count = len(xs)
        for index in range(len(weights)):
            weights[index] -= learning_rate * grad_w[index] / sample_count
        bias -= learning_rate * grad_b / sample_count

    return weights, bias


def evaluate(xs, ys, weights, bias, threshold=0.7):
    tp = fp = tn = fn = 0
    for features, label in zip(xs, ys):
        probability = sigmoid(bias + sum(weight * feature for weight, feature in zip(weights, features)))
        predicted = 1 if probability >= threshold else 0
        if predicted == 1 and label == 1:
            tp += 1
        elif predicted == 1 and label == 0:
            fp += 1
        elif predicted == 0 and label == 0:
            tn += 1
        else:
            fn += 1

    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = (2 * precision * recall) / (precision + recall) if precision + recall else 0.0
    accuracy = (tp + tn) / max(tp + tn + fp + fn, 1)
    return {
        "accuracy": round(accuracy, 4),
        "f1": round(f1, 4),
        "fn": fn,
        "fp": fp,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "threshold": threshold,
        "tn": tn,
        "tp": tp,
    }


def main():
    rows = load_rows()
    random.Random(SEED).shuffle(rows)
    split = int(len(rows) * 0.8)
    train_rows = rows[:split]
    test_rows = rows[split:]

    means, scales = standardize(train_rows)
    train_xs, train_ys = vectorize(train_rows, means, scales)
    test_xs, test_ys = vectorize(test_rows, means, scales)
    weights, bias = train_logistic(train_xs, train_ys)
    metrics = evaluate(test_xs, test_ys, weights, bias)

    model = {
        "features": FEATURES,
        "intercept": round(bias, 6),
        "means": {feature: round(means[feature], 6) for feature in FEATURES},
        "scales": {feature: round(scales[feature], 6) for feature in FEATURES},
        "threshold": 0.7,
        "weights": {feature: round(weight, 6) for feature, weight in zip(FEATURES, weights)},
    }

    MODEL_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    MODEL_OUTPUT.write_text(json.dumps(model, indent=2), encoding="utf-8")
    METRICS_OUTPUT.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(f"Wrote model to {MODEL_OUTPUT}")
    print(f"Wrote metrics to {METRICS_OUTPUT}")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
