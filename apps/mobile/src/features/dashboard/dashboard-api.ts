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
