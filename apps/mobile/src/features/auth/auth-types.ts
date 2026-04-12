export type AuthRole =
  | 'field_volunteer'
  | 'supply_manager'
  | 'drone_operator'
  | 'camp_commander'
  | 'sync_admin';

export type AuthEventType =
  | 'key_pair_provisioned'
  | 'seed_created'
  | 'totp_viewed'
  | 'hotp_generated'
  | 'login_success'
  | 'login_failure'
  | 'role_changed'
  | 'secret_rotated'
  | 'tamper_detected';

export type AuthEventPayload = {
  detail: string;
  keyFingerprint?: string;
  role?: AuthRole;
  otpMode?: 'hotp' | 'totp';
  otpPreview?: string;
};

export type AuthLogEntry = {
  id: string;
  type: AuthEventType;
  createdAt: string;
  prevHash: string;
  hash: string;
  payload: AuthEventPayload;
};

export type AuthState = {
  deviceId: string;
  devicePrivateKeyHex: string;
  devicePublicKeyHex: string;
  role: AuthRole;
  totpSecretBase32: string;
  hotpCounter: number;
  auditLog: AuthLogEntry[];
};

export type TotpSnapshot = {
  code: string;
  remainingSeconds: number;
  periodSeconds: number;
  expiresAt: number;
};
