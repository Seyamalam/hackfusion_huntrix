package scenario

type LinkType string

const (
	LinkTypeRoad     LinkType = "road"
	LinkTypeWaterway LinkType = "waterway"
	LinkTypeAirway   LinkType = "airway"
)

type Metadata struct {
	Region      string `json:"region"`
	Scenario    string `json:"scenario"`
	LastUpdated string `json:"last_updated"`
}

type Node struct {
	ID   string  `json:"id"`
	Name string  `json:"name"`
	Type string  `json:"type"`
	Lat  float64 `json:"lat"`
	Lng  float64 `json:"lng"`
}

type Edge struct {
	ID             string   `json:"id"`
	Source         string   `json:"source"`
	Target         string   `json:"target"`
	Type           LinkType `json:"type"`
	BaseWeightMins int      `json:"base_weight_mins"`
	TravelTimeMins int      `json:"travel_time_mins"`
	CapacityUnits  int      `json:"capacity_units"`
	RiskScore      int      `json:"risk_score"`
	PayloadLimitKg int      `json:"payload_limit_kg"`
	IsFlooded      bool     `json:"is_flooded"`
	Status         string   `json:"status,omitempty"`
}

func (e Edge) IsBlocked() bool {
	return e.IsFlooded || e.BaseWeightMins >= 9999
}

func (e *Edge) ApplyDefaults() {
	if e.Type == "" {
		e.Type = LinkTypeRoad
	}

	if e.TravelTimeMins <= 0 {
		e.TravelTimeMins = e.BaseWeightMins
	}
	if e.BaseWeightMins <= 0 {
		e.BaseWeightMins = e.TravelTimeMins
	}
	if e.CapacityUnits <= 0 {
		e.CapacityUnits = defaultCapacityForType(e.Type)
	}
	if e.RiskScore <= 0 {
		e.RiskScore = defaultRiskForType(e.Type)
	}
	if e.PayloadLimitKg <= 0 {
		e.PayloadLimitKg = defaultPayloadLimitForType(e.Type, e.CapacityUnits)
	}
	if e.Status == "" && e.IsBlocked() {
		e.Status = defaultFailureStatus(e.Type)
	}
}

func (e Edge) EffectiveTravelTimeMins() int {
	if e.TravelTimeMins > 0 {
		return e.TravelTimeMins
	}

	return e.BaseWeightMins
}

func defaultCapacityForType(linkType LinkType) int {
	switch linkType {
	case LinkTypeWaterway:
		return 160
	case LinkTypeAirway:
		return 18
	default:
		return 120
	}
}

func defaultRiskForType(linkType LinkType) int {
	switch linkType {
	case LinkTypeWaterway:
		return 4
	case LinkTypeAirway:
		return 3
	default:
		return 2
	}
}

func defaultPayloadLimitForType(linkType LinkType, capacityUnits int) int {
	switch linkType {
	case LinkTypeAirway:
		if capacityUnits > 20 {
			return 20
		}
		if capacityUnits > 0 {
			return capacityUnits
		}
		return 15
	default:
		if capacityUnits > 0 {
			return capacityUnits
		}
		return 120
	}
}

func defaultFailureStatus(linkType LinkType) string {
	switch linkType {
	case LinkTypeWaterway:
		return "impassable"
	case LinkTypeAirway:
		return "grounded"
	default:
		return "washed_out"
	}
}

type Graph struct {
	Metadata Metadata `json:"metadata"`
	Nodes    []Node   `json:"nodes"`
	Edges    []Edge   `json:"edges"`
}
