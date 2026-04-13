import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { ed25519 } from '@noble/curves/ed25519.js';

import {
  ProofOfDeliveryChallengeSchema,
  ProofOfDeliveryResponseSchema,
} from '@/src/gen/delivery_pb';
import type { AuthRole } from '@/src/features/auth/auth-types';
import { canPerform } from '@/src/features/auth/auth-rbac';
import { readRole } from '@/src/features/auth/auth-storage';
import { ensureAuthState } from '@/src/features/auth/auth-service';
import { createDeviceId, hexToBytes, bytesToHex, sha256Hex } from '@/src/features/auth/auth-utils';
import { readPodReceipts, readUsedPodNonces, resetPodLedger, writePodReceipts, writeUsedPodNonces } from '@/src/features/pod/pod-storage';
import type { PodChallenge, PodOutcome, PodPayload, PodReceipt, PodResponse } from '@/src/features/pod/pod-types';

const ACCEPTED_WINDOW_MS = 15 * 60 * 1000;
const CHALLENGE_PREFIX = 'podc:';
const RESPONSE_PREFIX = 'podr:';

export async function createChallengeQr(deliveryId: string, payloadSummary: string): Promise<PodOutcome<{ payload: PodChallenge; qrValue: string }>> {
  const authState = await ensureAuthState();
  if (!canPerform(authState.role, 'generate_pod')) {
    return {
      code: 'POD_ERR_ROLE_DENIED',
      message: `Role ${authState.role} cannot generate delivery challenges.`,
      ok: false,
    };
  }

  const payloadHash = await sha256Hex(payloadSummary.trim());
  const challengeBody = {
    delivery_id: deliveryId.trim(),
    kind: 'pod-challenge' as const,
    nonce: createDeviceId(),
    payload_hash: payloadHash,
    sender_device_id: authState.deviceId,
    sender_pubkey: authState.devicePublicKeyHex,
    sender_role: authState.role,
    timestamp: new Date().toISOString(),
  };

  const signature = signPayload(buildChallengeMessage(challengeBody), authState.devicePrivateKeyHex);
  const payload: PodChallenge = {
    ...challengeBody,
    signature,
  };

  return {
    code: 'POD_OK',
    message: 'Driver QR challenge generated and signed offline.',
    ok: true,
    value: {
      payload,
      qrValue: `${CHALLENGE_PREFIX}${bytesToHex(toBinary(ProofOfDeliveryChallengeSchema, create(ProofOfDeliveryChallengeSchema, {
        deliveryId: payload.delivery_id,
        senderNodeId: payload.sender_device_id,
        senderPublicKey: hexToBytes(payload.sender_pubkey),
        payloadHash: hexToBytes(payload.payload_hash),
        nonce: payload.nonce,
        timestampUnixMs: BigInt(Date.parse(payload.timestamp)),
        signature: hexToBytes(payload.signature),
        senderRole: payload.sender_role,
      })))}`,
    },
  };
}

