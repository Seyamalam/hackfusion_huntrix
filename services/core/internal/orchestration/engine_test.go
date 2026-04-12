package orchestration

import (
	"path/filepath"
	"testing"

	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/scenario"
)

func TestEvaluateFlagsDroneRequiredZoneInDrillGraph(t *testing.T) {
	graph, err := scenario.LoadGraph(filepath.Join("..", "..", "..", "..", "data", "sylhet_map.json"))
	if err != nil {
		t.Fatalf("load graph: %v", err)
	}

	status := Evaluate(graph)
	if len(status.DrillReachability.DroneRequiredZones) == 0 {
		t.Fatal("expected at least one drone-required zone in drill mode")
	}
}

func TestComputeRendezvousScenarioOne(t *testing.T) {
	graph, err := scenario.LoadGraph(filepath.Join("..", "..", "..", "..", "data", "sylhet_map.json"))
	if err != nil {
		t.Fatalf("load graph: %v", err)
	}

	scenario := computeRendezvous(graph, RendezvousInput{
		ScenarioID:        "rv-test-1",
		Label:             "Companyganj transfer",
		BoatNodeID:        "N1",
		DroneBaseNodeID:   "N2",
		DestinationNodeID: "N4",
		PayloadKg:         8,
		DroneRangeKm:      70,
	})

	if !scenario.Feasible {
		t.Fatal("expected rendezvous scenario to be feasible")
	}
	if scenario.BestMeetingNodeID == "" {
		t.Fatal("expected a meeting node")
	}
}

func TestComputeRendezvousScenarioTwo(t *testing.T) {
	graph, err := scenario.LoadGraph(filepath.Join("..", "..", "..", "..", "data", "sylhet_map.json"))
	if err != nil {
		t.Fatalf("load graph: %v", err)
	}

	scenario := computeRendezvous(graph, RendezvousInput{
		ScenarioID:        "rv-test-2",
		Label:             "Sunamganj relay",
		BoatNodeID:        "N1",
		DroneBaseNodeID:   "N2",
		DestinationNodeID: "N3",
		PayloadKg:         6,
		DroneRangeKm:      80,
	})

	if !scenario.Feasible {
		t.Fatal("expected rendezvous scenario to be feasible")
	}
	if scenario.CombinedMissionMins <= 0 {
		t.Fatal("expected positive mission time")
	}
}

func TestComputeRendezvousScenarioThree(t *testing.T) {
	graph, err := scenario.LoadGraph(filepath.Join("..", "..", "..", "..", "data", "sylhet_map.json"))
	if err != nil {
		t.Fatalf("load graph: %v", err)
	}

	scenario := computeRendezvous(graph, RendezvousInput{
		ScenarioID:        "rv-test-3",
		Label:             "Habiganj air bridge",
		BoatNodeID:        "N3",
		DroneBaseNodeID:   "N4",
		DestinationNodeID: "N6",
		PayloadKg:         7,
		DroneRangeKm:      90,
	})

	if !scenario.Feasible {
		t.Fatal("expected rendezvous scenario to be feasible")
	}
	if scenario.BoatTravelMins <= 0 || scenario.DroneFinalLegMins <= 0 {
		t.Fatal("expected non-zero travel times")
	}
}

func TestMeshThrottleSimulationShowsSavings(t *testing.T) {
	simulation := simulateMeshThrottle()
	if simulation.BatterySavingsPct <= 0 {
		t.Fatal("expected measurable battery savings")
	}
	if simulation.AdjustedBroadcasts >= simulation.BaselineBroadcasts {
		t.Fatal("expected throttling to reduce broadcasts")
	}
}
