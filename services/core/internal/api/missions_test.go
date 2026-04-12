package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
)

func TestHandleMissionRoutesReturnsHandoffs(t *testing.T) {
	server := NewServer(filepath.Join("..", "..", "..", "..", "data", "sylhet_map.json"), "")

	request := httptest.NewRequest(http.MethodGet, "/api/routes/missions", nil)
	recorder := httptest.NewRecorder()

	server.handleMissionRoutes(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	var response MissionPlansResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(response.Missions) == 0 {
		t.Fatal("expected at least one mission")
	}
	if len(response.Missions[0].Handoffs) == 0 {
		t.Fatal("expected a handoff event in the first mission")
	}
	if response.RecomputeMs > 2000 {
		t.Fatalf("expected recompute under 2s, got %dms", response.RecomputeMs)
	}
}
