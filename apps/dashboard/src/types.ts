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

export type EdgePrediction = {
  edge_id: string;
  probability: number;
  high_risk: boolean;
  prediction_timestamp: string;
  penalized_weight_mins: number;
  feature_snapshot: {
    edge_id: string;
    edge_type: LinkType;
    cumulative_rainfall_mm: number;
    rainfall_rate_change: number;
    elevation_m: number;
    soil_saturation_proxy: number;
    last_sensor_timestamp_utc: string;
    contributing_features: Record<string, number>;
  };
};

export type PredictiveRecommendation = {
  vehicle: string;
  source: string;
  target: string;
  baseline_eta_mins: number;
  proactive_eta_mins: number;
  changed: boolean;
  avoided_edges: string[];
  message: string;
};

export type PredictiveStatusResponse = {
  status: {
    model: {
      threshold: number;
    };
    metrics: {
      precision: number;
      recall: number;
      f1: number;
    };
    predictions: EdgePrediction[];
    recommendations: PredictiveRecommendation[];
  };
  recompute_ms: number;
};

export type FleetOrchestrationStatusResponse = {
  status: {
    live_reachability: {
      mode: string;
      blocked_edges: string[];
      drone_required_zones: {
        node_id: string;
        name: string;
        lat: number;
        lng: number;
        reason: string;
        truck_reachable: boolean;
        boat_reachable: boolean;
        drone_reachable: boolean;
      }[];
    };
    drill_reachability: {
      mode: string;
      blocked_edges: string[];
      drone_required_zones: {
        node_id: string;
        name: string;
        lat: number;
        lng: number;
        reason: string;
        truck_reachable: boolean;
        boat_reachable: boolean;
        drone_reachable: boolean;
      }[];
    };
    rendezvous: {
      scenario_id: string;
      label: string;
      boat_node_id: string;
      drone_base_node_id: string;
      destination_node_id: string;
      best_meeting_node_id: string;
      best_meeting_lat: number;
      best_meeting_lng: number;
      boat_travel_mins: number;
      drone_travel_mins: number;
      drone_final_leg_mins: number;
      combined_mission_mins: number;
      drone_range_km: number;
      payload_kg: number;
      feasible: boolean;
      explanation: string;
    }[];
    handoff: {
      scenario_label: string;
      boat_arrival_node_id: string;
      pod_receipt_id: string;
      boat_signature_hash: string;
      drone_countersign_hash: string;
      ownership_before: string;
      ownership_after: string;
      transferred_cargo_id: string;
      ledger_history: {
        event_type: string;
        actor: string;
        detail: string;
        created_at: string;
        hash: string;
      }[];
    };
    mesh_throttle: {
      battery_pct: number;
      accelerometer_state: string;
      proximity_meters: number;
      base_interval_seconds: number;
      adjusted_interval_seconds: number;
      duration_minutes: number;
      baseline_broadcasts: number;
      adjusted_broadcasts: number;
      baseline_battery_drain_pct: number;
      adjusted_battery_drain_pct: number;
      battery_savings_pct: number;
      applied_rules: {
        rule: string;
        reduction_pct: number;
        applied: boolean;
        reason: string;
      }[];
    };
  };
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
  predictive: PredictiveStatusResponse;
  fleet: FleetOrchestrationStatusResponse;
  fetchedAt: string;
};
