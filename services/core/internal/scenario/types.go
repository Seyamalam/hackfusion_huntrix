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
	IsFlooded      bool     `json:"is_flooded"`
}

func (e Edge) IsBlocked() bool {
	return e.IsFlooded || e.BaseWeightMins >= 9999
}

type Graph struct {
	Metadata Metadata `json:"metadata"`
	Nodes    []Node   `json:"nodes"`
	Edges    []Edge   `json:"edges"`
}
