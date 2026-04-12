package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
)

func TestDashboardSummaryEndpoint(t *testing.T) {
	server := NewServer(filepath.Join("..", "..", "..", "..", "data", "sylhet_map.json"), "")

	req := httptest.NewRequest(http.MethodGet, "/api/dashboard/summary", nil)
	recorder := httptest.NewRecorder()

	server.Handler().ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, recorder.Code)
	}

	var response DashboardSummary
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}

	if response.NodeCount == 0 || response.EdgeCount == 0 {
		t.Fatalf("expected populated summary, got %+v", response)
	}
}

func TestHandlerAddsCORSHeaders(t *testing.T) {
	server := NewServer(filepath.Join("..", "..", "..", "..", "data", "sylhet_map.json"), "")

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	recorder := httptest.NewRecorder()

	server.Handler().ServeHTTP(recorder, req)

	if got := recorder.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Fatalf("expected wildcard CORS header, got %q", got)
	}
}