export async function countersignChallenge(rawValue: string): Promise<PodOutcome<{ payload: PodResponse; qrValue: string }>> {
  const parsed = parsePodPayload(rawValue);
  if (!parsed.ok || !parsed.value || parsed.value.kind !== 'pod-challenge') {
    return {
      code: parsed.code,
      message: parsed.message,
      ok: false,
    };
  }

  const role = (await readRole()) ?? 'field_volunteer';
  if (!canPerform(role, 'countersign_pod')) {
    return {
      code: 'POD_ERR_ROLE_DENIED',
      message: `Role ${role} cannot countersign delivery receipts.`,
      ok: false,
    };
  }

  const challenge: PodChallenge = parsed.value;
  const verifyResult = await verifyChallenge(challenge);
  if (!verifyResult.ok) {
    return {
      code: verifyResult.code,
      message: verifyResult.message,
      ok: false,
    };
  }

  const authState = await ensureAuthState();
  const responseBody = {
    challenge_nonce: challenge.nonce,
    challenge_timestamp: challenge.timestamp,
    delivery_id: challenge.delivery_id,
    kind: 'pod-response' as const,
    payload_hash: challenge.payload_hash,
    receipt_id: createDeviceId(),
    recipient_device_id: authState.deviceId,
    recipient_nonce: createDeviceId(),
    recipient_pubkey: authState.devicePublicKeyHex,
    recipient_role: authState.role,
    recipient_timestamp: new Date().toISOString(),
    sender_device_id: challenge.sender_device_id,
    sender_pubkey: challenge.sender_pubkey,
    sender_role: challenge.sender_role,
    sender_signature: challenge.signature,
  };

  const response: PodResponse = {
    ...responseBody,
    recipient_signature: signPayload(buildResponseMessage(responseBody), authState.devicePrivateKeyHex),
  };

  await markNonceUsed(challenge.nonce);

  return {
    code: 'POD_OK',
    message: 'Recipient challenge scanned, verified, and countersigned offline.',
    ok: true,
    value: {
      payload: response,
      qrValue: `${RESPONSE_PREFIX}${bytesToHex(toBinary(ProofOfDeliveryResponseSchema, create(ProofOfDeliveryResponseSchema, {
        challenge: create(ProofOfDeliveryChallengeSchema, {
          deliveryId: challenge.delivery_id,
          senderNodeId: challenge.sender_device_id,
          senderPublicKey: hexToBytes(challenge.sender_pubkey),
          payloadHash: hexToBytes(challenge.payload_hash),
          nonce: challenge.nonce,
          timestampUnixMs: BigInt(Date.parse(challenge.timestamp)),
          signature: hexToBytes(challenge.signature),
        }),
        recipientNodeId: response.recipient_device_id,
        recipientPublicKey: hexToBytes(response.recipient_pubkey),
        recipientNonce: response.recipient_nonce,
        recipientTimestampUnixMs: BigInt(Date.parse(response.recipient_timestamp)),
        recipientSignature: hexToBytes(response.recipient_signature),
        receiptId: response.receipt_id,
        recipientRole: response.recipient_role,
      })))}`,
    },
  };
}

export async function finalizeReceipt(rawValue: string): Promise<PodOutcome<{ receipt: PodReceipt; receipts: PodReceipt[] }>> {
  const parsed = parsePodPayload(rawValue);
  if (!parsed.ok || !parsed.value || parsed.value.kind !== 'pod-response') {
    return {
      code: parsed.code,
      message: parsed.message,
      ok: false,
    };
  }

  const role = (await readRole()) ?? 'field_volunteer';
  if (!canPerform(role, 'verify_pod')) {
    return {
      code: 'POD_ERR_ROLE_DENIED',
      message: `Role ${role} cannot finalize delivery receipts.`,
      ok: false,
    };
  }

  const response: PodResponse = parsed.value;
  const verification = await verifyResponse(response);
  if (!verification.ok) {
    return {
      code: verification.code,
      message: verification.message,
      ok: false,
    };
  }

  const usedNonces = await readUsedPodNonces();
  if (usedNonces.includes(response.recipient_nonce)) {
    return {
      code: 'POD_ERR_NONCE_USED',
      message: 'Recipient nonce already used. Replay rejected.',
      ok: false,
    };
  }

  const receipts = await readPodReceipts();
  const prevReceiptHash = findLatestReceiptHash(receipts, response.delivery_id);
  const receiptHash = await sha256Hex(
    [
      response.receipt_id,
      response.delivery_id,
      response.payload_hash,
      response.sender_signature,
      response.recipient_signature,
      prevReceiptHash,
    ].join('|'),
  );

  const receipt: PodReceipt = {
    ...response,
    prev_receipt_hash: prevReceiptHash,
    receipt_hash: receiptHash,
    verified_at: new Date().toISOString(),
  };

  const nextReceipts = mergeReceipts(receipts, [receipt]);
  await writePodReceipts(nextReceipts);
  await markNonceUsed(response.recipient_nonce);

  return {
    code: 'POD_OK',
    message: 'Driver verified recipient countersignature. Receipt appended to the local CRDT ledger.',
    ok: true,
    value: {
      receipt,
      receipts: nextReceipts,
    },
  };
}

