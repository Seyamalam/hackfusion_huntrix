import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { DeliveryPriority } from '@/src/gen/common_pb';
import {
  ExchangeBundleResponseSchema,
  ExchangeBundleRequestSchema,
  InventoryRecordSchema,
  MeshHandshakeSchema,
  PeerSyncPacketSchema,
  PullPendingRequestSchema,
  PullPendingResponseSchema,
  SyncOperationSchema,
  type ExchangeBundleResponse,
  type ExchangeBundleRequest,
  type InventoryRecord,
  type MeshHandshake,
  type PullPendingRequest,
  type PullPendingResponse,
  type SyncOperation,
} from '@/src/gen/sync_pb';
import { DeliveryReceiptChainEntrySchema, type DeliveryReceiptChainEntry } from '@/src/gen/delivery_pb';
import { bytesToHex, hexToBytes } from '@/src/features/auth/auth-utils';
import type { PodReceipt } from '@/src/features/pod/pod-types';
import type { InventoryItem, SyncDeltaBundle, SyncHandshake } from '@/src/features/sync-demo/sync-protocol';

const ENTITY_TYPE_INVENTORY = 'inventory_record';
const ENTITY_TYPE_POD_RECEIPT = 'delivery_receipt_chain_entry';
const METHOD_EXCHANGE_BUNDLE = 'digitaldelta.v1.SyncService/ExchangeBundle';
const METHOD_PULL_PENDING = 'digitaldelta.v1.SyncService/PullPending';
const METHOD_MESH_HANDSHAKE = 'digitaldelta.v1.MeshHandshake';

export type DecodedPeerPacket =
  | { kind: 'handshake'; correlationId: string; handshake: SyncHandshake }
  | { kind: 'exchange_request'; correlationId: string; request: ExchangeBundleRequest; bundle: SyncDeltaBundle }
  | { kind: 'exchange_response'; correlationId: string; response: ExchangeBundleResponse }
  | { kind: 'pull_pending_request'; correlationId: string; request: PullPendingRequest }
  | { kind: 'pull_pending_response'; correlationId: string; response: PullPendingResponse };

export function encodeHandshakePacket(handshake: SyncHandshake, correlationId: string) {
  const message = create(MeshHandshakeSchema, {
    deviceLabel: handshake.device_label,
    replicaId: handshake.replica_id,
    lastSyncAtUnixMs: BigInt(Date.parse(handshake.last_sync_at)),
    vectorClock: vectorClockToEntries(handshake.vector_clock),
  });

  const packet = create(PeerSyncPacketSchema, {
    correlationId,
    rpcMethod: METHOD_MESH_HANDSHAKE,
    isResponse: false,
    payload: {
      case: 'handshake',
      value: message,
    },
  });

  return bytesToHex(toBinary(PeerSyncPacketSchema, packet));
}

export function encodeDeltaPacket(bundle: SyncDeltaBundle, correlationId: string) {
  const operations: SyncOperation[] = [
    ...bundle.records.map((record) =>
      createOperation(
        `${bundle.bundle_id}-${record.id}`,
        ENTITY_TYPE_INVENTORY,
        toBinary(InventoryRecordSchema, inventoryToProto(record)),
        record.last_writer,
        record.vector_clock,
        Date.parse(record.updated_at),
      ),
    ),
    ...bundle.pod_receipts.map((receipt) =>
      createOperation(
        `${bundle.bundle_id}-${receipt.receipt_id}`,
        ENTITY_TYPE_POD_RECEIPT,
        toBinary(DeliveryReceiptChainEntrySchema, podReceiptToProto(receipt)),
        receipt.sender_device_id,
        { [receipt.sender_device_id]: 1 },
        Date.parse(receipt.verified_at),
      ),
    ),
  ];

  const request = create(ExchangeBundleRequestSchema, {
    targetReplicaId: bundle.target_replica,
    bundle: {
      bundleId: bundle.bundle_id,
      sourceReplicaId: bundle.source_replica,
      operations,
      envelopes: [],
    },
  });

  const packet = create(PeerSyncPacketSchema, {
    correlationId,
    rpcMethod: METHOD_EXCHANGE_BUNDLE,
    isResponse: false,
    payload: {
      case: 'exchangeBundle',
      value: request,
    },
  });

  return bytesToHex(toBinary(PeerSyncPacketSchema, packet));
}

