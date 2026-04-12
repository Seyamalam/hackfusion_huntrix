import type { PodReceipt } from '@/src/features/pod/pod-types';

export type ClockRelation = 'after' | 'before' | 'concurrent' | 'equal';

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

export type SyncHandshake = {
  device_label: string;
  kind: 'sync-handshake';
  last_sync_at: string;
  replica_id: string;
  vector_clock: Record<string, number>;
};

export type SyncDeltaBundle = {
  base_clock: Record<string, number>;
  bundle_id: string;
  created_at: string;
  kind: 'sync-delta';
  pod_receipts: PodReceipt[];
  records: InventoryItem[];
  source_replica: string;
  target_replica: string;
};

export type SyncSessionSummary = {
  accepted_operation_count?: number;
  bytes_estimate: number;
  conflict_count: number;
  merged_count: number;
  pending_envelope_count?: number;
  record_count: number;
  rejected_operation_count?: number;
  receipt_count: number;
};

export type SyncPayload = SyncHandshake | SyncDeltaBundle;

export function createSeedInventoryItem() {
  return {
    conflicts: [],
    id: 'inv-ors-001',
    last_writer: 'android-peer',
    name: 'ORS Saline',
    priority: 'P1',
    quantity: 120,
    updated_at: new Date().toISOString(),
    vector_clock: { 'android-peer': 1 },
  } satisfies InventoryItem;
}

export function buildHandshake(replicaId: string, vectorClock: Record<string, number>): SyncHandshake {
  return {
    device_label: 'Huntrix Delta',
    kind: 'sync-handshake',
    last_sync_at: new Date().toISOString(),
    replica_id: replicaId,
    vector_clock: { ...vectorClock },
  };
}

export function buildDeltaBundle(
  replicaId: string,
  targetReplica: string,
  records: InventoryItem[],
  podReceipts: PodReceipt[] = [],
): SyncDeltaBundle {
  return {
    base_clock: records[0]?.vector_clock ? { ...records[0].vector_clock } : {},
    bundle_id: `bundle-${Date.now()}`,
    created_at: new Date().toISOString(),
    kind: 'sync-delta',
    pod_receipts: podReceipts,
    records,
    source_replica: replicaId,
    target_replica: targetReplica,
  };
}

export function filterChangedRecords(
  items: InventoryItem[],
  knownClock: Record<string, number>,
) {
  return items.filter((item) => {
    const relation = compareVectorClock(knownClock, item.vector_clock);
    return relation === 'before' || relation === 'concurrent';
  });
}

export function mutateLocalInventory(
  item: InventoryItem,
  replicaId: string,
  update: {
    deltaQuantity?: number;
    priority?: string;
  },
) {
  return {
    ...cloneItem(item),
    conflicts: [],
    last_writer: replicaId,
    priority: update.priority ?? item.priority,
    quantity: item.quantity + (update.deltaQuantity ?? 0),
    updated_at: new Date().toISOString(),
    vector_clock: bumpClock(item.vector_clock, replicaId),
  } satisfies InventoryItem;
}

