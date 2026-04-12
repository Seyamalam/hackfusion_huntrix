package triage

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/routing"
	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/scenario"
	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/syncmodel"
)

type PriorityTier string

const (
	PriorityTierP0 PriorityTier = "P0"
	PriorityTierP1 PriorityTier = "P1"
	PriorityTierP2 PriorityTier = "P2"
	PriorityTierP3 PriorityTier = "P3"
)

type TaxonomyEntry struct {
	Tier        PriorityTier          `json:"tier"`
	Label       string                `json:"label"`
	SLAHours    int                   `json:"sla_hours"`
	LastWriter  string                `json:"last_writer"`
	UpdatedAt   string                `json:"updated_at"`
	VectorClock syncmodel.VectorClock `json:"vector_clock"`
}

type CargoItem struct {
	CargoID         string                `json:"cargo_id"`
	Name            string                `json:"name"`
	Priority        PriorityTier          `json:"priority"`
	SLAHours        int                   `json:"sla_hours"`
	PayloadKg       int                   `json:"payload_kg"`
	MissionID       string                `json:"mission_id"`
	DestinationNode string                `json:"destination_node"`
	SafeWaypoint    string                `json:"safe_waypoint"`
	Status          string                `json:"status"`
	LastWriter      string                `json:"last_writer"`
	UpdatedAt       string                `json:"updated_at"`
	VectorClock     syncmodel.VectorClock `json:"vector_clock"`
}

