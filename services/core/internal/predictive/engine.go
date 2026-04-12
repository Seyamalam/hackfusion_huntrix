package predictive

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"time"

	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/routing"
	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/scenario"
)

type Model struct {
	Features  []string           `json:"features"`
	Intercept float64            `json:"intercept"`
	Means     map[string]float64 `json:"means"`
	Scales    map[string]float64 `json:"scales"`
	Threshold float64            `json:"threshold"`
	Weights   map[string]float64 `json:"weights"`
}

type Metrics struct {
	Accuracy  float64 `json:"accuracy"`
	F1        float64 `json:"f1"`
	FN        int     `json:"fn"`
	FP        int     `json:"fp"`
	Precision float64 `json:"precision"`
	Recall    float64 `json:"recall"`
	Threshold float64 `json:"threshold"`
	TN        int     `json:"tn"`
	TP        int     `json:"tp"`
}

type EnvironmentContext struct {
	ElevationM         float64 `json:"elevation_m"`
	SoilSaturationBase float64 `json:"soil_saturation_base"`
}

type SensorRow struct {
	Timestamp        int64
	EdgeID           string
	RainfallRateMMHr float64
}

type FeatureSnapshot struct {
	EdgeID                 string             `json:"edge_id"`
	EdgeType               scenario.LinkType  `json:"edge_type"`
	CumulativeRainfallMM   float64            `json:"cumulative_rainfall_mm"`
	RainfallRateChange     float64            `json:"rainfall_rate_change"`
	ElevationM             float64            `json:"elevation_m"`
	SoilSaturationProxy    float64            `json:"soil_saturation_proxy"`
	LastSensorTimestampUTC string             `json:"last_sensor_timestamp_utc"`
	ContributingFeatures   map[string]float64 `json:"contributing_features"`
}

type EdgePrediction struct {
	EdgeID              string          `json:"edge_id"`
	Probability         float64         `json:"probability"`
	HighRisk            bool            `json:"high_risk"`
	PredictionTimestamp string          `json:"prediction_timestamp"`
	FeatureSnapshot     FeatureSnapshot `json:"feature_snapshot"`
	PenalizedWeightMins int             `json:"penalized_weight_mins"`
}

type Recommendation struct {
	Vehicle          string   `json:"vehicle"`
	Source           string   `json:"source"`
	Target           string   `json:"target"`
	BaselineETAMins  int      `json:"baseline_eta_mins"`
	ProactiveETAMins int      `json:"proactive_eta_mins"`
	Changed          bool     `json:"changed"`
	AvoidedEdges     []string `json:"avoided_edges"`
	Message          string   `json:"message"`
}

type Status struct {
	Model           Model            `json:"model"`
	Metrics         Metrics          `json:"metrics"`
	Predictions     []EdgePrediction `json:"predictions"`
	Recommendations []Recommendation `json:"recommendations"`
}

const (
	defaultSensorWindow = 60
	riskPenaltyMins     = 85
)

func Evaluate(graph scenario.Graph, repoRoot string) (Status, error) {
	model, err := loadModel(filepath.Join(repoRoot, "ml", "artifacts", "route_decay_model.json"))
	if err != nil {
		return Status{}, err
	}
	metrics, err := loadMetrics(filepath.Join(repoRoot, "ml", "artifacts", "route_decay_metrics.json"))
	if err != nil {
		return Status{}, err
	}
	context, err := loadEnvironmentContext(filepath.Join(repoRoot, "data", "edge_environment_context.json"))
	if err != nil {
		return Status{}, err
	}
	sensorRows, err := loadSensorRows(filepath.Join(repoRoot, "ml", "training", "rainfall_sensor_feed.csv"))
	if err != nil {
		return Status{}, err
	}

	features := buildFeatureSnapshots(graph, sensorRows, context)
	predictions := make([]EdgePrediction, 0, len(features))
	for _, snapshot := range features {
		probability, contributions := predict(model, snapshot)
		snapshot.ContributingFeatures = contributions
		penalizedWeight := 0
		if probability >= model.Threshold {
			if edge := findEdgeByID(graph, snapshot.EdgeID); edge != nil {
				penalizedWeight = edge.EffectiveTravelTimeMins() + riskPenaltyMins
			}
		}
		predictions = append(predictions, EdgePrediction{
			EdgeID:              snapshot.EdgeID,
			Probability:         round(probability),
			HighRisk:            probability >= model.Threshold,
			PredictionTimestamp: time.Now().UTC().Format(time.RFC3339),
			FeatureSnapshot:     snapshot,
			PenalizedWeightMins: penalizedWeight,
		})
	}

	penalizedGraph := ApplyPenalties(graph, predictions)
	recommendations := buildRecommendations(graph, penalizedGraph, predictions)
	sort.Slice(predictions, func(i, j int) bool {
		return predictions[i].Probability > predictions[j].Probability
	})

	return Status{
		Model:           model,
		Metrics:         metrics,
		Predictions:     predictions,
		Recommendations: recommendations,
	}, nil
}

