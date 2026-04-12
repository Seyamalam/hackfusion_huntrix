import type {
  DashboardSnapshot,
  DashboardSummary,
  FleetOrchestrationStatusResponse,
  Graph,
  MissionPlansResponse,
  PredictiveStatusResponse,
  TriageStatusResponse,
} from "./types";

const DEFAULT_API_BASE = "http://127.0.0.1:8080";
const SNAPSHOT_KEY = "huntrix-delta-dashboard-snapshot";

function getApiBaseUrl() {
  const value = import.meta.env.VITE_API_BASE_URL?.trim();
  return value && value.length > 0 ? value.replace(/\/$/, "") : DEFAULT_API_BASE;
}

async function fetchJSON<T>(path: string): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`);
  if (!response.ok) {
    throw new Error(`request failed for ${path}: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [graph, summary, missions, triage, predictive, fleet] = await Promise.all([
    fetchJSON<Graph>("/api/network/status"),
    fetchJSON<DashboardSummary>("/api/dashboard/summary"),
    fetchJSON<MissionPlansResponse>("/api/routes/missions"),
    fetchJSON<TriageStatusResponse>("/api/triage/status"),
    fetchJSON<PredictiveStatusResponse>("/api/predictive/status"),
    fetchJSON<FleetOrchestrationStatusResponse>("/api/fleet/orchestration/status"),
  ]);

  const snapshot = {
    graph,
    summary,
    missions,
    triage,
    predictive,
    fleet,
    fetchedAt: new Date().toISOString(),
  } satisfies DashboardSnapshot;

  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  return snapshot;
}

export function readCachedSnapshot(): DashboardSnapshot | null {
  const raw = localStorage.getItem(SNAPSHOT_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!isDashboardSnapshot(parsed)) {
      localStorage.removeItem(SNAPSHOT_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(SNAPSHOT_KEY);
    return null;
  }
}

export function getApiBaseUrlForDisplay() {
  return getApiBaseUrl();
}

function isDashboardSnapshot(value: unknown): value is DashboardSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as Partial<DashboardSnapshot>;
  return (
    hasObject(snapshot.graph) &&
    Array.isArray(snapshot.graph.nodes) &&
    Array.isArray(snapshot.graph.edges) &&
    hasObject(snapshot.summary) &&
    Array.isArray(snapshot.summary.route_previews) &&
    hasObject(snapshot.missions) &&
    Array.isArray(snapshot.missions.missions) &&
    hasObject(snapshot.triage) &&
    hasObject(snapshot.triage.snapshot) &&
    Array.isArray(snapshot.triage.snapshot.predictions) &&
    hasObject(snapshot.predictive) &&
    hasObject(snapshot.predictive.status) &&
    Array.isArray(snapshot.predictive.status.predictions) &&
    hasObject(snapshot.fleet) &&
    hasObject(snapshot.fleet.status) &&
    typeof snapshot.fetchedAt === "string"
  );
}

function hasObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