type BreachPrediction struct {
	CargoID          string       `json:"cargo_id"`
	Name             string       `json:"name"`
	Priority         PriorityTier `json:"priority"`
	BaseETAMins      int          `json:"base_eta_mins"`
	CurrentETAMins   int          `json:"current_eta_mins"`
	SlowdownPct      int          `json:"slowdown_pct"`
	SLAWindowMins    int          `json:"sla_window_mins"`
	WillBreach       bool         `json:"will_breach"`
	RequiresReview   bool         `json:"requires_review"`
	RecommendedTrack string       `json:"recommended_track"`
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

type AuditEntry struct {
	ID        string `json:"id"`
	Type      string `json:"type"`
	CreatedAt string `json:"created_at"`
	Detail    string `json:"detail"`
	PrevHash  string `json:"prev_hash"`
	Hash      string `json:"hash"`
}

type Snapshot struct {
	ScenarioName    string             `json:"scenario_name"`
	TriggerSource   string             `json:"trigger_source"`
	Mode            string             `json:"mode"`
	BaselineETAMins int                `json:"baseline_eta_mins"`
	CurrentETAMins  int                `json:"current_eta_mins"`
	SlowdownPct     int                `json:"slowdown_pct"`
	PriorityTiers   []TaxonomyEntry    `json:"priority_tiers"`
	CargoItems      []CargoItem        `json:"cargo_items"`
	Predictions     []BreachPrediction `json:"predictions"`
	Decision        PreemptionDecision `json:"decision"`
	AuditLog        []AuditEntry       `json:"audit_log"`
}

type EvaluateOptions struct {
	FailedEdgeID string
	Mode         string
	SlowdownPct  int
}

func Evaluate(baseGraph, currentGraph scenario.Graph, options EvaluateOptions) (Snapshot, error) {
	engineBase := routing.NewEngine(baseGraph)
	engineCurrent := routing.NewEngine(currentGraph)

	convoyRequest := routing.RouteRequest{
		VehicleType: routing.VehicleTypeTruck,
		Source:      "N1",
		Target:      "N4",
		PayloadKg:   90,
	}

	baselinePlan, err := engineBase.ComputeRoute(convoyRequest)
	if err != nil {
		return Snapshot{}, fmt.Errorf("compute baseline convoy route: %w", err)
	}

	currentPlan, currentErr := engineCurrent.ComputeRoute(convoyRequest)
	currentETAMins := baselinePlan.TotalMins
	triggerSource := "Live route remains stable."
	if currentErr != nil {
		currentETAMins = baselinePlan.TotalMins + 145
		triggerSource = "Primary truck corridor is unavailable; fallback delay estimate applied."
	} else {
		currentETAMins = currentPlan.TotalMins
	}

	if options.SlowdownPct > 0 {
		currentETAMins = baselinePlan.TotalMins + (baselinePlan.TotalMins*options.SlowdownPct)/100
		triggerSource = fmt.Sprintf("Simulated %d%% convoy slowdown applied.", options.SlowdownPct)
	}

	slowdownPct := 0
	if baselinePlan.TotalMins > 0 {
		slowdownPct = ((currentETAMins - baselinePlan.TotalMins) * 100) / baselinePlan.TotalMins
	}

	priorityTiers := defaultPriorityTiers()
	cargoItems := defaultCargoItems()
	predictions := make([]BreachPrediction, 0, len(cargoItems))
	for _, cargo := range cargoItems {
		predictions = append(predictions, BreachPrediction{
			CargoID:          cargo.CargoID,
			Name:             cargo.Name,
			Priority:         cargo.Priority,
			BaseETAMins:      baselinePlan.TotalMins,
			CurrentETAMins:   currentETAMins,
			SlowdownPct:      slowdownPct,
			SLAWindowMins:    cargo.SLAHours * 60,
			WillBreach:       currentETAMins > cargo.SLAHours*60,
			RequiresReview:   slowdownPct >= 30,
			RecommendedTrack: recommendedTrack(cargo.Priority),
		})
	}

	decision := PreemptionDecision{
		Triggered: false,
		Action:    "Continue with current mixed cargo plan.",
	}
	if slowdownPct >= 30 {
		urgentRisk := false
		for _, prediction := range predictions {
			if prediction.WillBreach && (prediction.Priority == PriorityTierP0 || prediction.Priority == PriorityTierP1) {
				urgentRisk = true
				break
			}
		}

		if urgentRisk {
			reroutePlan, rerouteErr := engineCurrent.ComputeMission(routing.MissionRequest{
				MissionID: "triage-reroute",
				Label:     "Urgent reroute after waypoint drop",
				Stages: []routing.RouteRequest{
					{
						VehicleType: routing.VehicleTypeTruck,
						Source:      "N1",
						Target:      "N2",
						PayloadKg:   10,
					},
					{
						VehicleType: routing.VehicleTypeDrone,
						Source:      "N2",
						Target:      "N4",
						PayloadKg:   10,
					},
				},
			})

			rerouteETA := 36
			if rerouteErr == nil {
				rerouteETA = reroutePlan.TotalMins
			}

			decision = PreemptionDecision{
				Triggered:      true,
				Action:         "Deposit P2/P3 cargo at waypoint N2 and reroute with P0/P1 cargo only.",
				SafeWaypoint:   "N2",
				DropCargoIDs:   []string{"cargo-p2-shelter", "cargo-p3-hygiene"},
				KeepCargoIDs:   []string{"cargo-p0-antivenom", "cargo-p1-insulin"},
				RerouteVehicle: "truck -> drone",
				CurrentETAMins: currentETAMins,
				RerouteETAMins: rerouteETA,
				DecisionReason: "Convoy slowdown exceeded 30% and critical cargo would breach SLA without preemption.",
			}
		}
	}

	auditLog := buildAuditLog(triggerSource, slowdownPct, predictions, decision)
	if len(auditLog) > 0 {
		decision.AuditTrailAnchor = auditLog[len(auditLog)-1].Hash
	}

	mode := options.Mode
	if mode == "" {
		mode = "simulated_breach"
	}

	return Snapshot{
		ScenarioName:    "Autonomous Triage Drill",
		TriggerSource:   triggerSource,
		Mode:            mode,
		BaselineETAMins: baselinePlan.TotalMins,
		CurrentETAMins:  currentETAMins,
		SlowdownPct:     slowdownPct,
		PriorityTiers:   priorityTiers,
		CargoItems:      cargoItems,
		Predictions:     predictions,
		Decision:        decision,
		AuditLog:        auditLog,
	}, nil
}

func defaultPriorityTiers() []TaxonomyEntry {
	now := time.Now().UTC().Format(time.RFC3339)
	return []TaxonomyEntry{
		{
			Tier:        PriorityTierP0,
			Label:       "Critical Medical",
			SLAHours:    2,
			LastWriter:  "triage-engine",
			UpdatedAt:   now,
			VectorClock: syncmodel.VectorClock{"triage-engine": 1},
		},
		{
			Tier:        PriorityTierP1,
			Label:       "High Priority",
			SLAHours:    6,
			LastWriter:  "triage-engine",
			UpdatedAt:   now,
			VectorClock: syncmodel.VectorClock{"triage-engine": 2},
		},
		{
			Tier:        PriorityTierP2,
			Label:       "Standard Relief",
			SLAHours:    24,
			LastWriter:  "triage-engine",
			UpdatedAt:   now,
			VectorClock: syncmodel.VectorClock{"triage-engine": 3},
		},
		{
			Tier:        PriorityTierP3,
			Label:       "Low Priority",
			SLAHours:    72,
			LastWriter:  "triage-engine",
			UpdatedAt:   now,
			VectorClock: syncmodel.VectorClock{"triage-engine": 4},
		},
	}
}

func defaultCargoItems() []CargoItem {
	now := time.Now().UTC().Format(time.RFC3339)
	return []CargoItem{
		{
			CargoID:         "cargo-p0-antivenom",
			Name:            "Antivenom cold pack",
			Priority:        PriorityTierP0,
			SLAHours:        2,
			PayloadKg:       4,
			MissionID:       "mission-companyganj-convoy",
			DestinationNode: "N4",
			SafeWaypoint:    "N2",
			Status:          "loaded",
			LastWriter:      "triage-engine",
			UpdatedAt:       now,
			VectorClock:     syncmodel.VectorClock{"triage-engine": 1},
		},
		{
			CargoID:         "cargo-p1-insulin",
			Name:            "Insulin cooler",
			Priority:        PriorityTierP1,
			SLAHours:        6,
			PayloadKg:       6,
			MissionID:       "mission-companyganj-convoy",
			DestinationNode: "N4",
			SafeWaypoint:    "N2",
			Status:          "loaded",
			LastWriter:      "triage-engine",
			UpdatedAt:       now,
			VectorClock:     syncmodel.VectorClock{"triage-engine": 2},
		},
		{
			CargoID:         "cargo-p2-shelter",
			Name:            "Shelter tarp bundle",
			Priority:        PriorityTierP2,
			SLAHours:        24,
			PayloadKg:       35,
			MissionID:       "mission-companyganj-convoy",
			DestinationNode: "N4",
			SafeWaypoint:    "N2",
			Status:          "loaded",
			LastWriter:      "triage-engine",
			UpdatedAt:       now,
			VectorClock:     syncmodel.VectorClock{"triage-engine": 3},
		},
		{
			CargoID:         "cargo-p3-hygiene",
			Name:            "Hygiene kit crate",
			Priority:        PriorityTierP3,
			SLAHours:        72,
			PayloadKg:       45,
			MissionID:       "mission-companyganj-convoy",
			DestinationNode: "N4",
			SafeWaypoint:    "N2",
			Status:          "loaded",
			LastWriter:      "triage-engine",
			UpdatedAt:       now,
			VectorClock:     syncmodel.VectorClock{"triage-engine": 4},
		},
	}
}

func recommendedTrack(priority PriorityTier) string {
	switch priority {
	case PriorityTierP0, PriorityTierP1:
		return "keep_onboard"
	default:
		return "drop_at_waypoint"
	}
}

func buildAuditLog(triggerSource string, slowdownPct int, predictions []BreachPrediction, decision PreemptionDecision) []AuditEntry {
	entries := make([]AuditEntry, 0, 3)
	entries = append(entries, newAuditEntry("slowdown_detected", fmt.Sprintf("%s Slowdown measured at %d%%.", triggerSource, slowdownPct), entries))

	breaches := 0
	for _, prediction := range predictions {
		if prediction.WillBreach {
			breaches++
		}
	}
	entries = append(entries, newAuditEntry("breach_prediction", fmt.Sprintf("%d cargo item(s) predicted to breach SLA.", breaches), entries))

	if decision.Triggered {
		entries = append(entries, newAuditEntry("autonomous_preemption", decision.DecisionReason, entries))
	}

	return entries
}

func newAuditEntry(entryType, detail string, existing []AuditEntry) AuditEntry {
	prevHash := "GENESIS"
	if len(existing) > 0 {
		prevHash = existing[len(existing)-1].Hash
	}
	createdAt := time.Now().UTC().Format(time.RFC3339)
	id := fmt.Sprintf("triage-%d", len(existing)+1)
	hash := hashAuditEntry(id, entryType, createdAt, detail, prevHash)
	return AuditEntry{
		ID:        id,
		Type:      entryType,
		CreatedAt: createdAt,
		Detail:    detail,
		PrevHash:  prevHash,
		Hash:      hash,
	}
}

func hashAuditEntry(id, entryType, createdAt, detail, prevHash string) string {
	raw, _ := json.Marshal(map[string]string{
		"id":         id,
		"type":       entryType,
		"created_at": createdAt,
		"detail":     detail,
		"prev_hash":  prevHash,
	})
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:])
}
