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
	digitaldeltav1.RegisterSyncServiceServer(server, service)

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

func TestSyncServiceOverGRPC(t *testing.T) {
	listener := bufconn.Listen(1024 * 1024)
	server := grpc.NewServer()

	service := New(filepath.Join("..", "..", "..", "..", "data", "sylhet_map.json"), "")
	digitaldeltav1.RegisterSyncServiceServer(server, service)

	go func() {
		if err := server.Serve(listener); err != nil {
			t.Errorf("Serve returned error: %v", err)
		}
	}()
	defer server.Stop()

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

	client := digitaldeltav1.NewSyncServiceClient(conn)
	response, err := client.ExchangeBundle(context.Background(), &digitaldeltav1.ExchangeBundleRequest{
		TargetReplicaId: "replica-b",
		Bundle: &digitaldeltav1.SyncBundle{
			BundleId:        "bundle-1",
			SourceReplicaId: "replica-a",
			Operations: []*digitaldeltav1.SyncOperation{
				{
					OperationId: "op-1",
					EntityType:  "inventory_record",
					Payload:     []byte("payload"),
				},
			},
			Envelopes: []*digitaldeltav1.RelayEnvelope{
				{
					EnvelopeId:              "env-1",
					IntendedRecipientNodeId: "replica-b",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("ExchangeBundle returned error: %v", err)
	}

	if len(response.GetAcceptedOperationIds()) != 1 {
		t.Fatalf("expected 1 accepted operation, got %d", len(response.GetAcceptedOperationIds()))
	}

	pull, err := client.PullPending(context.Background(), &digitaldeltav1.PullPendingRequest{
		ReplicaId: "replica-b",
		MaxItems:  5,
	})
	if err != nil {
		t.Fatalf("PullPending returned error: %v", err)
	}

	if len(pull.GetEnvelopes()) != 1 {
		t.Fatalf("expected 1 pending envelope, got %d", len(pull.GetEnvelopes()))
	}
}
