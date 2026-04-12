package main

import (
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
	flag.Parse()

	server := api.NewServer(*mapPath, *chaosURL)

	log.Printf("routing API listening on %s", *listenAddr)
	if *chaosURL != "" {
		log.Printf("using chaos API at %s", *chaosURL)
	}

	if err := http.ListenAndServe(*listenAddr, server.Handler()); err != nil {
		log.Fatal(err)
	}
}
