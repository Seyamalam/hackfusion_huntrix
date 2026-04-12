package main

import (
	"crypto/tls"
	"flag"
	"log"
	"net"
	"path/filepath"

	digitaldeltav1 "github.com/Seyamalam/hackfusion_huntrix/proto/gen/go/digitaldeltav1"
	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/grpcserver"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
)

func main() {
	listenAddr := flag.String("listen", ":9090", "gRPC listen address")
	mapPath := flag.String("map", filepath.Join("data", "sylhet_map.json"), "path to scenario map JSON")
	chaosURL := flag.String("chaos-url", "", "base URL for the chaos API, e.g. http://127.0.0.1:5000")
	tlsCert := flag.String("tls-cert", "", "path to TLS certificate PEM for gRPC (TLS 1.3)")
	tlsKey := flag.String("tls-key", "", "path to TLS private key PEM for gRPC (TLS 1.3)")
	flag.Parse()

	listener, err := net.Listen("tcp", *listenAddr)
	if err != nil {
		log.Fatal(err)
	}

	service := grpcserver.New(*mapPath, *chaosURL)
	serverOptions := []grpc.ServerOption{}
	if *tlsCert != "" && *tlsKey != "" {
		certificate, err := tls.LoadX509KeyPair(*tlsCert, *tlsKey)
		if err != nil {
			log.Fatal(err)
		}
		serverOptions = append(serverOptions, grpc.Creds(credentials.NewTLS(&tls.Config{
			MinVersion:   tls.VersionTLS13,
			Certificates: []tls.Certificate{certificate},
		})))
		log.Printf("TLS 1.3 enabled for gRPC API")
	} else {
		log.Printf("WARNING: gRPC API running without TLS. Provide -tls-cert and -tls-key for TLS 1.3 compliance.")
	}

	server := grpc.NewServer(serverOptions...)
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
