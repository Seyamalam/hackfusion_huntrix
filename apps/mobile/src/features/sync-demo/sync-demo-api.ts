import { getCurrentApiBaseUrl } from '@/src/features/dashboard/api-host';

export type InventoryConflict = {
  field: string;
  local_value: string;
  remote_value: string;
  local_replica: string;
  remote_replica: string;
};

export type InventoryItem = {
  id: string;
  name: string;
  quantity: number;
  priority: string;
  updated_at: string;
  last_writer: string;
  vector_clock: Record<string, number>;
  conflicts: InventoryConflict[];
};

export type InventoryDemoState = {
  current: InventoryItem;
  local_replica: InventoryItem;
  remote_replica: InventoryItem;
  scenario: string;
  resolution_log: string[];
};

export type InventoryDemoResponse = {
  state: InventoryDemoState;
  conflict_detected: boolean;
  message: string;
};

export async function fetchInventoryDemoState(signal?: AbortSignal) {
  const apiBaseUrl = await getCurrentApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/sync/inventory/state`, { signal });
  if (!response.ok) {
    throw new Error(`inventory demo request failed: ${response.status}`);
  }
  return (await response.json()) as InventoryDemoState;
}

export async function runInventoryScenario(scenario: 'causal' | 'conflict') {
  const apiBaseUrl = await getCurrentApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/sync/inventory/apply?scenario=${scenario}`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`inventory scenario failed: ${response.status}`);
  }
  return (await response.json()) as InventoryDemoResponse;
}

export async function resolveInventoryConflict(choice: 'local' | 'remote') {
  const apiBaseUrl = await getCurrentApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/sync/inventory/resolve?choice=${choice}`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`inventory resolve failed: ${response.status}`);
  }
  return (await response.json()) as InventoryDemoResponse;
}

export async function resetInventoryDemo() {
  const apiBaseUrl = await getCurrentApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/sync/inventory/reset`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`inventory reset failed: ${response.status}`);
  }
  return (await response.json()) as InventoryDemoResponse;
}
