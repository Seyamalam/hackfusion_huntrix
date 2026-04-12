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

export type PriorityTier = {
  tier: string;
  label: string;
  sla_hours: number;
  last_writer: string;
  updated_at: string;
  vector_clock: Record<string, number>;
};

export type CargoPrediction = {
  cargo_id: string;
  name: string;
  priority: string;
  base_eta_mins: number;
  current_eta_mins: number;
  slowdown_pct: number;
  sla_window_mins: number;
  will_breach: boolean;
  requires_review: boolean;
  recommended_track: string;
};

export type TriageDecision = {
  triggered: boolean;
  action: string;
  safe_waypoint: string;
  drop_cargo_ids: string[];
  keep_cargo_ids: string[];
  reroute_vehicle: string;
  current_eta_mins: number;
  reroute_eta_mins: number;
  decision_reason: string;
  audit_trail_anchor: string;
};

export type TriageSnapshot = {
  scenario_name: string;
  trigger_source: string;
  mode: string;
  baseline_eta_mins: number;
  current_eta_mins: number;
  slowdown_pct: number;
  priority_tiers: PriorityTier[];
  cargo_items: Array<{
    cargo_id: string;
    name: string;
    priority: string;
    sla_hours: number;
    payload_kg: number;
    mission_id: string;
    destination_node: string;
    safe_waypoint: string;
    status: string;
    last_writer: string;
    updated_at: string;
    vector_clock: Record<string, number>;
  }>;
  predictions: CargoPrediction[];
  decision: TriageDecision;
  audit_log: Array<{
    id: string;
    type: string;
    created_at: string;
    detail: string;
    prev_hash: string;
    hash: string;
  }>;
};

export type TriageStatusResponse = {
  snapshot: TriageSnapshot;
  decision: TriageDecision;
  recompute_ms: number;
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
  triage: TriageStatusResponse;
  fetchedAt: string;
};
