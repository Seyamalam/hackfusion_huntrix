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
  total_mins: number;
  leg_count: number;
  legs: RouteLeg[];
};

export type DashboardSummary = {
  scenario: string;
  node_count: number;
  edge_count: number;
  blocked_edge_count: number;
  route_previews: RoutePreview[];
};

export type DashboardSnapshot = {
  graph: Graph;
  summary: DashboardSummary;
  fetchedAt: string;
};
