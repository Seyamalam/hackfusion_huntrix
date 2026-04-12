package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/predictive"
)

func TestHandlePredictiveStatusReturnsModelMetricsAndPredictions(t *testing.T) {
	server := NewServer(filepath.Join("..", "..", "..", "..", "data", "sylhet_map.json"), "")

	request := httptest.NewRequest(http.MethodGet, "/api/predictive/status", nil)
	recorder := httptest.NewRecorder()

	server.handlePredictiveStatus(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	var response PredictiveStatusResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if response.Status.Metrics.F1 <= 0 {
		t.Fatal("expected non-zero model metrics")
	}
	if len(response.Status.Predictions) == 0 {
		t.Fatal("expected predictions in response")
	}
	if response.RecomputeMs > 2000 {
		t.Fatalf("expected predictive evaluation under 2s, got %dms", response.RecomputeMs)
	}
}

func TestApplyPredictivePenaltiesChangesRoutingGraph(t *testing.T) {
	server := NewServer(filepath.Join("..", "..", "..", "..", "data", "sylhet_map.json"), "")

	request := httptest.NewRequest(http.MethodGet, "/api/route/preview", nil)
	graph, err := server.loadGraph(request)
	if err != nil {
		t.Fatalf("load graph: %v", err)
	}

	status, err := predictive.Evaluate(graph, server.repoRoot())
	if err != nil {
		t.Fatalf("predictive evaluate: %v", err)
	}

	penalized := server.applyPredictivePenalties(graph)

	changed := false
	for index := range graph.Edges {
		if graph.Edges[index].ID != penalized.Edges[index].ID {
			t.Fatalf("edge ordering changed unexpectedly")
		}
		if graph.Edges[index].TravelTimeMins != penalized.Edges[index].TravelTimeMins ||
			graph.Edges[index].BaseWeightMins != penalized.Edges[index].BaseWeightMins ||
			graph.Edges[index].RiskScore != penalized.Edges[index].RiskScore {
			changed = true
			break
		}
	}

	highRiskCount := 0
	for _, prediction := range status.Predictions {
		if prediction.HighRisk {
			highRiskCount++
		}
	}

	if highRiskCount > 0 && !changed {
		t.Fatal("expected predictive penalties to modify at least one edge when high-risk predictions exist")
	}
	if highRiskCount == 0 && changed {
		t.Fatal("did not expect routing graph changes when no high-risk predictions exist")
	}
}
