package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
)

func TestHandleFleetOrchestrationStatusReturnsRendezvousAndThrottle(t *testing.T) {
	server := NewServer(filepath.Join("..", "..", "..", "..", "data", "sylhet_map.json"), "")

	request := httptest.NewRequest(http.MethodGet, "/api/fleet/orchestration/status", nil)
	recorder := httptest.NewRecorder()

	server.handleFleetOrchestrationStatus(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	var response FleetOrchestrationStatusResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if len(response.Status.Rendezvous) < 3 {
		t.Fatalf("expected at least 3 rendezvous scenarios, got %d", len(response.Status.Rendezvous))
	}
	if response.Status.MeshThrottle.BatterySavingsPct <= 0 {
		t.Fatal("expected battery savings in throttle simulation")
	}
}
