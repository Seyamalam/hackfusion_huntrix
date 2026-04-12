package routing

import "fmt"

type MissionRequest struct {
	MissionID string
	Label     string
	Stages    []RouteRequest
}

type HandoffEvent struct {
	NodeID      string
	FromVehicle VehicleType
	ToVehicle   VehicleType
	PayloadKg   int
	Reason      string
}

type MissionPlan struct {
	MissionID string
	Label     string
	Stages    []RoutePlan
	Handoffs  []HandoffEvent
	TotalMins int
	TotalCost int
}

func (e *Engine) ComputeMission(request MissionRequest) (MissionPlan, error) {
	if len(request.Stages) == 0 {
		return MissionPlan{}, fmt.Errorf("mission %q has no stages", request.MissionID)
	}

	plans := make([]RoutePlan, 0, len(request.Stages))
	handoffs := make([]HandoffEvent, 0, len(request.Stages)-1)
	totalMins := 0
	totalCost := 0

	for i, stage := range request.Stages {
		plan, err := e.ComputeRoute(stage)
		if err != nil {
			return MissionPlan{}, fmt.Errorf("compute stage %d for mission %q: %w", i, request.MissionID, err)
		}

		plans = append(plans, plan)
		totalMins += plan.TotalMins
		totalCost += plan.TotalCost

		if i == len(request.Stages)-1 {
			continue
		}

		next := request.Stages[i+1]
		if stage.Target != next.Source {
			return MissionPlan{}, fmt.Errorf(
				"mission %q has disconnected stages at index %d (%s -> %s)",
				request.MissionID,
				i,
				stage.Target,
				next.Source,
			)
		}

		if stage.VehicleType != next.VehicleType {
			handoffs = append(handoffs, HandoffEvent{
				NodeID:      stage.Target,
				FromVehicle: stage.VehicleType,
				ToVehicle:   next.VehicleType,
				PayloadKg:   next.PayloadKg,
				Reason:      "mode transfer required at logistics waypoint",
			})
		}
	}

	return MissionPlan{
		MissionID: request.MissionID,
		Label:     request.Label,
		Stages:    plans,
		Handoffs:  handoffs,
		TotalMins: totalMins,
		TotalCost: totalCost,
	}, nil
}
