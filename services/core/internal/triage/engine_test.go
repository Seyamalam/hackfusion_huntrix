package triage

import (
	"path/filepath"
	"testing"

	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/scenario"
)

func TestEvaluateTriggersPreemptionWhenConvoyBreaches(t *testing.T) {
	baseGraph, err := scenario.LoadGraph(filepath.Join("..", "..", "..", "..", "data", "sylhet_map.json"))
	if err != nil {
		t.Fatalf("load base graph: %v", err)
	}

	currentGraph := baseGraph
	currentGraph.Edges = append([]scenario.Edge(nil), baseGraph.Edges...)
	for i := range currentGraph.Edges {
		if currentGraph.Edges[i].ID == "E3" {
			currentGraph.Edges[i].IsFlooded = true
			currentGraph.Edges[i].BaseWeightMins = 9999
		}
	}

	snapshot, err := Evaluate(baseGraph, currentGraph, EvaluateOptions{
		FailedEdgeID: "E3",
		Mode:         "simulated_breach",
	})
	if err != nil {
		t.Fatalf("Evaluate returned error: %v", err)
	}

	if len(snapshot.PriorityTiers) != 4 {
		t.Fatalf("expected 4 priority tiers, got %d", len(snapshot.PriorityTiers))
	}
	if !snapshot.Decision.Triggered {
		t.Fatal("expected preemption decision to trigger")
	}
	if snapshot.Decision.SafeWaypoint != "N2" {
		t.Fatalf("expected safe waypoint N2, got %s", snapshot.Decision.SafeWaypoint)
	}
	if snapshot.SlowdownPct < 30 {
		t.Fatalf("expected slowdown >= 30, got %d", snapshot.SlowdownPct)
	}
}
