package orchestration

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math"
	"sort"
	"time"

	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/routing"
	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/scenario"
)

type DroneRequiredZone struct {
	NodeID         string  `json:"node_id"`
	Name           string  `json:"name"`
	Lat            float64 `json:"lat"`
	Lng            float64 `json:"lng"`
	Reason         string  `json:"reason"`
	TruckReachable bool    `json:"truck_reachable"`
	BoatReachable  bool    `json:"boat_reachable"`
	DroneReachable bool    `json:"drone_reachable"`
}

type ReachabilityReport struct {
	Mode               string              `json:"mode"`
	BlockedEdges       []string            `json:"blocked_edges"`
	DroneRequiredZones []DroneRequiredZone `json:"drone_required_zones"`
}

type RendezvousScenario struct {
	ScenarioID          string  `json:"scenario_id"`
	Label               string  `json:"label"`
	BoatNodeID          string  `json:"boat_node_id"`
	DroneBaseNodeID     string  `json:"drone_base_node_id"`
	DestinationNodeID   string  `json:"destination_node_id"`
	BestMeetingNodeID   string  `json:"best_meeting_node_id"`
	BestMeetingLat      float64 `json:"best_meeting_lat"`
	BestMeetingLng      float64 `json:"best_meeting_lng"`
	BoatTravelMins      int     `json:"boat_travel_mins"`
	DroneTravelMins     int     `json:"drone_travel_mins"`
	DroneFinalLegMins   int     `json:"drone_final_leg_mins"`
	CombinedMissionMins int     `json:"combined_mission_mins"`
	DroneRangeKm        float64 `json:"drone_range_km"`
	PayloadKg           int     `json:"payload_kg"`
	Feasible            bool    `json:"feasible"`
	Explanation         string  `json:"explanation"`
}

type HandoffLedgerEvent struct {
	EventType string `json:"event_type"`
	Actor     string `json:"actor"`
	Detail    string `json:"detail"`
	CreatedAt string `json:"created_at"`
	Hash      string `json:"hash"`
}

type HandoffSimulation struct {
	ScenarioLabel        string               `json:"scenario_label"`
	BoatArrivalNodeID    string               `json:"boat_arrival_node_id"`
	PodReceiptID         string               `json:"pod_receipt_id"`
	BoatSignatureHash    string               `json:"boat_signature_hash"`
	DroneCountersignHash string               `json:"drone_countersign_hash"`
	OwnershipBefore      string               `json:"ownership_before"`
	OwnershipAfter       string               `json:"ownership_after"`
	TransferredCargoID   string               `json:"transferred_cargo_id"`
	LedgerHistory        []HandoffLedgerEvent `json:"ledger_history"`
}

type MeshThrottleRule struct {
	Rule         string `json:"rule"`
	ReductionPct int    `json:"reduction_pct"`
	Applied      bool   `json:"applied"`
	Reason       string `json:"reason"`
}

type MeshThrottleSimulation struct {
	BatteryPct              int                `json:"battery_pct"`
	AccelerometerState      string             `json:"accelerometer_state"`
	ProximityMeters         float64            `json:"proximity_meters"`
	BaseIntervalSeconds     float64            `json:"base_interval_seconds"`
	AdjustedIntervalSeconds float64            `json:"adjusted_interval_seconds"`
	DurationMinutes         int                `json:"duration_minutes"`
	BaselineBroadcasts      int                `json:"baseline_broadcasts"`
	AdjustedBroadcasts      int                `json:"adjusted_broadcasts"`
	BaselineBatteryDrain    float64            `json:"baseline_battery_drain_pct"`
	AdjustedBatteryDrain    float64            `json:"adjusted_battery_drain_pct"`
	BatterySavingsPct       float64            `json:"battery_savings_pct"`
	AppliedRules            []MeshThrottleRule `json:"applied_rules"`
}

type Status struct {
	LiveReachability  ReachabilityReport     `json:"live_reachability"`
	DrillReachability ReachabilityReport     `json:"drill_reachability"`
	Rendezvous        []RendezvousScenario   `json:"rendezvous"`
	Handoff           HandoffSimulation      `json:"handoff"`
	MeshThrottle      MeshThrottleSimulation `json:"mesh_throttle"`
}

type RendezvousInput struct {
	ScenarioID        string
	Label             string
	BoatNodeID        string
	DroneBaseNodeID   string
	DestinationNodeID string
	PayloadKg         int
	DroneRangeKm      float64
}

