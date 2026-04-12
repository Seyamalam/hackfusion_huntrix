package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/chaos"
	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/routing"
	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/scenario"
)

type Server struct {
	mapPath  string
	chaosURL string
	httpMux  *http.ServeMux
}

type RoutePreviewResponse struct {
	Source    string             `json:"source"`
	Target    string             `json:"target"`
	Vehicle   string             `json:"vehicle"`
	TotalMins int                `json:"total_mins"`
	LegCount  int                `json:"leg_count"`
	Legs      []routing.RouteLeg `json:"legs"`
}

type DashboardSummary struct {
	Scenario         string                 `json:"scenario"`
	NodeCount        int                    `json:"node_count"`
	EdgeCount        int                    `json:"edge_count"`
	BlockedEdgeCount int                    `json:"blocked_edge_count"`
	RoutePreviews    []RoutePreviewResponse `json:"route_previews"`
}

func NewServer(mapPath, chaosURL string) *Server {
	server := &Server{
		mapPath:  mapPath,
		chaosURL: strings.TrimRight(chaosURL, "/"),
		httpMux:  http.NewServeMux(),
	}

	server.httpMux.HandleFunc("/healthz", server.handleHealth)
	server.httpMux.HandleFunc("/api/network/status", server.handleNetworkStatus)
	server.httpMux.HandleFunc("/api/route/preview", server.handleRoutePreview)
	server.httpMux.HandleFunc("/api/dashboard/summary", server.handleDashboardSummary)

	return server
}

func (s *Server) Handler() http.Handler {
	return withCORS(s.httpMux)
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleNetworkStatus(w http.ResponseWriter, r *http.Request) {
	graph, err := s.loadGraph(r)
	if err != nil {
		writeError(w, http.StatusBadGateway, err)
		return
	}

	writeJSON(w, http.StatusOK, graph)
}

func (s *Server) handleRoutePreview(w http.ResponseWriter, r *http.Request) {
	graph, err := s.loadGraph(r)
	if err != nil {
		writeError(w, http.StatusBadGateway, err)
		return
	}

	source := defaultString(r.URL.Query().Get("from"), "N1")
	target := defaultString(r.URL.Query().Get("to"), "N3")
	vehicle, err := parseVehicle(defaultString(r.URL.Query().Get("vehicle"), string(routing.VehicleTypeTruck)))
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	engine := routing.NewEngine(graph)
	plan, err := engine.ComputeShortestPath(vehicle, source, target)
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, err)
		return
	}

	writeJSON(w, http.StatusOK, RoutePreviewResponse{
		Source:    source,
		Target:    target,
		Vehicle:   string(vehicle),
		TotalMins: plan.TotalMins,
		LegCount:  len(plan.Legs),
		Legs:      plan.Legs,
	})
}

func (s *Server) handleDashboardSummary(w http.ResponseWriter, r *http.Request) {
	graph, err := s.loadGraph(r)
	if err != nil {
		writeError(w, http.StatusBadGateway, err)
		return
	}

	engine := routing.NewEngine(graph)
	previews := make([]RoutePreviewResponse, 0, 2)
	for _, vehicle := range []routing.VehicleType{routing.VehicleTypeTruck, routing.VehicleTypeSpeedboat} {
		plan, routeErr := engine.ComputeShortestPath(vehicle, "N1", "N3")
		if routeErr != nil {
			continue
		}

		previews = append(previews, RoutePreviewResponse{
			Source:    "N1",
			Target:    "N3",
			Vehicle:   string(vehicle),
			TotalMins: plan.TotalMins,
			LegCount:  len(plan.Legs),
			Legs:      plan.Legs,
		})
	}

	writeJSON(w, http.StatusOK, DashboardSummary{
		Scenario:         graph.Metadata.Scenario,
		NodeCount:        len(graph.Nodes),
		EdgeCount:        len(graph.Edges),
		BlockedEdgeCount: countBlockedEdges(graph),
		RoutePreviews:    previews,
	})
}

func (s *Server) loadGraph(r *http.Request) (scenario.Graph, error) {
	if s.chaosURL != "" {
		return chaos.NewClient(s.chaosURL).FetchNetworkStatus(r.Context())
	}

	path := s.mapPath
	if !filepath.IsAbs(path) {
		path = filepath.Clean(path)
	}

	return scenario.LoadGraph(path)
}

func countBlockedEdges(graph scenario.Graph) int {
	blocked := 0
	for _, edge := range graph.Edges {
		if edge.IsBlocked() {
			blocked++
		}
	}
	return blocked
}

func parseVehicle(value string) (routing.VehicleType, error) {
	vehicle := routing.VehicleType(strings.ToLower(strings.TrimSpace(value)))
	switch vehicle {
	case routing.VehicleTypeTruck, routing.VehicleTypeSpeedboat, routing.VehicleTypeDrone:
		return vehicle, nil
	default:
		return "", fmt.Errorf("unsupported vehicle %q", value)
	}
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}

	return value
}

func writeError(w http.ResponseWriter, statusCode int, err error) {
	writeJSON(w, statusCode, map[string]string{"error": err.Error()})
}

func writeJSON(w http.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(payload)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
