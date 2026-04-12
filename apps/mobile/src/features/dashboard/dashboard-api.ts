export type RoutePreview = {
  vehicle: string;
  source: string;
  target: string;
  payload_kg?: number;
  total_mins: number;
  total_cost?: number;
  leg_count: number;
  legs?: {
    edge_id?: string;
    source: string;
    target: string;
    link_type?: string;
    travel_time_mins?: number;
    capacity_units?: number;
    risk_score?: number;
  }[];
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

export type NetworkNode = {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
};

export type NetworkEdge = {
  id: string;
  source: string;
  target: string;
  type: string;
  base_weight_mins: number;
  travel_time_mins?: number;
  capacity_units?: number;
  risk_score?: number;
  payload_limit_kg?: number;
  is_flooded: boolean;
};

export type HandoffEvent = {
  node_id: string;
  from_vehicle: string;
  to_vehicle: string;
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
  cargo_items: {
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
  }[];
  predictions: CargoPrediction[];
  decision: TriageDecision;
  audit_log: {
    id: string;
    type: string;
    created_at: string;
    detail: string;
    prev_hash: string;
    hash: string;
  }[];
};

export type TriageStatusResponse = {
  snapshot: TriageSnapshot;
  decision: TriageDecision;
  recompute_ms: number;
};

export type PredictiveEdgePrediction = {
  edge_id: string;
  probability: number;
  high_risk: boolean;
  prediction_timestamp: string;
  penalized_weight_mins: number;
  feature_snapshot: {
    edge_id: string;
    edge_type: string;
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
    predictions: PredictiveEdgePrediction[];
    recommendations: PredictiveRecommendation[];
  };
  recompute_ms: number;
};

export type NetworkStatus = {
  metadata: {
    region: string;
    scenario: string;
    last_updated: string;
  };
  nodes: NetworkNode[];
  edges: NetworkEdge[];
};

function resolveApiBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  if (
    typeof globalThis !== 'undefined' &&
    'location' in globalThis &&
    globalThis.location &&
    typeof globalThis.location.hostname === 'string'
  ) {
    return `http://${globalThis.location.hostname}:8080`;
  }

  return 'http://127.0.0.1:8080';
}

const apiBaseUrl = resolveApiBaseUrl();

export const dashboardFallback: DashboardSummary = {
  scenario: 'Flash Flood Delta',
  node_count: 6,
  edge_count: 10,
  blocked_edge_count: 0,
  route_previews: [
    { vehicle: 'truck', source: 'N1', target: 'N3', payload_kg: 100, total_mins: 90, total_cost: 120, leg_count: 1 },
    { vehicle: 'speedboat', source: 'N1', target: 'N3', payload_kg: 80, total_mins: 150, total_cost: 162, leg_count: 1 },
    { vehicle: 'drone', source: 'N2', target: 'N4', payload_kg: 12, total_mins: 16, total_cost: 28, leg_count: 1 },
  ],
  last_recompute_ms: 18,
  weighted_graph_note: 'Travel time, risk, and capacity penalties are blended into route cost.',
};

export const networkFallback: NetworkStatus = {
  metadata: {
    region: 'Sylhet Division',
    scenario: 'Flash Flood Delta',
    last_updated: '2026-04-12T08:00:00Z',
  },
  nodes: [
    { id: 'N1', name: 'Sylhet City Hub', type: 'central_command', lat: 24.8949, lng: 91.8687 },
    { id: 'N2', name: 'Osmani Airport Node', type: 'supply_drop', lat: 24.9632, lng: 91.8668 },
    { id: 'N3', name: 'Sunamganj Sadar Camp', type: 'relief_camp', lat: 25.0658, lng: 91.4073 },
    { id: 'N4', name: 'Companyganj Outpost', type: 'relief_camp', lat: 25.0715, lng: 91.7554 },
    { id: 'N6', name: 'Habiganj Medical', type: 'hospital', lat: 24.384, lng: 91.4169 },
  ],
  edges: [
    { id: 'E1', source: 'N1', target: 'N2', type: 'road', base_weight_mins: 20, travel_time_mins: 20, capacity_units: 140, risk_score: 1, payload_limit_kg: 140, is_flooded: false },
    { id: 'E2', source: 'N1', target: 'N3', type: 'road', base_weight_mins: 90, travel_time_mins: 90, capacity_units: 120, risk_score: 5, payload_limit_kg: 120, is_flooded: false },
    { id: 'E6', source: 'N1', target: 'N3', type: 'waterway', base_weight_mins: 150, travel_time_mins: 150, capacity_units: 180, risk_score: 2, payload_limit_kg: 180, is_flooded: false },
    { id: 'E9', source: 'N2', target: 'N4', type: 'airway', base_weight_mins: 16, travel_time_mins: 16, capacity_units: 12, risk_score: 2, payload_limit_kg: 12, is_flooded: false },
  ],
};

