package chaos

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/scenario"
)

func TestFetchNetworkStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/network/status" {
			t.Fatalf("unexpected path %q", r.URL.Path)
		}

		_, _ = w.Write([]byte(`{
			"metadata": {"region":"Sylhet","scenario":"Chaos","last_updated":"2026-04-12T08:00:00Z"},
			"nodes": [{"id":"N1","name":"Hub","type":"central_command","lat":24.0,"lng":91.0}],
			"edges": [{"id":"E1","source":"N1","target":"N1","type":"road","base_weight_mins":9999,"is_flooded":true}]
		}`))
	}))
	defer server.Close()

	client := NewClient(server.URL)
	graph, err := client.FetchNetworkStatus(context.Background())
	if err != nil {
		t.Fatalf("FetchNetworkStatus returned error: %v", err)
	}

	if graph.Metadata.Scenario != "Chaos" {
		t.Fatalf("expected scenario %q, got %q", "Chaos", graph.Metadata.Scenario)
	}

	if len(graph.Edges) != 1 {
		t.Fatalf("expected 1 edge, got %d", len(graph.Edges))
	}

	if graph.Edges[0].Type != scenario.LinkTypeRoad {
		t.Fatalf("expected edge type %q, got %q", scenario.LinkTypeRoad, graph.Edges[0].Type)
	}

	if !graph.Edges[0].IsBlocked() {
		t.Fatal("expected flooded edge to be blocked")
	}
}