export function applyDeltaBundle(
  localItem: InventoryItem,
  bundle: SyncDeltaBundle,
  localReceipts: PodReceipt[] = [],
) {
  const remoteItem = bundle.records[0];
  const mergedReceipts = mergePodReceipts(localReceipts, bundle.pod_receipts ?? []);
  if (!remoteItem) {
    return {
      item: localItem,
      receipts: mergedReceipts,
      summary: {
        bytes_estimate: estimateBundleBytes(bundle),
        conflict_count: 0,
        merged_count: 0,
        record_count: 0,
        receipt_count: bundle.pod_receipts?.length ?? 0,
      },
    };
  }

  const relation = compareVectorClock(localItem.vector_clock, remoteItem.vector_clock);
  if (relation === 'before') {
    return {
      item: cloneItem({ ...remoteItem, conflicts: [] }),
      receipts: mergedReceipts,
      summary: {
        bytes_estimate: estimateBundleBytes(bundle),
        conflict_count: 0,
        merged_count: 1,
        record_count: bundle.records.length,
        receipt_count: bundle.pod_receipts?.length ?? 0,
      },
    };
  }

  if (relation === 'equal' || relation === 'after') {
    return {
      item: cloneItem({ ...localItem, conflicts: [] }),
      receipts: mergedReceipts,
      summary: {
        bytes_estimate: estimateBundleBytes(bundle),
        conflict_count: 0,
        merged_count: 1,
        record_count: bundle.records.length,
        receipt_count: bundle.pod_receipts?.length ?? 0,
      },
    };
  }

  const conflicts: InventoryConflict[] = [];
  if (localItem.quantity !== remoteItem.quantity) {
    conflicts.push({
      field: 'quantity',
      local_replica: localItem.last_writer,
      local_value: String(localItem.quantity),
      remote_replica: remoteItem.last_writer,
      remote_value: String(remoteItem.quantity),
    });
  }
  if (localItem.priority !== remoteItem.priority) {
    conflicts.push({
      field: 'priority',
      local_replica: localItem.last_writer,
      local_value: localItem.priority,
      remote_replica: remoteItem.last_writer,
      remote_value: remoteItem.priority,
    });
  }

  const merged =
    Date.parse(remoteItem.updated_at) >= Date.parse(localItem.updated_at)
      ? cloneItem(remoteItem)
      : cloneItem(localItem);
  merged.vector_clock = mergeVectorClock(localItem.vector_clock, remoteItem.vector_clock);
  merged.conflicts = conflicts;

  return {
    item: merged,
    receipts: mergedReceipts,
    summary: {
      bytes_estimate: estimateBundleBytes(bundle),
      conflict_count: conflicts.length > 0 ? 1 : 0,
      merged_count: 1,
      record_count: bundle.records.length,
      receipt_count: bundle.pod_receipts?.length ?? 0,
    },
  };
}

function compareVectorClock(left: Record<string, number>, right: Record<string, number>): ClockRelation {
  const replicas = new Set([...Object.keys(left), ...Object.keys(right)]);
  let leftAhead = false;
  let rightAhead = false;

  for (const replica of replicas) {
    const leftCounter = left[replica] ?? 0;
    const rightCounter = right[replica] ?? 0;
    if (leftCounter < rightCounter) {
      rightAhead = true;
    }
    if (leftCounter > rightCounter) {
      leftAhead = true;
    }
  }

  if (!leftAhead && !rightAhead) return 'equal';
  if (!leftAhead && rightAhead) return 'before';
  if (leftAhead && !rightAhead) return 'after';
  return 'concurrent';
}

function mergeVectorClock(left: Record<string, number>, right: Record<string, number>) {
  const merged: Record<string, number> = { ...left };
  for (const [replica, counter] of Object.entries(right)) {
    merged[replica] = Math.max(merged[replica] ?? 0, counter);
  }
  return merged;
}

function bumpClock(clock: Record<string, number>, replicaId: string) {
  return {
    ...clock,
    [replicaId]: (clock[replicaId] ?? 0) + 1,
  };
}

function estimateBundleBytes(bundle: SyncDeltaBundle) {
  return JSON.stringify(bundle).length;
}

function cloneItem(item: InventoryItem): InventoryItem {
  return {
    ...item,
    conflicts: [...item.conflicts],
    vector_clock: { ...item.vector_clock },
  };
}

function mergePodReceipts(current: PodReceipt[], incoming: PodReceipt[]) {
  const byID = new Map(current.map((receipt) => [receipt.receipt_id, receipt]));
  for (const receipt of incoming) {
    byID.set(receipt.receipt_id, receipt);
  }

  return [...byID.values()].sort((left, right) => left.verified_at.localeCompare(right.verified_at));
}