export const missionFallback: MissionPlansResponse = {
  scenario: 'Flash Flood Delta',
  recompute_ms: 22,
  missions: [
    {
      mission_id: 'mission-med-airlift',
      label: 'Medical handoff to Companyganj',
      total_mins: 36,
      total_cost: 54,
      stage_count: 2,
      stages: [
        { vehicle: 'truck', source: 'N1', target: 'N2', payload_kg: 12, total_mins: 20, total_cost: 26, leg_count: 1, legs: [{ edge_id: 'E1', source: 'N1', target: 'N2', link_type: 'road', travel_time_mins: 20, capacity_units: 140, risk_score: 1 }] },
        { vehicle: 'drone', source: 'N2', target: 'N4', payload_kg: 12, total_mins: 16, total_cost: 28, leg_count: 1, legs: [{ edge_id: 'E9', source: 'N2', target: 'N4', link_type: 'airway', travel_time_mins: 16, capacity_units: 12, risk_score: 2 }] },
      ],
      handoffs: [
        { node_id: 'N2', from_vehicle: 'truck', to_vehicle: 'drone', payload_kg: 12, reason: 'mode transfer required at logistics waypoint' },
      ],
      recompute_ms: 22,
    },
  ],
};

export const triageFallback: TriageStatusResponse = {
  recompute_ms: 24,
  decision: {
    triggered: true,
    action: 'Deposit P2/P3 cargo at waypoint N2 and reroute with P0/P1 cargo only.',
    safe_waypoint: 'N2',
    drop_cargo_ids: ['cargo-p2-shelter', 'cargo-p3-hygiene'],
    keep_cargo_ids: ['cargo-p0-antivenom', 'cargo-p1-insulin'],
    reroute_vehicle: 'truck -> drone',
    current_eta_mins: 210,
    reroute_eta_mins: 36,
    decision_reason: 'Convoy slowdown exceeded 30% and critical cargo would breach SLA without preemption.',
    audit_trail_anchor: 'triage-audit-anchor',
  },
  snapshot: {
    scenario_name: 'Autonomous Triage Drill',
    trigger_source: 'Primary truck corridor is unavailable; fallback delay estimate applied.',
    mode: 'simulated_breach',
    baseline_eta_mins: 65,
    current_eta_mins: 210,
    slowdown_pct: 223,
    priority_tiers: [
      { tier: 'P0', label: 'Critical Medical', sla_hours: 2, last_writer: 'triage-engine', updated_at: '2026-04-12T08:00:00Z', vector_clock: { 'triage-engine': 1 } },
      { tier: 'P1', label: 'High Priority', sla_hours: 6, last_writer: 'triage-engine', updated_at: '2026-04-12T08:00:00Z', vector_clock: { 'triage-engine': 2 } },
      { tier: 'P2', label: 'Standard Relief', sla_hours: 24, last_writer: 'triage-engine', updated_at: '2026-04-12T08:00:00Z', vector_clock: { 'triage-engine': 3 } },
      { tier: 'P3', label: 'Low Priority', sla_hours: 72, last_writer: 'triage-engine', updated_at: '2026-04-12T08:00:00Z', vector_clock: { 'triage-engine': 4 } },
    ],
    cargo_items: [
      { cargo_id: 'cargo-p0-antivenom', name: 'Antivenom cold pack', priority: 'P0', sla_hours: 2, payload_kg: 4, mission_id: 'mission-companyganj-convoy', destination_node: 'N4', safe_waypoint: 'N2', status: 'loaded', last_writer: 'triage-engine', updated_at: '2026-04-12T08:00:00Z', vector_clock: { 'triage-engine': 1 } },
      { cargo_id: 'cargo-p1-insulin', name: 'Insulin cooler', priority: 'P1', sla_hours: 6, payload_kg: 6, mission_id: 'mission-companyganj-convoy', destination_node: 'N4', safe_waypoint: 'N2', status: 'loaded', last_writer: 'triage-engine', updated_at: '2026-04-12T08:00:00Z', vector_clock: { 'triage-engine': 2 } },
      { cargo_id: 'cargo-p2-shelter', name: 'Shelter tarp bundle', priority: 'P2', sla_hours: 24, payload_kg: 35, mission_id: 'mission-companyganj-convoy', destination_node: 'N4', safe_waypoint: 'N2', status: 'loaded', last_writer: 'triage-engine', updated_at: '2026-04-12T08:00:00Z', vector_clock: { 'triage-engine': 3 } },
      { cargo_id: 'cargo-p3-hygiene', name: 'Hygiene kit crate', priority: 'P3', sla_hours: 72, payload_kg: 45, mission_id: 'mission-companyganj-convoy', destination_node: 'N4', safe_waypoint: 'N2', status: 'loaded', last_writer: 'triage-engine', updated_at: '2026-04-12T08:00:00Z', vector_clock: { 'triage-engine': 4 } },
    ],
    predictions: [
      { cargo_id: 'cargo-p0-antivenom', name: 'Antivenom cold pack', priority: 'P0', base_eta_mins: 65, current_eta_mins: 210, slowdown_pct: 223, sla_window_mins: 120, will_breach: true, requires_review: true, recommended_track: 'keep_onboard' },
      { cargo_id: 'cargo-p1-insulin', name: 'Insulin cooler', priority: 'P1', base_eta_mins: 65, current_eta_mins: 210, slowdown_pct: 223, sla_window_mins: 360, will_breach: false, requires_review: true, recommended_track: 'keep_onboard' },
      { cargo_id: 'cargo-p2-shelter', name: 'Shelter tarp bundle', priority: 'P2', base_eta_mins: 65, current_eta_mins: 210, slowdown_pct: 223, sla_window_mins: 1440, will_breach: false, requires_review: true, recommended_track: 'drop_at_waypoint' },
      { cargo_id: 'cargo-p3-hygiene', name: 'Hygiene kit crate', priority: 'P3', base_eta_mins: 65, current_eta_mins: 210, slowdown_pct: 223, sla_window_mins: 4320, will_breach: false, requires_review: true, recommended_track: 'drop_at_waypoint' },
    ],
    decision: {
      triggered: true,
      action: 'Deposit P2/P3 cargo at waypoint N2 and reroute with P0/P1 cargo only.',
      safe_waypoint: 'N2',
      drop_cargo_ids: ['cargo-p2-shelter', 'cargo-p3-hygiene'],
      keep_cargo_ids: ['cargo-p0-antivenom', 'cargo-p1-insulin'],
      reroute_vehicle: 'truck -> drone',
      current_eta_mins: 210,
      reroute_eta_mins: 36,
      decision_reason: 'Convoy slowdown exceeded 30% and critical cargo would breach SLA without preemption.',
      audit_trail_anchor: 'triage-audit-anchor',
    },
    audit_log: [
      { id: 'triage-1', type: 'slowdown_detected', created_at: '2026-04-12T08:00:00Z', detail: 'Primary truck corridor is unavailable; fallback delay estimate applied. Slowdown measured at 223%.', prev_hash: 'GENESIS', hash: 'triage-hash-1' },
      { id: 'triage-2', type: 'breach_prediction', created_at: '2026-04-12T08:00:01Z', detail: '1 cargo item(s) predicted to breach SLA.', prev_hash: 'triage-hash-1', hash: 'triage-hash-2' },
      { id: 'triage-3', type: 'autonomous_preemption', created_at: '2026-04-12T08:00:02Z', detail: 'Convoy slowdown exceeded 30% and critical cargo would breach SLA without preemption.', prev_hash: 'triage-hash-2', hash: 'triage-hash-3' },
    ],
  },
};