func Evaluate(graph scenario.Graph) Status {
	drillGraph := cloneGraph(graph)
	drillGraph = applyEdgeFailures(drillGraph, []string{"E3", "E7"})

	return Status{
		LiveReachability:  analyzeReachability(graph, "live", nil),
		DrillReachability: analyzeReachability(drillGraph, "handoff_drill", []string{"E3", "E7"}),
		Rendezvous: []RendezvousScenario{
			computeRendezvous(graph, RendezvousInput{
				ScenarioID:        "rv-1",
				Label:             "Boat to drone lift for Companyganj",
				BoatNodeID:        "N1",
				DroneBaseNodeID:   "N2",
				DestinationNodeID: "N4",
				PayloadKg:         8,
				DroneRangeKm:      70,
			}),
			computeRendezvous(graph, RendezvousInput{
				ScenarioID:        "rv-2",
				Label:             "Medical relay to Sunamganj",
				BoatNodeID:        "N1",
				DroneBaseNodeID:   "N2",
				DestinationNodeID: "N3",
				PayloadKg:         6,
				DroneRangeKm:      80,
			}),
			computeRendezvous(graph, RendezvousInput{
				ScenarioID:        "rv-3",
				Label:             "Habiganj air bridge",
				BoatNodeID:        "N3",
				DroneBaseNodeID:   "N4",
				DestinationNodeID: "N6",
				PayloadKg:         7,
				DroneRangeKm:      90,
			}),
		},
		Handoff:      simulateHandoff(),
		MeshThrottle: simulateMeshThrottle(),
	}
}

func analyzeReachability(graph scenario.Graph, mode string, blockedEdges []string) ReachabilityReport {
	engine := routing.NewEngine(graph)
	zones := make([]DroneRequiredZone, 0)
	for _, node := range graph.Nodes {
		if node.Type != "relief_camp" && node.Type != "hospital" {
			continue
		}
		if node.ID == "N1" || node.ID == "N2" {
			continue
		}

		_, truckErr := engine.ComputeRoute(routing.RouteRequest{
			VehicleType: routing.VehicleTypeTruck,
			Source:      "N1",
			Target:      node.ID,
			PayloadKg:   80,
		})
		_, boatErr := engine.ComputeRoute(routing.RouteRequest{
			VehicleType: routing.VehicleTypeSpeedboat,
			Source:      "N1",
			Target:      node.ID,
			PayloadKg:   80,
		})
		_, droneErr := engine.ComputeRoute(routing.RouteRequest{
			VehicleType: routing.VehicleTypeDrone,
			Source:      "N2",
			Target:      node.ID,
			PayloadKg:   12,
		})

		truckReachable := truckErr == nil
		boatReachable := boatErr == nil
		droneReachable := droneErr == nil
		if !truckReachable && !boatReachable && droneReachable {
			zones = append(zones, DroneRequiredZone{
				NodeID:         node.ID,
				Name:           node.Name,
				Lat:            node.Lat,
				Lng:            node.Lng,
				Reason:         "Road and water access unavailable; drone handoff required.",
				TruckReachable: truckReachable,
				BoatReachable:  boatReachable,
				DroneReachable: droneReachable,
			})
		}
	}

	return ReachabilityReport{
		Mode:               mode,
		BlockedEdges:       blockedEdges,
		DroneRequiredZones: zones,
	}
}

