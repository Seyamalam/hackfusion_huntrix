package scenario

import "testing"

func TestParseGraphNormalizesRiverToWaterway(t *testing.T) {
	graph, err := ParseGraph([]byte(`{
		"metadata": {"region":"Sylhet","scenario":"Test","last_updated":"2026-04-12T08:00:00Z"},
		"nodes": [{"id":"N1","name":"Hub","type":"central_command","lat":24.0,"lng":91.0}],
		"edges": [{"id":"E1","source":"N1","target":"N1","type":"river","base_weight_mins":20,"is_flooded":false}]
	}`))
	if err != nil {
		t.Fatalf("ParseGraph returned error: %v", err)
	}

	if len(graph.Edges) != 1 {
		t.Fatalf("expected 1 edge, got %d", len(graph.Edges))
	}

	if graph.Edges[0].Type != LinkTypeWaterway {
		t.Fatalf("expected edge type %q, got %q", LinkTypeWaterway, graph.Edges[0].Type)
	}
}