export function encodeExchangeBundleResponsePacket(
  response: ExchangeBundleResponse,
  correlationId: string,
) {
  const packet = create(PeerSyncPacketSchema, {
    correlationId,
    rpcMethod: METHOD_EXCHANGE_BUNDLE,
    isResponse: true,
    payload: {
      case: 'exchangeBundleResponse',
      value: response,
    },
  });

  return bytesToHex(toBinary(PeerSyncPacketSchema, packet));
}

export function encodePullPendingRequestPacket(
  replicaId: string,
  maxItems: number,
  correlationId: string,
) {
  const request = create(PullPendingRequestSchema, {
    replicaId,
    maxItems,
  });

  const packet = create(PeerSyncPacketSchema, {
    correlationId,
    rpcMethod: METHOD_PULL_PENDING,
    isResponse: false,
    payload: {
      case: 'pullPendingRequest',
      value: request,
    },
  });

  return bytesToHex(toBinary(PeerSyncPacketSchema, packet));
}

export function encodePullPendingResponsePacket(
  response: PullPendingResponse,
  correlationId: string,
) {
  const packet = create(PeerSyncPacketSchema, {
    correlationId,
    rpcMethod: METHOD_PULL_PENDING,
    isResponse: true,
    payload: {
      case: 'pullPendingResponse',
      value: response,
    },
  });

  return bytesToHex(toBinary(PeerSyncPacketSchema, packet));
}

export function decodePeerPacket(rawHex: string): DecodedPeerPacket | null {
  const packet = fromBinary(PeerSyncPacketSchema, hexToBytes(rawHex));
  const correlationId = packet.correlationId;
  if (packet.payload.case === 'handshake') {
    return {
      correlationId,
      kind: 'handshake',
      handshake: protoToHandshake(packet.payload.value),
    };
  }
  if (packet.payload.case === 'exchangeBundle' && packet.payload.value.bundle) {
    return {
      correlationId,
      kind: 'exchange_request',
      request: packet.payload.value,
      bundle: protoToDeltaBundle(packet.payload.value),
    };
  }
  if (packet.payload.case === 'exchangeBundleResponse') {
    return {
      correlationId,
      kind: 'exchange_response',
      response: packet.payload.value,
    };
  }
  if (packet.payload.case === 'pullPendingRequest') {
    return {
      correlationId,
      kind: 'pull_pending_request',
      request: packet.payload.value,
    };
  }
  if (packet.payload.case === 'pullPendingResponse') {
    return {
      correlationId,
      kind: 'pull_pending_response',
      response: packet.payload.value,
    };
  }
  return null;
}

function createOperation(
  operationId: string,
  entityType: string,
  payload: Uint8Array,
  replicaId: string,
  vectorClock: Record<string, number>,
  updatedAt: number,
) {
  return create(SyncOperationSchema, {
    operationId,
    entityType,
    payload,
    metadata: {
      entityId: operationId,
      replicaId,
      vectorClock: vectorClockToEntries(vectorClock),
      logicalTime: BigInt(0),
      updatedAtUnixMs: BigInt(updatedAt),
      tombstone: false,
    },
  });
}

function inventoryToProto(record: InventoryItem): InventoryRecord {
  return create(InventoryRecordSchema, {
    itemId: record.id,
    name: record.name,
    quantity: record.quantity,
    priority: priorityToProto(record.priority),
    lastWriter: record.last_writer,
    updatedAtUnixMs: BigInt(Date.parse(record.updated_at)),
    vectorClock: vectorClockToEntries(record.vector_clock),
  });
}

function protoToInventory(record: InventoryRecord): InventoryItem {
  return {
    conflicts: [],
    id: record.itemId,
    last_writer: record.lastWriter,
    name: record.name,
    priority: priorityFromProto(record.priority),
    quantity: record.quantity,
    updated_at: new Date(Number(record.updatedAtUnixMs)).toISOString(),
    vector_clock: entriesToVectorClock(record.vectorClock),
  };
}

function podReceiptToProto(receipt: PodReceipt): DeliveryReceiptChainEntry {
  return create(DeliveryReceiptChainEntrySchema, {
    receiptId: receipt.receipt_id,
    deliveryId: receipt.delivery_id,
    senderNodeId: receipt.sender_device_id,
    recipientNodeId: receipt.recipient_device_id,
    senderPublicKey: hexToBytes(receipt.sender_pubkey),
    recipientPublicKey: hexToBytes(receipt.recipient_pubkey),
    challengeNonce: receipt.challenge_nonce,
    recipientNonce: receipt.recipient_nonce,
    challengeTimestampUnixMs: BigInt(Date.parse(receipt.challenge_timestamp)),
    recipientTimestampUnixMs: BigInt(Date.parse(receipt.recipient_timestamp)),
    payloadHash: hexToBytes(receipt.payload_hash),
    senderSignature: hexToBytes(receipt.sender_signature),
    recipientSignature: hexToBytes(receipt.recipient_signature),
    prevReceiptHash: hexToBytes(receipt.prev_receipt_hash === 'GENESIS' ? '' : receipt.prev_receipt_hash),
    receiptHash: hexToBytes(receipt.receipt_hash),
    verifiedAtUnixMs: BigInt(Date.parse(receipt.verified_at)),
  });
}

