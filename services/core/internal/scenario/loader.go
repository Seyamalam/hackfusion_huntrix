package scenario

import (
	"encoding/json"
	"fmt"
	"os"
)

func LoadGraph(path string) (Graph, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return Graph{}, fmt.Errorf("read graph file: %w", err)
	}

	var graph Graph
	if err := json.Unmarshal(raw, &graph); err != nil {
		return Graph{}, fmt.Errorf("decode graph file: %w", err)
	}

	for i := range graph.Edges {
		graph.Edges[i].Type = normalizeLinkType(graph.Edges[i].Type)
	}

	return graph, nil
}

func normalizeLinkType(value LinkType) LinkType {
	switch value {
	case "river":
		return LinkTypeWaterway
	case LinkTypeRoad, LinkTypeWaterway, LinkTypeAirway:
		return value
	default:
		return LinkTypeRoad
	}
}