func computeRendezvous(graph scenario.Graph, input RendezvousInput) RendezvousScenario {
	boatEngine := routing.NewEngine(graph)
	destination := findNode(graph, input.DestinationNodeID)
	base := findNode(graph, input.DroneBaseNodeID)
	if destination == nil || base == nil {
		return RendezvousScenario{
			ScenarioID:  input.ScenarioID,
			Label:       input.Label,
			Feasible:    false,
			Explanation: "Destination or drone base not found in graph.",
		}
	}

	type candidate struct {
		node        scenario.Node
		boat        int
		droneToMeet int
		droneToDest int
		total       int
	}

	var best *candidate
	for _, node := range graph.Nodes {
		boatPlan, boatErr := boatEngine.ComputeRoute(routing.RouteRequest{
			VehicleType: routing.VehicleTypeSpeedboat,
			Source:      input.BoatNodeID,
			Target:      node.ID,
			PayloadKg:   input.PayloadKg,
		})
		if boatErr != nil {
			continue
		}

		droneToMeetKm := haversineKm(base.Lat, base.Lng, node.Lat, node.Lng)
		droneToDestKm := haversineKm(node.Lat, node.Lng, destination.Lat, destination.Lng)
		if droneToMeetKm+droneToDestKm > input.DroneRangeKm || input.PayloadKg > 12 {
			continue
		}

		droneMeetMins := kmToDroneMinutes(droneToMeetKm)
		droneDestMins := kmToDroneMinutes(droneToDestKm)
		total := maxInt(boatPlan.TotalMins, droneMeetMins) + droneDestMins
		next := &candidate{
			node:        node,
			boat:        boatPlan.TotalMins,
			droneToMeet: droneMeetMins,
			droneToDest: droneDestMins,
			total:       total,
		}
		if best == nil || next.total < best.total {
			best = next
		}
	}

	if best == nil {
		return RendezvousScenario{
			ScenarioID:        input.ScenarioID,
			Label:             input.Label,
			BoatNodeID:        input.BoatNodeID,
			DroneBaseNodeID:   input.DroneBaseNodeID,
			DestinationNodeID: input.DestinationNodeID,
			DroneRangeKm:      input.DroneRangeKm,
			PayloadKg:         input.PayloadKg,
			Feasible:          false,
			Explanation:       "No rendezvous point satisfies both water access and drone range.",
		}
	}

	return RendezvousScenario{
		ScenarioID:          input.ScenarioID,
		Label:               input.Label,
		BoatNodeID:          input.BoatNodeID,
		DroneBaseNodeID:     input.DroneBaseNodeID,
		DestinationNodeID:   input.DestinationNodeID,
		BestMeetingNodeID:   best.node.ID,
		BestMeetingLat:      best.node.Lat,
		BestMeetingLng:      best.node.Lng,
		BoatTravelMins:      best.boat,
		DroneTravelMins:     best.droneToMeet,
		DroneFinalLegMins:   best.droneToDest,
		CombinedMissionMins: best.total,
		DroneRangeKm:        input.DroneRangeKm,
		PayloadKg:           input.PayloadKg,
		Feasible:            true,
		Explanation:         fmt.Sprintf("Rendezvous at %s minimizes wait plus final-leg time.", best.node.Name),
	}
}

func simulateHandoff() HandoffSimulation {
	now := time.Now().UTC()
	makeHash := func(parts ...string) string {
		sum := sha256.Sum256([]byte(fmt.Sprint(parts)))
		return hex.EncodeToString(sum[:])
	}
	receiptID := "pod-boat-drone-001"
	boatSig := makeHash("boat", receiptID, now.Format(time.RFC3339))
	droneSig := makeHash("drone", receiptID, now.Add(45*time.Second).Format(time.RFC3339))
	events := []HandoffLedgerEvent{
		{
			EventType: "boat_arrival",
			Actor:     "boat-operator",
			Detail:    "Boat reached rendezvous node N2 with the medical payload.",
			CreatedAt: now.Format(time.RFC3339),
			Hash:      makeHash("boat_arrival", now.Format(time.RFC3339)),
		},
		{
			EventType: "pod_challenge_generated",
			Actor:     "boat-operator",
			Detail:    "Generated PoD receipt challenge for drone pickup.",
			CreatedAt: now.Add(10 * time.Second).Format(time.RFC3339),
			Hash:      makeHash("pod_challenge_generated", now.Add(10*time.Second).Format(time.RFC3339)),
		},
		{
			EventType: "drone_countersigned",
			Actor:     "drone-operator",
			Detail:    "Drone acknowledged pickup and countersigned the handoff receipt.",
			CreatedAt: now.Add(45 * time.Second).Format(time.RFC3339),
			Hash:      droneSig,
		},
		{
			EventType: "ownership_transferred",
			Actor:     "sync-ledger",
			Detail:    "CRDT ledger updated: ownership transferred from boat convoy to drone flight.",
			CreatedAt: now.Add(55 * time.Second).Format(time.RFC3339),
			Hash:      makeHash("ownership_transferred", now.Add(55*time.Second).Format(time.RFC3339)),
		},
	}

	return HandoffSimulation{
		ScenarioLabel:        "Boat-to-drone last-mile transfer",
		BoatArrivalNodeID:    "N2",
		PodReceiptID:         receiptID,
		BoatSignatureHash:    boatSig,
		DroneCountersignHash: droneSig,
		OwnershipBefore:      "boat-convoy",
		OwnershipAfter:       "drone-flight",
		TransferredCargoID:   "cargo-p0-antivenom",
		LedgerHistory:        events,
	}
}