func ApplyPenalties(graph scenario.Graph, predictions []EdgePrediction) scenario.Graph {
	penalties := make(map[string]EdgePrediction, len(predictions))
	for _, prediction := range predictions {
		penalties[prediction.EdgeID] = prediction
	}

	clone := graph
	clone.Edges = append([]scenario.Edge(nil), graph.Edges...)
	for i := range clone.Edges {
		prediction, ok := penalties[clone.Edges[i].ID]
		if !ok || !prediction.HighRisk {
			continue
		}
		clone.Edges[i].TravelTimeMins = prediction.PenalizedWeightMins
		clone.Edges[i].BaseWeightMins = prediction.PenalizedWeightMins
		clone.Edges[i].RiskScore = minInt(clone.Edges[i].RiskScore+4, 10)
	}
	return clone
}

func buildRecommendations(baseGraph, penalizedGraph scenario.Graph, predictions []EdgePrediction) []Recommendation {
	baseEngine := routing.NewEngine(baseGraph)
	penalizedEngine := routing.NewEngine(penalizedGraph)
	penaltyLookup := make(map[string]EdgePrediction, len(predictions))
	for _, prediction := range predictions {
		if prediction.HighRisk {
			penaltyLookup[prediction.EdgeID] = prediction
		}
	}

	requests := []routing.RouteRequest{
		{VehicleType: routing.VehicleTypeTruck, Source: "N1", Target: "N3", PayloadKg: 100},
		{VehicleType: routing.VehicleTypeSpeedboat, Source: "N1", Target: "N3", PayloadKg: 80},
		{VehicleType: routing.VehicleTypeDrone, Source: "N2", Target: "N4", PayloadKg: 12},
	}

	results := make([]Recommendation, 0, len(requests))
	for _, request := range requests {
		basePlan, baseErr := baseEngine.ComputeRoute(request)
		penalizedPlan, penalizedErr := penalizedEngine.ComputeRoute(request)
		if baseErr != nil || penalizedErr != nil {
			continue
		}

		avoidedEdges := make([]string, 0)
		for _, leg := range basePlan.Legs {
			if _, ok := penaltyLookup[leg.EdgeID]; ok {
				avoidedEdges = append(avoidedEdges, leg.EdgeID)
			}
		}

		changed := false
		if len(basePlan.Legs) != len(penalizedPlan.Legs) || basePlan.TotalCost != penalizedPlan.TotalCost {
			changed = true
		}
		if !changed {
			for idx := range basePlan.Legs {
				if basePlan.Legs[idx].EdgeID != penalizedPlan.Legs[idx].EdgeID {
					changed = true
					break
				}
			}
		}

		message := "Current route remains acceptable under predictive decay."
		if changed || len(avoidedEdges) > 0 {
			message = "Advance reroute recommended before the edge becomes impassable."
		}

		results = append(results, Recommendation{
			Vehicle:          string(request.VehicleType),
			Source:           request.Source,
			Target:           request.Target,
			BaselineETAMins:  basePlan.TotalMins,
			ProactiveETAMins: penalizedPlan.TotalMins,
			Changed:          changed,
			AvoidedEdges:     avoidedEdges,
			Message:          message,
		})
	}

	return results
}

