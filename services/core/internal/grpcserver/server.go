package grpcserver

import (
	"context"
	"fmt"
	"path/filepath"
	"sync"

	digitaldeltav1 "github.com/Seyamalam/hackfusion_huntrix/proto/gen/go/digitaldeltav1"
	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/chaos"
	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/routing"
	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/scenario"
)

type Server struct {
	digitaldeltav1.UnimplementedRoutingServiceServer
	digitaldeltav1.UnimplementedSyncServiceServer
	digitaldeltav1.UnimplementedDeliveryServiceServer

	mapPath  string
	chaosURL string

	mu            sync.RWMutex
	overrideGraph *scenario.Graph
}

func New(mapPath, chaosURL string) *Server {
	return &Server{
		mapPath:  filepath.Clean(mapPath),
		chaosURL: chaosURL,
	}
}

func (s *Server) ComputeRoute(ctx context.Context, req *digitaldeltav1.RouteRequest) (*digitaldeltav1.RoutePlan, error) {
	graph, err := s.loadGraph(ctx)
	if err != nil {
		return nil, err
	}

	engine := routing.NewEngine(graph)
	plan, err := engine.ComputeShortestPath(
		toRoutingVehicle(req.GetVehicleType()),
		req.GetOriginNodeId(),
		req.GetDestinationNodeId(),
	)
	if err != nil {
		return nil, err
	}

	legs := make([]*digitaldeltav1.RouteLeg, 0, len(plan.Legs))
	for _, leg := range plan.Legs {
		legs = append(legs, &digitaldeltav1.RouteLeg{
			EdgeId:             leg.EdgeID,
			SourceNodeId:       leg.Source,
			TargetNodeId:       leg.Target,
			LinkType:           toProtoLinkType(leg.LinkType),
			WeightMins:         uint32(leg.WeightMins),
			AppliedRiskPenalty: 0,
		})
	}

	return &digitaldeltav1.RoutePlan{
		RouteId:            req.GetRequestId(),
		Legs:               legs,
		TotalEtaMins:       uint32(plan.TotalMins),
		SlaBreachPredicted: false,
		Explanation:        fmt.Sprintf("Computed %s route across %d leg(s)", plan.VehicleType, len(plan.Legs)),
	}, nil
}

func (s *Server) UpsertNetworkState(_ context.Context, req *digitaldeltav1.UpsertNetworkStateRequest) (*digitaldeltav1.UpsertNetworkStateResponse, error) {
	graph := scenario.Graph{
		Nodes: make([]scenario.Node, 0, len(req.GetNodes())),
		Edges: make([]scenario.Edge, 0, len(req.GetEdges())),
	}

	for _, node := range req.GetNodes() {
		graph.Nodes = append(graph.Nodes, scenario.Node{
			ID:   node.GetNodeId(),
			Name: node.GetName(),
			Type: node.GetNodeType(),
			Lat:  node.GetLocation().GetLat(),
			Lng:  node.GetLocation().GetLng(),
		})
	}

	for _, edge := range req.GetEdges() {
		graph.Edges = append(graph.Edges, scenario.Edge{
			ID:             edge.GetEdgeId(),
			Source:         edge.GetSourceNodeId(),
			Target:         edge.GetTargetNodeId(),
			Type:           toScenarioLinkType(edge.GetLinkType()),
			BaseWeightMins: int(edge.GetBaseWeightMins()),
			IsFlooded:      edge.GetBlocked(),
		})
	}

	s.mu.Lock()
	s.overrideGraph = &graph
	s.mu.Unlock()

	return &digitaldeltav1.UpsertNetworkStateResponse{
		NodeCount: uint32(len(graph.Nodes)),
		EdgeCount: uint32(len(graph.Edges)),
	}, nil
}

func (s *Server) loadGraph(ctx context.Context) (scenario.Graph, error) {
	s.mu.RLock()
	if s.overrideGraph != nil {
		defer s.mu.RUnlock()
		return *s.overrideGraph, nil
	}
	s.mu.RUnlock()

	if s.chaosURL != "" {
		return chaos.NewClient(s.chaosURL).FetchNetworkStatus(ctx)
	}

	return scenario.LoadGraph(s.mapPath)
}

func toRoutingVehicle(vehicle digitaldeltav1.VehicleType) routing.VehicleType {
	switch vehicle {
	case digitaldeltav1.VehicleType_VEHICLE_TYPE_SPEEDBOAT:
		return routing.VehicleTypeSpeedboat
	case digitaldeltav1.VehicleType_VEHICLE_TYPE_DRONE:
		return routing.VehicleTypeDrone
	default:
		return routing.VehicleTypeTruck
	}
}

func toProtoLinkType(linkType scenario.LinkType) digitaldeltav1.LinkType {
	switch linkType {
	case scenario.LinkTypeWaterway:
		return digitaldeltav1.LinkType_LINK_TYPE_WATERWAY
	case scenario.LinkTypeAirway:
		return digitaldeltav1.LinkType_LINK_TYPE_AIRWAY
	default:
		return digitaldeltav1.LinkType_LINK_TYPE_ROAD
	}
}

func toScenarioLinkType(linkType digitaldeltav1.LinkType) scenario.LinkType {
	switch linkType {
	case digitaldeltav1.LinkType_LINK_TYPE_WATERWAY:
		return scenario.LinkTypeWaterway
	case digitaldeltav1.LinkType_LINK_TYPE_AIRWAY:
		return scenario.LinkTypeAirway
	default:
		return scenario.LinkTypeRoad
	}
}
