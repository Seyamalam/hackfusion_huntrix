package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/chaos"
	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/routing"
	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/scenario"
)

type Server struct {
	mapPath       string
	chaosURL      string
	httpMux       *http.ServeMux
	inventoryDemo *inventoryDemoStore
}

type RoutePreviewResponse struct {
	Source      string             `json:"source"`
	Target      string             `json:"target"`
	Vehicle     string             `json:"vehicle"`
	PayloadKg   int                `json:"payload_kg"`
	TotalMins   int                `json:"total_mins"`
	TotalCost   int                `json:"total_cost"`
	LegCount    int                `json:"leg_count"`
	Legs        []routing.RouteLeg `json:"legs"`
	RecomputeMs int64              `json:"recompute_ms,omitempty"`
}

type DashboardSummary struct {
	Scenario          string                 `json:"scenario"`
	NodeCount         int                    `json:"node_count"`
	EdgeCount         int                    `json:"edge_count"`
	BlockedEdgeCount  int                    `json:"blocked_edge_count"`
	RoutePreviews     []RoutePreviewResponse `json:"route_previews"`
	LastRecomputeMs   int64                  `json:"last_recompute_ms"`
	WeightedGraphNote string                 `json:"weighted_graph_note"`
}

type ActiveRoutesResponse struct {
	Scenario           string                 `json:"scenario"`
	AppliedFailureEdge string                 `json:"applied_failure_edge,omitempty"`
	FailureStatus      string                 `json:"failure_status,omitempty"`
	RecomputeMs        int64                  `json:"recompute_ms"`
	AffectedRouteCount int                    `json:"affected_route_count"`
	ActiveRoutes       []RoutePreviewResponse `json:"active_routes"`
}

func NewServer(mapPath, chaosURL string) *Server {
	server := &Server{
		mapPath:       mapPath,
		chaosURL:      strings.TrimRight(chaosURL, "/"),
		httpMux:       http.NewServeMux(),
		inventoryDemo: newInventoryDemoStore(),
	}

	server.httpMux.HandleFunc("/healthz", server.handleHealth)
	server.httpMux.HandleFunc("/api/network/status", server.handleNetworkStatus)
	server.httpMux.HandleFunc("/api/route/preview", server.handleRoutePreview)
	server.httpMux.HandleFunc("/api/routes/active", server.handleActiveRoutes)
	server.httpMux.HandleFunc("/api/dashboard/summary", server.handleDashboardSummary)
	server.httpMux.HandleFunc("/api/sync/inventory/state", server.handleInventoryDemoState)
	server.httpMux.HandleFunc("/api/sync/inventory/reset", server.handleInventoryDemoReset)
	server.httpMux.HandleFunc("/api/sync/inventory/apply", server.handleInventoryDemoApply)
	server.httpMux.HandleFunc("/api/sync/inventory/resolve", server.handleInventoryDemoResolve)

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
	payloadKg, err := parseIntQuery(r, "payload_kg", defaultPayloadForVehicle(vehicle))
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	failedEdgeID := strings.TrimSpace(r.URL.Query().Get("failed_edge"))
	failureStatus := defaultString(r.URL.Query().Get("failure_status"), "washed_out")
	graph = applyEdgeFailure(graph, failedEdgeID, failureStatus)

	engine := routing.NewEngine(graph)
	start := time.Now()
	plan, err := engine.ComputeRoute(routing.RouteRequest{
		VehicleType: vehicle,
		Source:      source,
		Target:      target,
		PayloadKg:   payloadKg,
	})
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, err)
		return
	}

	writeJSON(w, http.StatusOK, RoutePreviewResponse{
		Source:      source,
		Target:      target,
		Vehicle:     string(vehicle),
		PayloadKg:   payloadKg,
		TotalMins:   plan.TotalMins,
		TotalCost:   plan.TotalCost,
		LegCount:    len(plan.Legs),
		Legs:        plan.Legs,
		RecomputeMs: time.Since(start).Milliseconds(),
	})
}

