package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/chaos"
	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/orchestration"
	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/predictive"
	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/routing"
	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/scenario"
	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/triage"
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

type HandoffEventResponse struct {
	NodeID      string `json:"node_id"`
	FromVehicle string `json:"from_vehicle"`
	ToVehicle   string `json:"to_vehicle"`
	PayloadKg   int    `json:"payload_kg"`
	Reason      string `json:"reason"`
}

type MissionPlanResponse struct {
	MissionID   string                 `json:"mission_id"`
	Label       string                 `json:"label"`
	TotalMins   int                    `json:"total_mins"`
	TotalCost   int                    `json:"total_cost"`
	StageCount  int                    `json:"stage_count"`
	Stages      []RoutePreviewResponse `json:"stages"`
	Handoffs    []HandoffEventResponse `json:"handoffs"`
	RecomputeMs int64                  `json:"recompute_ms,omitempty"`
}

type MissionPlansResponse struct {
	Scenario           string                `json:"scenario"`
	AppliedFailureEdge string                `json:"applied_failure_edge,omitempty"`
	FailureStatus      string                `json:"failure_status,omitempty"`
	RecomputeMs        int64                 `json:"recompute_ms"`
	Missions           []MissionPlanResponse `json:"missions"`
}

type TriageStatusResponse struct {
	Snapshot    triage.Snapshot    `json:"snapshot"`
	Decision    PreemptionDecision `json:"decision"`
	RecomputeMs int64              `json:"recompute_ms"`
}

type PredictiveStatusResponse struct {
	Status      predictive.Status `json:"status"`
	RecomputeMs int64             `json:"recompute_ms"`
}

type FleetOrchestrationStatusResponse struct {
	Status      orchestration.Status `json:"status"`
	RecomputeMs int64                `json:"recompute_ms"`
}

type PreemptionDecision struct {
	Triggered        bool     `json:"triggered"`
	Action           string   `json:"action"`
	SafeWaypoint     string   `json:"safe_waypoint"`
	DropCargoIDs     []string `json:"drop_cargo_ids"`
	KeepCargoIDs     []string `json:"keep_cargo_ids"`
	RerouteVehicle   string   `json:"reroute_vehicle"`
	CurrentETAMins   int      `json:"current_eta_mins"`
	RerouteETAMins   int      `json:"reroute_eta_mins"`
	DecisionReason   string   `json:"decision_reason"`
	AuditTrailAnchor string   `json:"audit_trail_anchor"`
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
	server.httpMux.HandleFunc("/api/routes/missions", server.handleMissionRoutes)
	server.httpMux.HandleFunc("/api/predictive/status", server.handlePredictiveStatus)
	server.httpMux.HandleFunc("/api/fleet/orchestration/status", server.handleFleetOrchestrationStatus)
	server.httpMux.HandleFunc("/api/triage/status", server.handleTriageStatus)
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

func (s *Server) handleMissionRoutes(w http.ResponseWriter, r *http.Request) {
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
	missions := make([]MissionPlanResponse, 0, 2)
	for _, request := range defaultMissionRequests() {
		mission, missionErr := engine.ComputeMission(request)
		if missionErr != nil {
			continue
		}
		missions = append(missions, toMissionPlanResponse(mission))
	}

	recomputeMs := time.Since(start).Milliseconds()
	for i := range missions {
		missions[i].RecomputeMs = recomputeMs
	}

	writeJSON(w, http.StatusOK, MissionPlansResponse{
		Scenario:           graph.Metadata.Scenario,
		AppliedFailureEdge: failedEdgeID,
		FailureStatus:      failureStatus,
		RecomputeMs:        recomputeMs,
		Missions:           missions,
	})
}

func (s *Server) handleTriageStatus(w http.ResponseWriter, r *http.Request) {
	baseGraph, err := scenario.LoadGraph(s.mapPath)
	if err != nil {
		writeError(w, http.StatusBadGateway, err)
		return
	}

	currentGraph, err := s.loadGraph(r)
	if err != nil {
		writeError(w, http.StatusBadGateway, err)
		return
	}

	mode := defaultString(r.URL.Query().Get("mode"), "simulated_breach")
	failedEdgeID := strings.TrimSpace(r.URL.Query().Get("failed_edge"))
	if mode == "simulated_breach" && failedEdgeID == "" {
		failedEdgeID = "E3"
	}
	failureStatus := defaultString(r.URL.Query().Get("failure_status"), "washed_out")
	if failedEdgeID != "" {
		currentGraph = applyEdgeFailure(currentGraph, failedEdgeID, failureStatus)
	}
	slowdownPct, err := parseIntQuery(r, "slowdown_pct", 0)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	start := time.Now()
	snapshot, err := triage.Evaluate(baseGraph, currentGraph, triage.EvaluateOptions{
		FailedEdgeID: failedEdgeID,
		Mode:         mode,
		SlowdownPct:  slowdownPct,
	})
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, err)
		return
	}

	writeJSON(w, http.StatusOK, TriageStatusResponse{
		Snapshot: snapshot,
		Decision: PreemptionDecision{
			Triggered:        snapshot.Decision.Triggered,
			Action:           snapshot.Decision.Action,
			SafeWaypoint:     snapshot.Decision.SafeWaypoint,
			DropCargoIDs:     snapshot.Decision.DropCargoIDs,
			KeepCargoIDs:     snapshot.Decision.KeepCargoIDs,
			RerouteVehicle:   snapshot.Decision.RerouteVehicle,
			CurrentETAMins:   snapshot.Decision.CurrentETAMins,
			RerouteETAMins:   snapshot.Decision.RerouteETAMins,
			DecisionReason:   snapshot.Decision.DecisionReason,
			AuditTrailAnchor: snapshot.Decision.AuditTrailAnchor,
		},
		RecomputeMs: time.Since(start).Milliseconds(),
	})
}