function protoToPodReceipt(entry: DeliveryReceiptChainEntry): PodReceipt {
  return {
    challenge_nonce: entry.challengeNonce,
    challenge_timestamp: new Date(Number(entry.challengeTimestampUnixMs)).toISOString(),
    delivery_id: entry.deliveryId,
    kind: 'pod-response',
    payload_hash: bytesToHex(entry.payloadHash),
    prev_receipt_hash: entry.prevReceiptHash.length === 0 ? 'GENESIS' : bytesToHex(entry.prevReceiptHash),
    receipt_hash: bytesToHex(entry.receiptHash),
    receipt_id: entry.receiptId,
    recipient_device_id: entry.recipientNodeId,
    recipient_nonce: entry.recipientNonce,
    recipient_pubkey: bytesToHex(entry.recipientPublicKey),
    recipient_role: 'camp_commander',
    recipient_signature: bytesToHex(entry.recipientSignature),
    recipient_timestamp: new Date(Number(entry.recipientTimestampUnixMs)).toISOString(),
    sender_device_id: entry.senderNodeId,
    sender_pubkey: bytesToHex(entry.senderPublicKey),
    sender_role: 'field_volunteer',
    sender_signature: bytesToHex(entry.senderSignature),
    verified_at: new Date(Number(entry.verifiedAtUnixMs)).toISOString(),
  };
}

function protoToHandshake(handshake: MeshHandshake): SyncHandshake {
  return {
    device_label: handshake.deviceLabel,
    kind: 'sync-handshake',
    last_sync_at: new Date(Number(handshake.lastSyncAtUnixMs)).toISOString(),
    replica_id: handshake.replicaId,
    vector_clock: entriesToVectorClock(handshake.vectorClock),
  };
}

function protoToDeltaBundle(request: ExchangeBundleRequest): SyncDeltaBundle {
  const records: InventoryItem[] = [];
  const podReceipts: PodReceipt[] = [];
  const operations = request.bundle?.operations ?? [];
  for (const operation of operations) {
    if (operation.entityType === ENTITY_TYPE_INVENTORY) {
      records.push(protoToInventory(fromBinary(InventoryRecordSchema, operation.payload)));
      continue;
    }
    if (operation.entityType === ENTITY_TYPE_POD_RECEIPT) {
      podReceipts.push(protoToPodReceipt(fromBinary(DeliveryReceiptChainEntrySchema, operation.payload)));
    }
  }

  return {
    base_clock: records[0]?.vector_clock ?? {},
    bundle_id: request.bundle?.bundleId ?? `bundle-${Date.now()}`,
    created_at: new Date().toISOString(),
    kind: 'sync-delta',
    pod_receipts: podReceipts,
    records,
    source_replica: request.bundle?.sourceReplicaId ?? 'unknown',
    target_replica: request.targetReplicaId,
  };
}

function vectorClockToEntries(vectorClock: Record<string, number>) {
  return Object.entries(vectorClock).map(([replicaId, counter]) => ({
    replicaId,
    counter: BigInt(counter),
  }));
}

function entriesToVectorClock(entries: { replicaId: string; counter: bigint }[]) {
  return Object.fromEntries(entries.map((entry) => [entry.replicaId, Number(entry.counter)]));
}

function priorityToProto(priority: string) {
  switch (priority) {
    case 'P0':
      return DeliveryPriority.P0;
    case 'P1':
      return DeliveryPriority.P1;
    case 'P2':
      return DeliveryPriority.P2;
    case 'P3':
      return DeliveryPriority.P3;
    default:
      return DeliveryPriority.UNSPECIFIED;
  }
}

function priorityFromProto(priority: DeliveryPriority) {
  switch (priority) {
    case DeliveryPriority.P0:
      return 'P0';
    case DeliveryPriority.P1:
      return 'P1';
    case DeliveryPriority.P2:
      return 'P2';
    case DeliveryPriority.P3:
      return 'P3';
    default:
      return 'P1';
  }
}
