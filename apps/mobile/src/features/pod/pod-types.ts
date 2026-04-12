import type { AuthRole } from '@/src/features/auth/auth-types';

export type PodErrorCode =
  | 'POD_OK'
  | 'POD_ERR_BAD_SIGNATURE'
  | 'POD_ERR_INVALID_FORMAT'
  | 'POD_ERR_NONCE_USED'
  | 'POD_ERR_ROLE_DENIED'
  | 'POD_ERR_STALE'
  | 'POD_ERR_TAMPERED';

export type PodChallenge = {
  delivery_id: string;
  kind: 'pod-challenge';
  nonce: string;
  payload_hash: string;
  sender_device_id: string;
  sender_pubkey: string;
  sender_role: AuthRole;
  signature: string;
  timestamp: string;
};

export type PodResponse = {
  challenge_nonce: string;
  challenge_timestamp: string;
  delivery_id: string;
  kind: 'pod-response';
  payload_hash: string;
  receipt_id: string;
  recipient_device_id: string;
  recipient_nonce: string;
  recipient_pubkey: string;
  recipient_role: AuthRole;
  recipient_signature: string;
  recipient_timestamp: string;
  sender_device_id: string;
  sender_pubkey: string;
  sender_role: AuthRole;
  sender_signature: string;
};

export type PodReceipt = PodResponse & {
  prev_receipt_hash: string;
  receipt_hash: string;
  verified_at: string;
};

export type PodPayload = PodChallenge | PodResponse;

export type PodOutcome<T> = {
  code: PodErrorCode;
  message: string;
  ok: boolean;
  value?: T;
};
