package main

import (
	"fmt"
	"log"
	"path/filepath"

	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/routing"
	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/scenario"
)

func main() {
	mapPath := filepath.Join("data", "sylhet_map.json")

	graph, err := scenario.LoadGraph(mapPath)
	if err != nil {
		log.Fatalf("load scenario: %v", err)
	}

	fmt.Printf("loaded scenario %q with %d nodes and %d edges\n", graph.Metadata.Scenario, len(graph.Nodes), len(graph.Edges))
	for _, edge := range graph.Edges {
		fmt.Printf("%s %s -> %s (%s, %d mins, blocked=%t)\n", edge.ID, edge.Source, edge.Target, edge.Type, edge.BaseWeightMins, edge.IsBlocked())
	}

	engine := routing.NewEngine(graph)
	for _, vehicle := range []routing.VehicleType{routing.VehicleTypeTruck, routing.VehicleTypeSpeedboat} {
		plan, err := engine.ComputeShortestPath(vehicle, "N1", "N3")
		if err != nil {
			log.Printf("%s route N1 -> N3 failed: %v", vehicle, err)
			continue
		}

		fmt.Printf("%s route N1 -> N3 total=%d mins legs=%d\n", vehicle, plan.TotalMins, len(plan.Legs))
	}
}