export const predictiveFallback: PredictiveStatusResponse = {
  recompute_ms: 31,
  status: {
    model: {
      threshold: 0.7,
    },
    metrics: {
      precision: 1,
      recall: 0.8333,
      f1: 0.9091,
    },
    predictions: [
      {
        edge_id: 'E3',
        probability: 0.91,
        high_risk: true,
        prediction_timestamp: '2026-04-12T08:00:00Z',
        penalized_weight_mins: 130,
        feature_snapshot: {
          edge_id: 'E3',
          edge_type: 'road',
          cumulative_rainfall_mm: 1.18,
          rainfall_rate_change: 23.4,
          elevation_m: 12,
          soil_saturation_proxy: 0.87,
          last_sensor_timestamp_utc: '2026-04-12T08:00:00Z',
          contributing_features: {
            cumulative_rainfall_mm: 0.51,
            rainfall_rate_change: 2.11,
            elevation_m: -0.6,
            soil_saturation_proxy: 2.35,
          },
        },
      },
      {
        edge_id: 'E6',
        probability: 0.76,
        high_risk: true,
        prediction_timestamp: '2026-04-12T08:00:00Z',
        penalized_weight_mins: 235,
        feature_snapshot: {
          edge_id: 'E6',
          edge_type: 'waterway',
          cumulative_rainfall_mm: 1.04,
          rainfall_rate_change: 19.8,
          elevation_m: 7,
          soil_saturation_proxy: 0.92,
          last_sensor_timestamp_utc: '2026-04-12T08:00:00Z',
          contributing_features: {
            cumulative_rainfall_mm: 0.37,
            rainfall_rate_change: 1.81,
            elevation_m: -1.13,
            soil_saturation_proxy: 2.58,
          },
        },
      },
    ],
    recommendations: [
      {
        vehicle: 'truck',
        source: 'N1',
        target: 'N3',
        baseline_eta_mins: 90,
        proactive_eta_mins: 110,
        changed: true,
        avoided_edges: ['E3'],
        message: 'Advance reroute recommended before the edge becomes impassable.',
      },
    ],
  },
};

