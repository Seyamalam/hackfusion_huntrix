package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
)

func TestHandleTriageStatusReturnsTriggeredDecision(t *testing.T) {
	server := NewServer(filepath.Join("..", "..", "..", "..", "data", "sylhet_map.json"), "")

	request := httptest.NewRequest(http.MethodGet, "/api/triage/status", nil)
	recorder := httptest.NewRecorder()

	server.handleTriageStatus(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	var response TriageStatusResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if len(response.Snapshot.PriorityTiers) != 4 {
		t.Fatalf("expected 4 priority tiers, got %d", len(response.Snapshot.PriorityTiers))
	}
	if !response.Decision.Triggered {
		t.Fatal("expected autonomous preemption to trigger")
	}
	if response.RecomputeMs > 2000 {
		t.Fatalf("expected triage evaluation under 2s, got %dms", response.RecomputeMs)
	}
}
