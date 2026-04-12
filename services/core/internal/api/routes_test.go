package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
)

func TestHandleActiveRoutesRecomputesUnderTwoSeconds(t *testing.T) {
	server := NewServer(filepath.Join("..", "..", "..", "..", "data", "sylhet_map.json"), "")

	request := httptest.NewRequest(http.MethodGet, "/api/routes/active?failed_edge=E2&failure_status=washed_out", nil)
	recorder := httptest.NewRecorder()

	server.handleActiveRoutes(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	var response ActiveRoutesResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if response.RecomputeMs > 2000 {
		t.Fatalf("expected recompute under 2s, got %dms", response.RecomputeMs)
	}
	if len(response.ActiveRoutes) == 0 {
		t.Fatal("expected active routes in recompute response")
	}
}