export async function fetchDashboardSummary(signal?: AbortSignal): Promise<DashboardSummary> {
  const response = await fetch(`${apiBaseUrl}/api/dashboard/summary`, { signal });
  if (!response.ok) {
    throw new Error(`dashboard request failed: ${response.status}`);
  }

  return (await response.json()) as DashboardSummary;
}

export async function fetchNetworkStatus(signal?: AbortSignal): Promise<NetworkStatus> {
  const response = await fetch(`${apiBaseUrl}/api/network/status`, { signal });
  if (!response.ok) {
    throw new Error(`network request failed: ${response.status}`);
  }

  return (await response.json()) as NetworkStatus;
}

export async function fetchMissionPlans(signal?: AbortSignal): Promise<MissionPlansResponse> {
  const response = await fetch(`${apiBaseUrl}/api/routes/missions`, { signal });
  if (!response.ok) {
    throw new Error(`mission request failed: ${response.status}`);
  }

  return (await response.json()) as MissionPlansResponse;
}

export async function fetchTriageStatus(signal?: AbortSignal): Promise<TriageStatusResponse> {
  const response = await fetch(`${apiBaseUrl}/api/triage/status`, { signal });
  if (!response.ok) {
    throw new Error(`triage request failed: ${response.status}`);
  }

  return (await response.json()) as TriageStatusResponse;
}

export async function fetchPredictiveStatus(signal?: AbortSignal): Promise<PredictiveStatusResponse> {
  const response = await fetch(`${apiBaseUrl}/api/predictive/status`, { signal });
  if (!response.ok) {
    throw new Error(`predictive request failed: ${response.status}`);
  }

  return (await response.json()) as PredictiveStatusResponse;
}
