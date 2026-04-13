import type { AuthRole } from '@/src/features/auth/auth-types';
import type { HandoffOwnershipRecord, HandoffStatus } from '@/src/features/fleet/handoff-types';

type UpsertHandoffRecordInput = {
  cargoId: string;
  deliveryId: string;
  fromOwner: string;
  fromRole: AuthRole;
  handoffId: string;
  lastWriter: string;
  podReceiptHash: string;
  podReceiptId: string;
  rendezvousLabel: string;
  rendezvousNodeId: string;
  scenarioId: string;
  status: HandoffStatus;
  toOwner: string;
  toRole: AuthRole;
};

export function upsertHandoffRecord(
  current: HandoffOwnershipRecord[],
  input: UpsertHandoffRecordInput,
  updatedAt = new Date(),
) {
  const existing = current.find((record) => record.handoff_id === input.handoffId);
  const nextRecord: HandoffOwnershipRecord = {
    cargo_id: input.cargoId,
    delivery_id: input.deliveryId,
    from_owner: input.fromOwner,
    from_role: input.fromRole,
    handoff_id: input.handoffId,
    last_writer: input.lastWriter,
    pod_receipt_hash: input.podReceiptHash,
    pod_receipt_id: input.podReceiptId,
    rendezvous_label: input.rendezvousLabel,
    rendezvous_node_id: input.rendezvousNodeId,
    scenario_id: input.scenarioId,
    status: input.status,
    to_owner: input.toOwner,
    to_role: input.toRole,
    updated_at: updatedAt.toISOString(),
    vector_clock: bumpClock(existing?.vector_clock ?? {}, input.lastWriter),
  };

  return mergeHandoffRecords(current, [nextRecord]);
}

export function mergeHandoffRecords(
  current: HandoffOwnershipRecord[],
  incoming: HandoffOwnershipRecord[],
) {
  const byID = new Map(current.map((record) => [record.handoff_id, cloneRecord(record)]));

  for (const record of incoming) {
    const existing = byID.get(record.handoff_id);
    if (!existing) {
      byID.set(record.handoff_id, cloneRecord(record));
      continue;
    }

    const relation = compareVectorClock(existing.vector_clock, record.vector_clock);
    if (relation === 'before') {
      byID.set(record.handoff_id, cloneRecord(record));
      continue;
    }

    if (relation === 'equal') {
      byID.set(
        record.handoff_id,
        Date.parse(record.updated_at) >= Date.parse(existing.updated_at)
          ? cloneRecord(record)
          : existing,
      );
      continue;
    }

    if (relation === 'concurrent') {
      const winner =
        Date.parse(record.updated_at) >= Date.parse(existing.updated_at)
          ? cloneRecord(record)
          : cloneRecord(existing);
      winner.vector_clock = mergeVectorClock(existing.vector_clock, record.vector_clock);
      byID.set(record.handoff_id, winner);
    }
  }

  return [...byID.values()].sort((left, right) => left.updated_at.localeCompare(right.updated_at));
}

export function summarizeCurrentOwner(records: HandoffOwnershipRecord[], scenarioId: string) {
  const latest = records
    .filter((record) => record.scenario_id === scenarioId)
    .sort((left, right) => right.updated_at.localeCompare(left.updated_at))[0];

  return latest?.to_owner ?? 'boat-convoy';
}

function cloneRecord(record: HandoffOwnershipRecord): HandoffOwnershipRecord {
  return {
    ...record,
    vector_clock: { ...record.vector_clock },
  };
}

function bumpClock(clock: Record<string, number>, replicaId: string) {
  return {
    ...clock,
    [replicaId]: (clock[replicaId] ?? 0) + 1,
  };
}

function mergeVectorClock(left: Record<string, number>, right: Record<string, number>) {
  const merged: Record<string, number> = { ...left };
  for (const [replicaId, counter] of Object.entries(right)) {
    merged[replicaId] = Math.max(merged[replicaId] ?? 0, counter);
  }
  return merged;
}

function compareVectorClock(left: Record<string, number>, right: Record<string, number>) {
  const replicas = new Set([...Object.keys(left), ...Object.keys(right)]);
  let leftAhead = false;
  let rightAhead = false;

  for (const replicaId of replicas) {
    const leftCounter = left[replicaId] ?? 0;
    const rightCounter = right[replicaId] ?? 0;
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
