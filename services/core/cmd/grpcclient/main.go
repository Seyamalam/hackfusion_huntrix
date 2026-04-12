package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"time"

	digitaldeltav1 "github.com/Seyamalam/hackfusion_huntrix/proto/gen/go/digitaldeltav1"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func main() {
	address := flag.String("addr", "127.0.0.1:9090", "gRPC server address")
	source := flag.String("from", "N1", "origin node id")
	target := flag.String("to", "N3", "destination node id")
	vehicle := flag.String("vehicle", "truck", "vehicle type: truck, speedboat, or drone")
	flag.Parse()

	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	conn, err := grpc.NewClient(
		*address,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		log.Fatalf("dial gRPC server: %v", err)
	}
	defer conn.Close()

	client := digitaldeltav1.NewRoutingServiceClient(conn)
	plan, err := client.ComputeRoute(ctx, &digitaldeltav1.RouteRequest{
		RequestId:         fmt.Sprintf("cli-%d", time.Now().UnixNano()),
		OriginNodeId:      *source,
		DestinationNodeId: *target,
		VehicleType:       parseVehicle(*vehicle),
	})
	if err != nil {
		log.Fatalf("compute route: %v", err)
	}

	fmt.Printf("route=%s total_mins=%d legs=%d explanation=%q\n", *vehicle, plan.GetTotalEtaMins(), len(plan.GetLegs()), plan.GetExplanation())
}

func parseVehicle(value string) digitaldeltav1.VehicleType {
	switch value {
	case "speedboat":
		return digitaldeltav1.VehicleType_VEHICLE_TYPE_SPEEDBOAT
	case "drone":
		return digitaldeltav1.VehicleType_VEHICLE_TYPE_DRONE
	default:
		return digitaldeltav1.VehicleType_VEHICLE_TYPE_TRUCK
	}
}
