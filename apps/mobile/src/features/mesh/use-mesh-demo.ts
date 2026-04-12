import { useMemo, useState } from 'react';
import * as Crypto from 'expo-crypto';

import { createDeviceId, createDeviceKeyPair } from '@/src/features/auth/auth-utils';
import { decryptMeshPayload, encryptMeshPayload } from '@/src/features/mesh/mesh-crypto';
import type { MeshEnvelope, MeshEvent, MeshNode, MeshNodeRole } from '@/src/features/mesh/mesh-types';

const INITIAL_NODES = createInitialNodes();

export function useMeshDemo() {
  const [nodes, setNodes] = useState<MeshNode[]>(INITIAL_NODES);
  const [events, setEvents] = useState<MeshEvent[]>([]);
  const [envelopes, setEnvelopes] = useState<MeshEnvelope[]>([]);
  const [packetInspection, setPacketInspection] = useState<{
    relayCanRead: boolean;
    relayPreview: string;
    recipientPreview: string;
  } | null>(null);

  const nodeIndex = useMemo(
    () => Object.fromEntries(nodes.map((node) => [node.deviceId, node])),
    [nodes],
  );

  async function createRelayMessage() {
    const sender = nodes[0];
    const relay = nodes[1];
    const recipient = nodes[2];
    const plaintext =
      'supply:update|item=ORS Saline|qty=180|priority=P0|route=Camp C';
    const encrypted = await encryptMeshPayload(
      plaintext,
      sender.privateKeyHex,
      recipient.publicKeyHex,
    );

    const envelope: MeshEnvelope = {
      createdAt: new Date().toISOString(),
      ciphertextHex: encrypted.ciphertextHex,
      dedupeKey: await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${sender.deviceId}:${recipient.deviceId}:${encrypted.payloadHashHex}`,
        { encoding: Crypto.CryptoEncoding.HEX },
      ),
      envelopeId: createDeviceId(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      nextHopId: relay.deviceId,
      nonceHex: encrypted.nonceHex,
      payloadHashHex: encrypted.payloadHashHex,
      recipientId: recipient.deviceId,
      relayPath: [sender.deviceId],
      senderId: sender.deviceId,
      status: relay.online ? 'created' : 'waiting_for_relay',
      ttlHops: 2,
    };

    setEnvelopes([envelope]);
    setPacketInspection({
      recipientPreview:
        decryptMeshPayload(encrypted, recipient.privateKeyHex, sender.publicKeyHex) ?? 'decryption failed',
      relayCanRead:
        decryptMeshPayload(encrypted, relay.privateKeyHex, sender.publicKeyHex) !== null,
      relayPreview:
        decryptMeshPayload(encrypted, relay.privateKeyHex, sender.publicKeyHex) ?? 'ciphertext only',
    });
    appendEvent('encrypted', 'Created A -> B -> C encrypted relay envelope.');
  }

  function relayNextHop() {
    setEnvelopes((current) =>
      current.map((envelope) => {
        if (envelope.status === 'delivered' || envelope.status === 'expired' || envelope.status === 'duplicate_dropped') {
          return envelope;
        }

        const relay = nodeIndex['node-b'];
        const recipient = nodeIndex['node-c'];
        if (envelope.ttlHops <= 0) {
          appendEvent('ttl_expired', 'Envelope expired before delivery.');
          return {
            ...envelope,
            nextHopId: null,
            status: 'expired',
          };
        }

        if (envelope.status === 'waiting_for_relay' || envelope.status === 'created') {
          if (!relay.online) {
            appendEvent('queued', 'Relay B is offline. Envelope stored for later forwarding.');
            return {
              ...envelope,
              status: 'waiting_for_relay',
            };
          }

          appendEvent('queued', 'Envelope forwarded from A to relay B.');
          return {
            ...envelope,
            nextHopId: recipient.deviceId,
            relayPath: [...envelope.relayPath, relay.deviceId],
            status: 'at_relay',
            ttlHops: envelope.ttlHops - 1,
          };
        }

        if (envelope.status === 'at_relay') {
          if (!relay.online) {
            appendEvent('queued', 'Relay B went offline mid-relay. Delivery paused.');
            return {
              ...envelope,
              status: 'waiting_for_relay',
            };
          }

          if (envelope.relayPath.includes(recipient.deviceId)) {
            appendEvent('dedupe_drop', 'Duplicate delivery attempt dropped by dedupe protection.');
            return {
              ...envelope,
              nextHopId: null,
              status: 'duplicate_dropped',
            };
          }

          appendEvent('delivered', 'Relay B delivered envelope to recipient C.');
          return {
            ...envelope,
            nextHopId: null,
            relayPath: [...envelope.relayPath, recipient.deviceId],
            status: 'delivered',
            ttlHops: envelope.ttlHops - 1,
          };
        }

        return envelope;
      }),
    );
  }

  function setRelayOnline(online: boolean) {
    setNodes((current) =>
      current.map((node) =>
        node.deviceId === 'node-b'
          ? {
              ...node,
              online,
            }
          : node,
      ),
    );
  }

  function changeRelayTelemetry(delta: { battery?: number; proximity?: number; signal?: number }) {
    setNodes((current) =>
      current.map((node) => {
        if (node.deviceId !== 'node-b') {
          return node;
        }

        const nextTelemetry = {
          batteryPercent: clamp(delta.battery ?? node.telemetry.batteryPercent, 0, 100),
          proximityScore: clamp(delta.proximity ?? node.telemetry.proximityScore, 0, 100),
          signalStrength: clamp(delta.signal ?? node.telemetry.signalStrength, 0, 100),
        };
        const nextRole = scoreRole(nextTelemetry);
        if (nextRole !== node.role) {
          appendEvent(
            'role_switched',
            `Relay B switched from ${node.role} to ${nextRole} based on telemetry.`,
          );
        }
        return {
          ...node,
          role: nextRole,
          telemetry: nextTelemetry,
        };
      }),
    );
  }

  function resetMeshDemo() {
    setNodes(createInitialNodes());
    setEnvelopes([]);
    setEvents([]);
    setPacketInspection(null);
  }

  return {
    envelopes,
    events,
    nodes,
    packetInspection,
    changeRelayTelemetry,
    createRelayMessage,
    relayNextHop,
    resetMeshDemo,
    setRelayOnline,
  };

  function appendEvent(type: MeshEvent['type'], detail: string) {
    setEvents((current) => [
      {
        detail,
        timestamp: new Date().toISOString(),
        type,
      },
      ...current,
    ]);
  }
}

function createInitialNodes(): MeshNode[] {
  return [
    createNode('node-a', 'Device A', true, {
      batteryPercent: 62,
      proximityScore: 55,
      signalStrength: 58,
    }),
    createNode('node-b', 'Device B', true, {
      batteryPercent: 84,
      proximityScore: 92,
      signalStrength: 87,
    }),
    createNode('node-c', 'Device C', true, {
      batteryPercent: 41,
      proximityScore: 60,
      signalStrength: 52,
    }),
  ];
}

function createNode(
  deviceId: string,
  deviceLabel: string,
  online: boolean,
  telemetry: MeshNode['telemetry'],
): MeshNode {
  const keyPair = createDeviceKeyPair();
  return {
    deviceId,
    deviceLabel,
    online,
    privateKeyHex: keyPair.privateKeyHex,
    publicKeyHex: keyPair.publicKeyHex,
    role: scoreRole(telemetry),
    telemetry,
  };
}

function scoreRole(telemetry: MeshNode['telemetry']): MeshNodeRole {
  const relayScore =
    telemetry.batteryPercent * 0.45 +
    telemetry.signalStrength * 0.35 +
    telemetry.proximityScore * 0.2;
  return relayScore >= 65 ? 'relay' : 'client';
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