func (s *Server) handlePredictiveStatus(w http.ResponseWriter, r *http.Request) {
	graph, err := s.loadGraph(r)
	if err != nil {
		writeError(w, http.StatusBadGateway, err)
		return
	}

	start := time.Now()
	status, err := predictive.Evaluate(graph, s.repoRoot())
	if err != nil {
		writeError(w, http.StatusUnprocessableEntity, err)
		return
	}

	writeJSON(w, http.StatusOK, PredictiveStatusResponse{
		Status:      status,
		RecomputeMs: time.Since(start).Milliseconds(),
	})
}

func (s *Server) handleFleetOrchestrationStatus(w http.ResponseWriter, r *http.Request) {
	graph, err := s.loadGraph(r)
	if err != nil {
		writeError(w, http.StatusBadGateway, err)
		return
	}

	start := time.Now()
	status := orchestration.Evaluate(graph)
	writeJSON(w, http.StatusOK, FleetOrchestrationStatusResponse{
		Status:      status,
		RecomputeMs: time.Since(start).Milliseconds(),
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

func defaultMissionRequests() []routing.MissionRequest {
	return []routing.MissionRequest{
		{
			MissionID: "mission-med-airlift",
			Label:     "Medical handoff to Companyganj",
			Stages: []routing.RouteRequest{
				{
					VehicleType: routing.VehicleTypeTruck,
					Source:      "N1",
					Target:      "N2",
					PayloadKg:   12,
				},
				{
					VehicleType: routing.VehicleTypeDrone,
					Source:      "N2",
					Target:      "N4",
					PayloadKg:   12,
				},
			},
		},
		{
			MissionID: "mission-river-relief",
			Label:     "Bulk relief to Sunamganj",
			Stages: []routing.RouteRequest{
				{
					VehicleType: routing.VehicleTypeSpeedboat,
					Source:      "N1",
					Target:      "N3",
					PayloadKg:   80,
				},
			},
		},
	}
}

func toMissionPlanResponse(plan routing.MissionPlan) MissionPlanResponse {
	stages := make([]RoutePreviewResponse, 0, len(plan.Stages))
	for _, stage := range plan.Stages {
		if len(stage.Legs) == 0 {
			continue
		}
		stages = append(stages, RoutePreviewResponse{
			Source:    stage.Legs[0].Source,
			Target:    stage.Legs[len(stage.Legs)-1].Target,
			Vehicle:   string(stage.VehicleType),
			PayloadKg: stage.PayloadKg,
			TotalMins: stage.TotalMins,
			TotalCost: stage.TotalCost,
			LegCount:  len(stage.Legs),
			Legs:      stage.Legs,
		})
	}

	handoffs := make([]HandoffEventResponse, 0, len(plan.Handoffs))
	for _, handoff := range plan.Handoffs {
		handoffs = append(handoffs, HandoffEventResponse{
			NodeID:      handoff.NodeID,
			FromVehicle: string(handoff.FromVehicle),
			ToVehicle:   string(handoff.ToVehicle),
			PayloadKg:   handoff.PayloadKg,
			Reason:      handoff.Reason,
		})
	}

	return MissionPlanResponse{
		MissionID:  plan.MissionID,
		Label:      plan.Label,
		TotalMins:  plan.TotalMins,
		TotalCost:  plan.TotalCost,
		StageCount: len(stages),
		Stages:     stages,
		Handoffs:   handoffs,
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

func (s *Server) repoRoot() string {
	return filepath.Clean(filepath.Join(filepath.Dir(s.mapPath), ".."))
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
