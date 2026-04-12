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
	acceptedOps   map[string]struct{}
	pendingByReplica map[string][]*digitaldeltav1.RelayEnvelope
}

func New(mapPath, chaosURL string) *Server {
	return &Server{
		mapPath:         filepath.Clean(mapPath),
		chaosURL:        chaosURL,
		acceptedOps:     map[string]struct{}{},
		pendingByReplica: map[string][]*digitaldeltav1.RelayEnvelope{},
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
			AppliedRiskPenalty: float64(leg.RiskPenalty),
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

func (s *Server) ExchangeBundle(_ context.Context, req *digitaldeltav1.ExchangeBundleRequest) (*digitaldeltav1.ExchangeBundleResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	accepted := make([]string, 0)
	rejected := make([]string, 0)
	pending := make([]string, 0)

	bundle := req.GetBundle()
	if bundle == nil {
		return &digitaldeltav1.ExchangeBundleResponse{
			ReplicaId:            req.GetTargetReplicaId(),
			AcceptedOperationIds: accepted,
			RejectedOperationIds: rejected,
			PendingEnvelopeIds:   pending,
		}, nil
	}

	for _, operation := range bundle.GetOperations() {
		if _, exists := s.acceptedOps[operation.GetOperationId()]; exists {
			rejected = append(rejected, operation.GetOperationId())
			continue
		}
		s.acceptedOps[operation.GetOperationId()] = struct{}{}
		accepted = append(accepted, operation.GetOperationId())
	}

	for _, envelope := range bundle.GetEnvelopes() {
		target := envelope.GetIntendedRecipientNodeId()
		if target == "" {
			continue
		}
		s.pendingByReplica[target] = append(s.pendingByReplica[target], envelope)
		pending = append(pending, envelope.GetEnvelopeId())
	}

	return &digitaldeltav1.ExchangeBundleResponse{
		ReplicaId:            req.GetTargetReplicaId(),
		AcceptedOperationIds: accepted,
		RejectedOperationIds: rejected,
		PendingEnvelopeIds:   pending,
	}, nil
}

func (s *Server) PullPending(_ context.Context, req *digitaldeltav1.PullPendingRequest) (*digitaldeltav1.PullPendingResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	queue := s.pendingByReplica[req.GetReplicaId()]
	if len(queue) == 0 {
		return &digitaldeltav1.PullPendingResponse{Envelopes: []*digitaldeltav1.RelayEnvelope{}}, nil
	}

	limit := int(req.GetMaxItems())
	if limit <= 0 || limit > len(queue) {
		limit = len(queue)
	}

	result := append([]*digitaldeltav1.RelayEnvelope(nil), queue[:limit]...)
	s.pendingByReplica[req.GetReplicaId()] = append([]*digitaldeltav1.RelayEnvelope(nil), queue[limit:]...)
	return &digitaldeltav1.PullPendingResponse{Envelopes: result}, nil
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
