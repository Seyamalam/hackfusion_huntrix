package main

import (
	"flag"
	"log"
	"net"
	"path/filepath"

	digitaldeltav1 "github.com/Seyamalam/hackfusion_huntrix/proto/gen/go/digitaldeltav1"
	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/grpcserver"
	"google.golang.org/grpc"
)

func main() {
	listenAddr := flag.String("listen", ":9090", "gRPC listen address")
	mapPath := flag.String("map", filepath.Join("data", "sylhet_map.json"), "path to scenario map JSON")
	chaosURL := flag.String("chaos-url", "", "base URL for the chaos API, e.g. http://127.0.0.1:5000")
	flag.Parse()

	listener, err := net.Listen("tcp", *listenAddr)
	if err != nil {
		log.Fatal(err)
	}

	service := grpcserver.New(*mapPath, *chaosURL)
	server := grpc.NewServer()
	digitaldeltav1.RegisterRoutingServiceServer(server, service)
	digitaldeltav1.RegisterSyncServiceServer(server, service)
	digitaldeltav1.RegisterDeliveryServiceServer(server, service)

	log.Printf("gRPC API listening on %s", *listenAddr)
	if *chaosURL != "" {
		log.Printf("using chaos API at %s", *chaosURL)
	}

	if err := server.Serve(listener); err != nil {
		log.Fatal(err)
	}
}
