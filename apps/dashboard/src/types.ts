export type LinkType = "road" | "waterway" | "airway";

export type Node = {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
};

export type Edge = {
  id: string;
  source: string;
  target: string;
  type: LinkType;
  base_weight_mins: number;
  is_flooded: boolean;
};

export type Graph = {
  metadata: {
    region: string;
    scenario: string;
    last_updated: string;
  };
  nodes: Node[];
  edges: Edge[];
};

export type RouteLeg = {
  edge_id?: string;
  edgeId?: string;
  source: string;
  target: string;
  link_type?: LinkType;
  linkType?: LinkType;
  weight_mins?: number;
  weightMins?: number;
};

export type RoutePreview = {
  source: string;
  target: string;
  vehicle: "truck" | "speedboat" | "drone";
  payload_kg?: number;
  total_mins: number;
  total_cost?: number;
  leg_count: number;
  legs: RouteLeg[];
};

export type HandoffEvent = {
  node_id: string;
  from_vehicle: "truck" | "speedboat" | "drone";
  to_vehicle: "truck" | "speedboat" | "drone";
  payload_kg: number;
  reason: string;
};

export type MissionPlan = {
  mission_id: string;
  label: string;
  total_mins: number;
  total_cost: number;
  stage_count: number;
  stages: RoutePreview[];
  handoffs: HandoffEvent[];
  recompute_ms?: number;
};

export type MissionPlansResponse = {
  scenario: string;
  applied_failure_edge?: string;
  failure_status?: string;
  recompute_ms: number;
  missions: MissionPlan[];
};

export type DashboardSummary = {
  scenario: string;
  node_count: number;
  edge_count: number;
  blocked_edge_count: number;
  route_previews: RoutePreview[];
  last_recompute_ms?: number;
  weighted_graph_note?: string;
};

export type DashboardSnapshot = {
  graph: Graph;
  summary: DashboardSummary;
  missions: MissionPlansResponse;
  fetchedAt: string;
};
