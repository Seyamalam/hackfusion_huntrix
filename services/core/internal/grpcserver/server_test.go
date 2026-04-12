package grpcserver

import (
	"context"
	"path/filepath"
	"testing"

	digitaldeltav1 "github.com/Seyamalam/hackfusion_huntrix/proto/gen/go/digitaldeltav1"
)

func TestComputeRoute(t *testing.T) {
	server := New(filepath.Join("..", "..", "..", "..", "data", "sylhet_map.json"), "")

	plan, err := server.ComputeRoute(context.Background(), &digitaldeltav1.RouteRequest{
		RequestId:         "route-test",
		OriginNodeId:      "N1",
		DestinationNodeId: "N3",
		VehicleType:       digitaldeltav1.VehicleType_VEHICLE_TYPE_TRUCK,
	})
	if err != nil {
		t.Fatalf("ComputeRoute returned error: %v", err)
	}

	if plan.GetTotalEtaMins() == 0 {
		t.Fatalf("expected non-zero ETA, got %d", plan.GetTotalEtaMins())
	}
}
