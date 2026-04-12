export type RoutePreview = {
  vehicle: string;
  source: string;
  target: string;
  total_mins: number;
  leg_count: number;
};

export type DashboardSummary = {
  scenario: string;
  node_count: number;
  edge_count: number;
  blocked_edge_count: number;
  route_previews: RoutePreview[];
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
  is_flooded: boolean;
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
  edge_count: 7,
  blocked_edge_count: 0,
  route_previews: [
    { vehicle: 'truck', source: 'N1', target: 'N3', total_mins: 90, leg_count: 1 },
    { vehicle: 'speedboat', source: 'N1', target: 'N3', total_mins: 150, leg_count: 1 },
  ],
};

export const networkFallback: NetworkStatus = {
  metadata: {
    region: 'Sylhet Division',
    scenario: 'Flash Flood Delta',
    last_updated: '2026-04-12T08:00:00Z',
  },
  nodes: [
    { id: 'N1', name: 'Sylhet City Hub', type: 'central_command', lat: 24.8949, lng: 91.8687 },
    { id: 'N3', name: 'Sunamganj Sadar Camp', type: 'relief_camp', lat: 25.0658, lng: 91.4073 },
    { id: 'N6', name: 'Habiganj Medical', type: 'hospital', lat: 24.384, lng: 91.4169 },
  ],
  edges: [
    { id: 'E1', source: 'N1', target: 'N2', type: 'road', base_weight_mins: 20, is_flooded: false },
    { id: 'E2', source: 'N1', target: 'N3', type: 'road', base_weight_mins: 90, is_flooded: false },
    { id: 'E6', source: 'N1', target: 'N3', type: 'river', base_weight_mins: 150, is_flooded: false },
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
