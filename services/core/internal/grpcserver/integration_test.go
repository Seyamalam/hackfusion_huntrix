package grpcserver

import (
	"context"
	"net"
	"path/filepath"
	"testing"

	digitaldeltav1 "github.com/Seyamalam/hackfusion_huntrix/proto/gen/go/digitaldeltav1"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/test/bufconn"
)

func TestRoutingServiceOverGRPC(t *testing.T) {
	listener := bufconn.Listen(1024 * 1024)
	server := grpc.NewServer()

	service := New(filepath.Join("..", "..", "..", "..", "data", "sylhet_map.json"), "")
	digitaldeltav1.RegisterRoutingServiceServer(server, service)

	go func() {
		if err := server.Serve(listener); err != nil {
			t.Errorf("Serve returned error: %v", err)
		}
	}()
	defer server.Stop()

	ctx := context.Background()
	conn, err := grpc.NewClient(
		"passthrough:///bufnet",
		grpc.WithContextDialer(func(context.Context, string) (net.Conn, error) {
			return listener.Dial()
		}),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		t.Fatalf("grpc.NewClient returned error: %v", err)
	}
	defer conn.Close()

	client := digitaldeltav1.NewRoutingServiceClient(conn)
	plan, err := client.ComputeRoute(ctx, &digitaldeltav1.RouteRequest{
		RequestId:         "grpc-integration",
		OriginNodeId:      "N1",
		DestinationNodeId: "N3",
		VehicleType:       digitaldeltav1.VehicleType_VEHICLE_TYPE_TRUCK,
	})
	if err != nil {
		t.Fatalf("ComputeRoute returned error: %v", err)
	}

	if got := plan.GetTotalEtaMins(); got == 0 {
		t.Fatalf("expected non-zero ETA, got %d", got)
	}
}
