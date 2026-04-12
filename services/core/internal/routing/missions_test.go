package routing

import (
	"testing"

	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/scenario"
)

func TestComputeMissionProducesHandoff(t *testing.T) {
	graph := scenario.Graph{
		Nodes: []scenario.Node{
			{ID: "N1"}, {ID: "N2"}, {ID: "N4"},
		},
		Edges: []scenario.Edge{
			{
				ID:             "E1",
				Source:         "N1",
				Target:         "N2",
				Type:           scenario.LinkTypeRoad,
				BaseWeightMins: 20,
				TravelTimeMins: 20,
				CapacityUnits:  120,
				PayloadLimitKg: 120,
				RiskScore:      1,
			},
			{
				ID:             "E9",
				Source:         "N2",
				Target:         "N4",
				Type:           scenario.LinkTypeAirway,
				BaseWeightMins: 16,
				TravelTimeMins: 16,
				CapacityUnits:  12,
				PayloadLimitKg: 12,
				RiskScore:      2,
			},
		},
	}

	engine := NewEngine(graph)
	mission, err := engine.ComputeMission(MissionRequest{
		MissionID: "medical-airlift",
		Label:     "Medical Airlift",
		Stages: []RouteRequest{
			{VehicleType: VehicleTypeTruck, Source: "N1", Target: "N2", PayloadKg: 12},
			{VehicleType: VehicleTypeDrone, Source: "N2", Target: "N4", PayloadKg: 12},
		},
	})
	if err != nil {
		t.Fatalf("ComputeMission returned error: %v", err)
	}

	if len(mission.Handoffs) != 1 {
		t.Fatalf("expected 1 handoff, got %d", len(mission.Handoffs))
	}
	if mission.Handoffs[0].NodeID != "N2" {
		t.Fatalf("expected handoff at N2, got %s", mission.Handoffs[0].NodeID)
	}
}
