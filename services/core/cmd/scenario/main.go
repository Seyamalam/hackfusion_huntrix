package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"path/filepath"
	"time"

	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/chaos"
	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/routing"
	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/scenario"
)

func main() {
	mapPath := flag.String("map", filepath.Join("data", "sylhet_map.json"), "path to scenario map JSON")
	chaosURL := flag.String("chaos-url", "", "base URL for the chaos API, e.g. http://127.0.0.1:5000")
	source := flag.String("from", "N1", "origin node id")
	target := flag.String("to", "N3", "destination node id")
	flag.Parse()

	graph, err := loadGraph(*mapPath, *chaosURL)
	if err != nil {
		log.Fatalf("load scenario: %v", err)
	}

	fmt.Printf("loaded scenario %q with %d nodes and %d edges\n", graph.Metadata.Scenario, len(graph.Nodes), len(graph.Edges))
	for _, edge := range graph.Edges {
		fmt.Printf("%s %s -> %s (%s, %d mins, blocked=%t)\n", edge.ID, edge.Source, edge.Target, edge.Type, edge.BaseWeightMins, edge.IsBlocked())
	}

	engine := routing.NewEngine(graph)
	for _, vehicle := range []routing.VehicleType{routing.VehicleTypeTruck, routing.VehicleTypeSpeedboat} {
		plan, err := engine.ComputeShortestPath(vehicle, *source, *target)
		if err != nil {
			log.Printf("%s route %s -> %s failed: %v", vehicle, *source, *target, err)
			continue
		}

		fmt.Printf("%s route %s -> %s total=%d mins legs=%d\n", vehicle, *source, *target, plan.TotalMins, len(plan.Legs))
	}
}

func loadGraph(mapPath, chaosURL string) (scenario.Graph, error) {
	if chaosURL == "" {
		return scenario.LoadGraph(mapPath)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
	defer cancel()

	client := chaos.NewClient(chaosURL)
	return client.FetchNetworkStatus(ctx)
}
