package predictive

import (
	"path/filepath"
	"testing"

	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/scenario"
)

func TestEvaluateReturnsPredictionsAndRecommendations(t *testing.T) {
	graph, err := scenario.LoadGraph(filepath.Join("..", "..", "..", "..", "data", "sylhet_map.json"))
	if err != nil {
		t.Fatalf("load graph: %v", err)
	}

	status, err := Evaluate(graph, filepath.Join("..", "..", "..", ".."))
	if err != nil {
		t.Fatalf("Evaluate returned error: %v", err)
	}

	if len(status.Predictions) == 0 {
		t.Fatal("expected edge predictions")
	}
	if status.Metrics.F1 <= 0 {
		t.Fatal("expected model metrics")
	}
	if len(status.Recommendations) == 0 {
		t.Fatal("expected proactive recommendations")
	}
}