export async function getPodLedgerState() {
  const [receipts, usedNonces] = await Promise.all([readPodReceipts(), readUsedPodNonces()]);
  return { receipts, usedNonces };
}

export async function clearPodLedger() {
  await resetPodLedger();
  return { receipts: [] as PodReceipt[], usedNonces: [] as string[] };
}

export function parsePodPayload(rawValue: string): PodOutcome<PodPayload> {
  try {
    if (rawValue.startsWith(CHALLENGE_PREFIX)) {
      const message = fromBinary(ProofOfDeliveryChallengeSchema, hexToBytes(rawValue.slice(CHALLENGE_PREFIX.length)));
      return {
        code: 'POD_OK',
        message: 'Parsed PoD challenge payload.',
        ok: true,
        value: {
          delivery_id: message.deliveryId,
          kind: 'pod-challenge',
          nonce: message.nonce,
          payload_hash: bytesToHex(message.payloadHash),
          sender_device_id: message.senderNodeId,
          sender_pubkey: bytesToHex(message.senderPublicKey),
          sender_role: (message.senderRole || 'field_volunteer') as AuthRole,
          signature: bytesToHex(message.signature),
          timestamp: new Date(Number(message.timestampUnixMs)).toISOString(),
        },
      };
    }
    if (rawValue.startsWith(RESPONSE_PREFIX)) {
      const message = fromBinary(ProofOfDeliveryResponseSchema, hexToBytes(rawValue.slice(RESPONSE_PREFIX.length)));
      return {
        code: 'POD_OK',
        message: 'Parsed PoD response payload.',
        ok: true,
        value: {
          challenge_nonce: message.challenge?.nonce ?? '',
          challenge_timestamp: new Date(Number(message.challenge?.timestampUnixMs ?? 0n)).toISOString(),
          delivery_id: message.challenge?.deliveryId ?? '',
          kind: 'pod-response',
          payload_hash: bytesToHex(message.challenge?.payloadHash ?? new Uint8Array()),
          receipt_id: message.receiptId,
          recipient_device_id: message.recipientNodeId,
          recipient_nonce: message.recipientNonce,
          recipient_pubkey: bytesToHex(message.recipientPublicKey),
          recipient_role: (message.recipientRole || 'camp_commander') as AuthRole,
          recipient_signature: bytesToHex(message.recipientSignature),
          recipient_timestamp: new Date(Number(message.recipientTimestampUnixMs)).toISOString(),
          sender_device_id: message.challenge?.senderNodeId ?? '',
          sender_pubkey: bytesToHex(message.challenge?.senderPublicKey ?? new Uint8Array()),
          sender_role: ((message.challenge?.senderRole as AuthRole | undefined) || 'field_volunteer'),
          sender_signature: bytesToHex(message.challenge?.signature ?? new Uint8Array()),
        },
      };
    }
    return { code: 'POD_ERR_INVALID_FORMAT', message: 'Unsupported PoD packet encoding.', ok: false };
  } catch {
    return { code: 'POD_ERR_INVALID_FORMAT', message: 'QR payload is not valid protobuf data.', ok: false };
  }
}

export function mergeReceipts(current: PodReceipt[], incoming: PodReceipt[]) {
  const byID = new Map(current.map((receipt) => [receipt.receipt_id, receipt]));
  for (const receipt of incoming) {
    byID.set(receipt.receipt_id, receipt);
  }
  return [...byID.values()].sort((left, right) => left.verified_at.localeCompare(right.verified_at));
}

function signPayload(message: string, privateKeyHex: string) {
  const signature = ed25519.sign(new TextEncoder().encode(message), hexToBytes(privateKeyHex));
  return bytesToHex(signature);
}

