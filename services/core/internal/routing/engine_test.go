package routing

import (
	"testing"

	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/scenario"
)

func TestComputeRouteRespectsDronePayloadLimit(t *testing.T) {
	graph := scenario.Graph{
		Nodes: []scenario.Node{
			{ID: "A"}, {ID: "B"},
		},
		Edges: []scenario.Edge{
			{
				ID:             "E1",
				Source:         "A",
				Target:         "B",
				Type:           scenario.LinkTypeAirway,
				BaseWeightMins: 18,
				TravelTimeMins: 18,
				CapacityUnits:  15,
				PayloadLimitKg: 15,
				RiskScore:      2,
			},
		},
	}

	engine := NewEngine(graph)
	_, err := engine.ComputeRoute(RouteRequest{
		VehicleType: VehicleTypeDrone,
		Source:      "A",
		Target:      "B",
		PayloadKg:   20,
	})
	if err == nil {
		t.Fatal("expected payload-constrained drone route to fail")
	}
}

func TestComputeRouteUsesWeightedEdgeCost(t *testing.T) {
	graph := scenario.Graph{
		Nodes: []scenario.Node{
			{ID: "A"}, {ID: "B"}, {ID: "C"},
		},
		Edges: []scenario.Edge{
			{
				ID:             "AB",
				Source:         "A",
				Target:         "B",
				Type:           scenario.LinkTypeRoad,
				BaseWeightMins: 20,
				TravelTimeMins: 20,
				CapacityUnits:  120,
				PayloadLimitKg: 120,
				RiskScore:      1,
			},
			{
				ID:             "BC",
				Source:         "B",
				Target:         "C",
				Type:           scenario.LinkTypeRoad,
				BaseWeightMins: 20,
				TravelTimeMins: 20,
				CapacityUnits:  120,
				PayloadLimitKg: 120,
				RiskScore:      1,
			},
			{
				ID:             "AC",
				Source:         "A",
				Target:         "C",
				Type:           scenario.LinkTypeRoad,
				BaseWeightMins: 25,
				TravelTimeMins: 25,
				CapacityUnits:  120,
				PayloadLimitKg: 120,
				RiskScore:      8,
			},
		},
	}

	engine := NewEngine(graph)
	plan, err := engine.ComputeRoute(RouteRequest{
		VehicleType: VehicleTypeTruck,
		Source:      "A",
		Target:      "C",
		PayloadKg:   80,
	})
	if err != nil {
		t.Fatalf("ComputeRoute returned error: %v", err)
	}

	if len(plan.Legs) != 2 {
		t.Fatalf("expected 2-leg route through lower-risk path, got %d", len(plan.Legs))
	}
	if plan.Legs[0].EdgeID != "AB" || plan.Legs[1].EdgeID != "BC" {
		t.Fatalf("expected AB -> BC path, got %+v", plan.Legs)
	}
}