func buildFeatureSnapshots(
	graph scenario.Graph,
	sensorRows []SensorRow,
	context map[string]EnvironmentContext,
) []FeatureSnapshot {
	byEdge := make(map[string][]SensorRow)
	for _, row := range sensorRows {
		byEdge[row.EdgeID] = append(byEdge[row.EdgeID], row)
	}

	snapshots := make([]FeatureSnapshot, 0, len(graph.Edges))
	for _, edge := range graph.Edges {
		rows := byEdge[edge.ID]
		if len(rows) == 0 {
			continue
		}
		windowRows := rows
		if len(windowRows) > defaultSensorWindow {
			windowRows = windowRows[len(windowRows)-defaultSensorWindow:]
		}

		env := context[edge.ID]
		cumulative := 0.0
		for _, row := range windowRows {
			cumulative += row.RainfallRateMMHr / 3600
		}
		rateChange := windowRows[len(windowRows)-1].RainfallRateMMHr - windowRows[0].RainfallRateMMHr
		soilProxy := env.SoilSaturationBase + cumulative/150 + maxFloat(rateChange, 0)/220
		if soilProxy > 1 {
			soilProxy = 1
		}

		snapshots = append(snapshots, FeatureSnapshot{
			EdgeID:                 edge.ID,
			EdgeType:               edge.Type,
			CumulativeRainfallMM:   round(cumulative),
			RainfallRateChange:     round(rateChange),
			ElevationM:             env.ElevationM,
			SoilSaturationProxy:    round(soilProxy),
			LastSensorTimestampUTC: time.Unix(windowRows[len(windowRows)-1].Timestamp, 0).UTC().Format(time.RFC3339),
			ContributingFeatures:   map[string]float64{},
		})
	}
	return snapshots
}

func predict(model Model, snapshot FeatureSnapshot) (float64, map[string]float64) {
	raw := map[string]float64{
		"cumulative_rainfall_mm": snapshot.CumulativeRainfallMM,
		"rainfall_rate_change":   snapshot.RainfallRateChange,
		"elevation_m":            snapshot.ElevationM,
		"soil_saturation_proxy":  snapshot.SoilSaturationProxy,
	}
	logit := model.Intercept
	contributions := make(map[string]float64, len(model.Features))
	for _, feature := range model.Features {
		standardized := (raw[feature] - model.Means[feature]) / model.Scales[feature]
		contribution := standardized * model.Weights[feature]
		logit += contribution
		contributions[feature] = round(contribution)
	}
	return 1 / (1 + math.Exp(-logit)), contributions
}

func loadModel(path string) (Model, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return Model{}, fmt.Errorf("read model artifact: %w", err)
	}
	var model Model
	if err := json.Unmarshal(raw, &model); err != nil {
		return Model{}, fmt.Errorf("decode model artifact: %w", err)
	}
	return model, nil
}

func loadMetrics(path string) (Metrics, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return Metrics{}, fmt.Errorf("read metrics artifact: %w", err)
	}
	var metrics Metrics
	if err := json.Unmarshal(raw, &metrics); err != nil {
		return Metrics{}, fmt.Errorf("decode metrics artifact: %w", err)
	}
	return metrics, nil
}

func loadEnvironmentContext(path string) (map[string]EnvironmentContext, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read edge context: %w", err)
	}
	var context map[string]EnvironmentContext
	if err := json.Unmarshal(raw, &context); err != nil {
		return nil, fmt.Errorf("decode edge context: %w", err)
	}
	return context, nil
}

func loadSensorRows(path string) ([]SensorRow, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open sensor feed: %w", err)
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("read sensor csv: %w", err)
	}
	if len(records) < 2 {
		return nil, fmt.Errorf("sensor csv missing data rows")
	}

	rows := make([]SensorRow, 0, len(records)-1)
	for _, record := range records[1:] {
		timestamp, _ := strconv.ParseInt(record[0], 10, 64)
		rate, _ := strconv.ParseFloat(record[2], 64)
		rows = append(rows, SensorRow{
			Timestamp:        timestamp,
			EdgeID:           record[1],
			RainfallRateMMHr: rate,
		})
	}
	return rows, nil
}

func findEdgeByID(graph scenario.Graph, edgeID string) *scenario.Edge {
	for i := range graph.Edges {
		if graph.Edges[i].ID == edgeID {
			return &graph.Edges[i]
		}
	}
	return nil
}

func round(value float64) float64 {
	return math.Round(value*10000) / 10000
}

func minInt(left, right int) int {
	if left < right {
		return left
	}
	return right
}

func maxFloat(left, right float64) float64 {
	if left > right {
		return left
	}
	return right
}
