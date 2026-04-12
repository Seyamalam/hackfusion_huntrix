import type {
  DashboardSnapshot,
  DashboardSummary,
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
  const [graph, summary, missions, triage, predictive] = await Promise.all([
    fetchJSON<Graph>("/api/network/status"),
    fetchJSON<DashboardSummary>("/api/dashboard/summary"),
    fetchJSON<MissionPlansResponse>("/api/routes/missions"),
    fetchJSON<TriageStatusResponse>("/api/triage/status"),
    fetchJSON<PredictiveStatusResponse>("/api/predictive/status"),
  ]);

  const snapshot = {
    graph,
    summary,
    missions,
    triage,
    predictive,
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
    return JSON.parse(raw) as DashboardSnapshot;
  } catch {
    localStorage.removeItem(SNAPSHOT_KEY);
    return null;
  }
}

export function getApiBaseUrlForDisplay() {
  return getApiBaseUrl();
}
