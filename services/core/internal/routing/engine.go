package routing

import (
	"container/heap"
	"errors"
	"fmt"
	"math"

	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/scenario"
)

type VehicleType string

const (
	VehicleTypeTruck     VehicleType = "truck"
	VehicleTypeSpeedboat VehicleType = "speedboat"
	VehicleTypeDrone     VehicleType = "drone"
)

type RouteLeg struct {
	EdgeID     string
	Source     string
	Target     string
	LinkType   scenario.LinkType
	WeightMins int
}

type RoutePlan struct {
	VehicleType VehicleType
	TotalMins   int
	Legs        []RouteLeg
}

type Engine struct {
	graph scenario.Graph
}

func NewEngine(graph scenario.Graph) *Engine {
	return &Engine{graph: graph}
}

func (e *Engine) ComputeShortestPath(vehicle VehicleType, source, target string) (RoutePlan, error) {
	if source == target {
		return RoutePlan{VehicleType: vehicle, TotalMins: 0}, nil
	}

	allowed := allowedLinkTypes(vehicle)
	if len(allowed) == 0 {
		return RoutePlan{}, fmt.Errorf("unsupported vehicle type %q", vehicle)
	}

	dist := make(map[string]int, len(e.graph.Nodes))
	prev := make(map[string]scenario.Edge, len(e.graph.Edges))
	for _, node := range e.graph.Nodes {
		dist[node.ID] = math.MaxInt
	}
	dist[source] = 0

	queue := priorityQueue{{nodeID: source, distance: 0}}
	heap.Init(&queue)

	for queue.Len() > 0 {
		current := heap.Pop(&queue).(queueItem)
		if current.distance > dist[current.nodeID] {
			continue
		}

		if current.nodeID == target {
			break
		}

		for _, edge := range e.graph.Edges {
			if edge.Source != current.nodeID || edge.IsBlocked() {
				continue
			}

			if _, ok := allowed[edge.Type]; !ok {
				continue
			}

			nextDistance := current.distance + edge.BaseWeightMins
			if nextDistance >= dist[edge.Target] {
				continue
			}

			dist[edge.Target] = nextDistance
			prev[edge.Target] = edge
			heap.Push(&queue, queueItem{nodeID: edge.Target, distance: nextDistance})
		}
	}

	if dist[target] == math.MaxInt {
		return RoutePlan{}, errors.New("no route available")
	}

	legs := make([]RouteLeg, 0, len(e.graph.Edges))
	for cursor := target; cursor != source; {
		edge, ok := prev[cursor]
		if !ok {
			return RoutePlan{}, errors.New("failed to reconstruct route")
		}

		legs = append([]RouteLeg{{
			EdgeID:     edge.ID,
			Source:     edge.Source,
			Target:     edge.Target,
			LinkType:   edge.Type,
			WeightMins: edge.BaseWeightMins,
		}}, legs...)
		cursor = edge.Source
	}

	return RoutePlan{
		VehicleType: vehicle,
		TotalMins:   dist[target],
		Legs:        legs,
	}, nil
}

func allowedLinkTypes(vehicle VehicleType) map[scenario.LinkType]struct{} {
	switch vehicle {
	case VehicleTypeTruck:
		return map[scenario.LinkType]struct{}{
			scenario.LinkTypeRoad: {},
		}
	case VehicleTypeSpeedboat:
		return map[scenario.LinkType]struct{}{
			scenario.LinkTypeWaterway: {},
		}
	case VehicleTypeDrone:
		return map[scenario.LinkType]struct{}{
			scenario.LinkTypeAirway: {},
		}
	default:
		return nil
	}
}

type queueItem struct {
	nodeID   string
	distance int
	index    int
}

type priorityQueue []queueItem

func (pq priorityQueue) Len() int {
	return len(pq)
}

func (pq priorityQueue) Less(i, j int) bool {
	return pq[i].distance < pq[j].distance
}

func (pq priorityQueue) Swap(i, j int) {
	pq[i], pq[j] = pq[j], pq[i]
	pq[i].index = i
	pq[j].index = j
}

func (pq *priorityQueue) Push(x any) {
	item := x.(queueItem)
	item.index = len(*pq)
	*pq = append(*pq, item)
}

func (pq *priorityQueue) Pop() any {
	old := *pq
	last := len(old) - 1
	item := old[last]
	*pq = old[:last]
	return item
}
