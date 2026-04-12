export type MeshNodeRole = 'client' | 'relay';

export type MeshTelemetry = {
  batteryPercent: number;
  proximityScore: number;
  signalStrength: number;
};

export type MeshNode = {
  deviceId: string;
  deviceLabel: string;
  online: boolean;
  privateKeyHex: string;
  publicKeyHex: string;
  role: MeshNodeRole;
  telemetry: MeshTelemetry;
};

export type MeshEnvelopeStatus =
  | 'created'
  | 'waiting_for_relay'
  | 'at_relay'
  | 'delivered'
  | 'expired'
  | 'duplicate_dropped';

export type MeshEnvelope = {
  createdAt: string;
  ciphertextHex: string;
  dedupeKey: string;
  envelopeId: string;
  expiresAt: string;
  nextHopId: string | null;
  nonceHex: string;
  payloadHashHex: string;
  recipientId: string;
  relayPath: string[];
  senderId: string;
  status: MeshEnvelopeStatus;
  ttlHops: number;
};

export type MeshEvent = {
  detail: string;
  timestamp: string;
  type:
    | 'created'
    | 'dedupe_drop'
    | 'delivered'
    | 'encrypted'
    | 'queued'
    | 'role_switched'
    | 'ttl_expired';
};