async function verifyChallenge(challenge: PodChallenge): Promise<PodOutcome<undefined>> {
  const usedNonces = await readUsedPodNonces();
  if (usedNonces.includes(challenge.nonce)) {
    return { code: 'POD_ERR_NONCE_USED', message: 'Challenge nonce already used. Replay rejected.', ok: false };
  }
  if (Date.now() - Date.parse(challenge.timestamp) > ACCEPTED_WINDOW_MS) {
    return { code: 'POD_ERR_STALE', message: 'Challenge timestamp is outside the accepted offline window.', ok: false };
  }
  const verified = ed25519.verify(
    hexToBytes(challenge.signature),
    new TextEncoder().encode(buildChallengeMessage(challenge)),
    hexToBytes(challenge.sender_pubkey),
  );
  if (!verified) {
    return { code: 'POD_ERR_BAD_SIGNATURE', message: 'Challenge signature verification failed.', ok: false };
  }
  return { code: 'POD_OK', message: 'Challenge signature verified.', ok: true };
}

async function verifyResponse(response: PodResponse): Promise<PodOutcome<undefined>> {
  if (Date.now() - Date.parse(response.recipient_timestamp) > ACCEPTED_WINDOW_MS) {
    return { code: 'POD_ERR_STALE', message: 'Receipt response timestamp is outside the accepted offline window.', ok: false };
  }

  const senderVerified = ed25519.verify(
    hexToBytes(response.sender_signature),
    new TextEncoder().encode(
      buildChallengeMessage({
        delivery_id: response.delivery_id,
        kind: 'pod-challenge',
        nonce: response.challenge_nonce,
        payload_hash: response.payload_hash,
        sender_device_id: response.sender_device_id,
        sender_pubkey: response.sender_pubkey,
        sender_role: response.sender_role,
        timestamp: response.challenge_timestamp,
      }),
    ),
    hexToBytes(response.sender_pubkey),
  );
  if (!senderVerified) {
    return { code: 'POD_ERR_BAD_SIGNATURE', message: 'Sender signature in the response could not be verified.', ok: false };
  }

  const recipientVerified = ed25519.verify(
    hexToBytes(response.recipient_signature),
    new TextEncoder().encode(buildResponseMessage(response)),
    hexToBytes(response.recipient_pubkey),
  );
  if (!recipientVerified) {
    return { code: 'POD_ERR_BAD_SIGNATURE', message: 'Recipient countersignature verification failed.', ok: false };
  }

  return { code: 'POD_OK', message: 'Sender and recipient signatures verified.', ok: true };
}

function buildChallengeMessage(challenge: Omit<PodChallenge, 'signature'>) {
  return [
    challenge.kind,
    challenge.delivery_id,
    challenge.sender_device_id,
    challenge.sender_pubkey,
    challenge.sender_role,
    challenge.payload_hash,
    challenge.nonce,
    challenge.timestamp,
  ].join('|');
}

function buildResponseMessage(response: Omit<PodResponse, 'recipient_signature'>) {
  return [
    response.kind,
    response.receipt_id,
    response.delivery_id,
    response.sender_device_id,
    response.sender_pubkey,
    response.sender_role,
    response.payload_hash,
    response.challenge_nonce,
    response.challenge_timestamp,
    response.sender_signature,
    response.recipient_device_id,
    response.recipient_pubkey,
    response.recipient_role,
    response.recipient_nonce,
    response.recipient_timestamp,
  ].join('|');
}

async function markNonceUsed(nonce: string) {
  const current = await readUsedPodNonces();
  if (current.includes(nonce)) {
    return current;
  }
  const next = [...current, nonce];
  await writeUsedPodNonces(next);
  return next;
}

function findLatestReceiptHash(receipts: PodReceipt[], deliveryID: string) {
  const chain = receipts.filter((receipt) => receipt.delivery_id === deliveryID);
  return chain.length > 0 ? chain[chain.length - 1]?.receipt_hash ?? 'GENESIS' : 'GENESIS';
}