func simulateMeshThrottle() MeshThrottleSimulation {
	baseInterval := 5.0
	batteryPct := 24
	accelerometerState := "stationary"
	proximityMeters := 18.0

	rules := []MeshThrottleRule{
		{
			Rule:         "battery_below_30",
			ReductionPct: 60,
			Applied:      batteryPct < 30,
			Reason:       "Battery under 30% reduces broadcast frequency by 60%.",
		},
		{
			Rule:         "stationary_motion",
			ReductionPct: 80,
			Applied:      accelerometerState == "stationary",
			Reason:       "Stationary state reduces broadcast frequency by 80%.",
		},
		{
			Rule:         "near_known_node",
			ReductionPct: 50,
			Applied:      proximityMeters <= 25,
			Reason:       "Near a known node, mesh rebroadcasts can be throttled further.",
		},
	}

	multiplier := 1.0
	for _, rule := range rules {
		if rule.Applied {
			multiplier *= 1 / (1 - float64(rule.ReductionPct)/100)
		}
	}
	adjustedInterval := baseInterval * multiplier
	durationSeconds := 10 * 60
	baselineBroadcasts := int(float64(durationSeconds) / baseInterval)
	adjustedBroadcasts := int(float64(durationSeconds) / adjustedInterval)
	if adjustedBroadcasts < 1 {
		adjustedBroadcasts = 1
	}
	baselineDrain := float64(baselineBroadcasts) * 0.018
	adjustedDrain := float64(adjustedBroadcasts) * 0.018
	savingsPct := ((baselineDrain - adjustedDrain) / baselineDrain) * 100

	return MeshThrottleSimulation{
		BatteryPct:              batteryPct,
		AccelerometerState:      accelerometerState,
		ProximityMeters:         proximityMeters,
		BaseIntervalSeconds:     baseInterval,
		AdjustedIntervalSeconds: roundFloat(adjustedInterval),
		DurationMinutes:         10,
		BaselineBroadcasts:      baselineBroadcasts,
		AdjustedBroadcasts:      adjustedBroadcasts,
		BaselineBatteryDrain:    roundFloat(baselineDrain),
		AdjustedBatteryDrain:    roundFloat(adjustedDrain),
		BatterySavingsPct:       roundFloat(savingsPct),
		AppliedRules:            rules,
	}
}

func cloneGraph(graph scenario.Graph) scenario.Graph {
	clone := graph
	clone.Nodes = append([]scenario.Node(nil), graph.Nodes...)
	clone.Edges = append([]scenario.Edge(nil), graph.Edges...)
	return clone
}

func applyEdgeFailures(graph scenario.Graph, edgeIDs []string) scenario.Graph {
	clone := cloneGraph(graph)
	set := make(map[string]struct{}, len(edgeIDs))
	for _, edgeID := range edgeIDs {
		set[edgeID] = struct{}{}
	}
	for i := range clone.Edges {
		if _, ok := set[clone.Edges[i].ID]; !ok {
			continue
		}
		clone.Edges[i].IsFlooded = true
		clone.Edges[i].BaseWeightMins = 9999
		clone.Edges[i].Status = "handoff_drill_blocked"
	}
	return clone
}

func findNode(graph scenario.Graph, nodeID string) *scenario.Node {
	for i := range graph.Nodes {
		if graph.Nodes[i].ID == nodeID {
			return &graph.Nodes[i]
		}
	}
	return nil
}

func haversineKm(lat1, lng1, lat2, lng2 float64) float64 {
	const earthRadius = 6371.0
	toRad := func(value float64) float64 { return value * math.Pi / 180 }
	dLat := toRad(lat2 - lat1)
	dLng := toRad(lng2 - lng1)
	lat1 = toRad(lat1)
	lat2 = toRad(lat2)

	a := math.Sin(dLat/2)*math.Sin(dLat/2) + math.Cos(lat1)*math.Cos(lat2)*math.Sin(dLng/2)*math.Sin(dLng/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return earthRadius * c
}

func kmToDroneMinutes(distanceKm float64) int {
	const droneSpeedKmPerMin = 1.2
	return int(math.Ceil(distanceKm / droneSpeedKmPerMin))
}

func maxInt(left, right int) int {
	if left > right {
		return left
	}
	return right
}

func roundFloat(value float64) float64 {
	return math.Round(value*100) / 100
}

func SortRendezvousByTotal(scenarios []RendezvousScenario) {
	sort.Slice(scenarios, func(i, j int) bool {
		return scenarios[i].CombinedMissionMins < scenarios[j].CombinedMissionMins
	})
}