func (s *Server) handleDashboardSummary(w http.ResponseWriter, r *http.Request) {
	graph, err := s.loadGraph(r)
	if err != nil {
		writeError(w, http.StatusBadGateway, err)
		return
	}

	engine := routing.NewEngine(graph)
	start := time.Now()
	previews := make([]RoutePreviewResponse, 0, 3)
	for _, request := range defaultActiveRouteRequests() {
		plan, routeErr := engine.ComputeRoute(request)
		if routeErr != nil {
			continue
		}

		previews = append(previews, RoutePreviewResponse{
			Source:    request.Source,
			Target:    request.Target,
			Vehicle:   string(request.VehicleType),
			PayloadKg: request.PayloadKg,
			TotalMins: plan.TotalMins,
			TotalCost: plan.TotalCost,
			LegCount:  len(plan.Legs),
			Legs:      plan.Legs,
		})
	}

	writeJSON(w, http.StatusOK, DashboardSummary{
		Scenario:          graph.Metadata.Scenario,
		NodeCount:         len(graph.Nodes),
		EdgeCount:         len(graph.Edges),
		BlockedEdgeCount:  countBlockedEdges(graph),
		RoutePreviews:     previews,
		LastRecomputeMs:   time.Since(start).Milliseconds(),
		WeightedGraphNote: "Route costs blend travel time, edge risk, and near-capacity penalties.",
	})
}

func (s *Server) handleActiveRoutes(w http.ResponseWriter, r *http.Request) {
	graph, err := s.loadGraph(r)
	if err != nil {
		writeError(w, http.StatusBadGateway, err)
		return
	}

	failedEdgeID := strings.TrimSpace(r.URL.Query().Get("failed_edge"))
	failureStatus := defaultString(r.URL.Query().Get("failure_status"), "washed_out")
	if failedEdgeID != "" {
		graph = applyEdgeFailure(graph, failedEdgeID, failureStatus)
	}

	engine := routing.NewEngine(graph)
	start := time.Now()
	routes := make([]RoutePreviewResponse, 0, 3)
	affectedCount := 0
	for _, request := range defaultActiveRouteRequests() {
		plan, routeErr := engine.ComputeRoute(request)
		if routeErr != nil {
			affectedCount++
			continue
		}

		usesFailedEdge := false
		for _, leg := range plan.Legs {
			if leg.EdgeID == failedEdgeID {
				usesFailedEdge = true
				break
			}
		}
		if failedEdgeID != "" && !usesFailedEdge {
			affectedCount++
		}

		routes = append(routes, RoutePreviewResponse{
			Source:    request.Source,
			Target:    request.Target,
			Vehicle:   string(request.VehicleType),
			PayloadKg: request.PayloadKg,
			TotalMins: plan.TotalMins,
			TotalCost: plan.TotalCost,
			LegCount:  len(plan.Legs),
			Legs:      plan.Legs,
		})
	}

	writeJSON(w, http.StatusOK, ActiveRoutesResponse{
		Scenario:           graph.Metadata.Scenario,
		AppliedFailureEdge: failedEdgeID,
		FailureStatus:      failureStatus,
		RecomputeMs:        time.Since(start).Milliseconds(),
		AffectedRouteCount: affectedCount,
		ActiveRoutes:       routes,
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

func parseIntQuery(r *http.Request, key string, fallback int) (int, error) {
	raw := strings.TrimSpace(r.URL.Query().Get(key))
	if raw == "" {
		return fallback, nil
	}

	var value int
	_, err := fmt.Sscanf(raw, "%d", &value)
	if err != nil {
		return 0, fmt.Errorf("invalid %s %q", key, raw)
	}
	return value, nil
}

func defaultPayloadForVehicle(vehicle routing.VehicleType) int {
	switch vehicle {
	case routing.VehicleTypeDrone:
		return 12
	case routing.VehicleTypeSpeedboat:
		return 80
	default:
		return 100
	}
}

func defaultActiveRouteRequests() []routing.RouteRequest {
	return []routing.RouteRequest{
		{
			VehicleType: routing.VehicleTypeTruck,
			Source:      "N1",
			Target:      "N3",
			PayloadKg:   100,
		},
		{
			VehicleType: routing.VehicleTypeSpeedboat,
			Source:      "N1",
			Target:      "N3",
			PayloadKg:   80,
		},
		{
			VehicleType: routing.VehicleTypeDrone,
			Source:      "N2",
			Target:      "N4",
			PayloadKg:   12,
		},
	}
}

func applyEdgeFailure(graph scenario.Graph, edgeID, failureStatus string) scenario.Graph {
	if edgeID == "" {
		return graph
	}

	clone := graph
	clone.Edges = append([]scenario.Edge(nil), graph.Edges...)
	for i := range clone.Edges {
		if clone.Edges[i].ID != edgeID {
			continue
		}
		clone.Edges[i].IsFlooded = true
		clone.Edges[i].Status = failureStatus
		clone.Edges[i].BaseWeightMins = 9999
		return clone
	}

	return clone
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
