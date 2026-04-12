package main

import (
	"crypto/tls"
	"flag"
	"log"
	"net/http"
	"path/filepath"

	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/api"
)

func main() {
	listenAddr := flag.String("listen", ":8080", "HTTP listen address")
	mapPath := flag.String("map", filepath.Join("data", "sylhet_map.json"), "path to scenario map JSON")
	chaosURL := flag.String("chaos-url", "", "base URL for the chaos API, e.g. http://127.0.0.1:5000")
	tlsCert := flag.String("tls-cert", "", "path to TLS certificate PEM for HTTPS (TLS 1.3)")
	tlsKey := flag.String("tls-key", "", "path to TLS private key PEM for HTTPS (TLS 1.3)")
	flag.Parse()

	server := api.NewServer(*mapPath, *chaosURL)
	httpServer := &http.Server{
		Addr:    *listenAddr,
		Handler: server.Handler(),
		TLSConfig: &tls.Config{
			MinVersion: tls.VersionTLS13,
		},
	}

	log.Printf("routing API listening on %s", *listenAddr)
	if *chaosURL != "" {
		log.Printf("using chaos API at %s", *chaosURL)
	}
	if *tlsCert != "" && *tlsKey != "" {
		log.Printf("TLS 1.3 enabled for HTTP API")
		if err := httpServer.ListenAndServeTLS(*tlsCert, *tlsKey); err != nil {
			log.Fatal(err)
		}
		return
	}
	log.Printf("WARNING: HTTP API running without TLS. Provide -tls-cert and -tls-key for TLS 1.3 compliance.")
	if err := httpServer.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
