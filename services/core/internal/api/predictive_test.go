package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
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
