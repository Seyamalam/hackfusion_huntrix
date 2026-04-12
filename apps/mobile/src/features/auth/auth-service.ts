import type { AuthEventPayload, AuthLogEntry, AuthRole, AuthState, TotpSnapshot } from '@/src/features/auth/auth-types';
import {
  readAuditLog,
  readDeviceId,
  readDevicePrivateKey,
  readDevicePublicKey,
  readHotpCounter,
  readRole,
  readTotpSecret,
  writeAuditLog,
  writeDeviceId,
  writeDevicePrivateKey,
  writeDevicePublicKey,
  writeHotpCounter,
  writeRole,
  writeTotpSecret,
} from '@/src/features/auth/auth-storage';
import {
  createDeviceId,
  createDeviceKeyPair,
  generateHotp,
  generateSecretBase32,
  generateTotp,
  publicKeyFingerprint,
  sha256Hex,
} from '@/src/features/auth/auth-utils';

const DEFAULT_ROLE: AuthRole = 'field_volunteer';

export async function ensureAuthState() {
  let deviceId = await readDeviceId();
  let devicePrivateKeyHex = await readDevicePrivateKey();
  let devicePublicKeyHex = await readDevicePublicKey();
  let role = await readRole();
  let totpSecretBase32 = await readTotpSecret();
  const hotpCounter = await readHotpCounter();
  const auditLog = await readAuditLog();

  if (!deviceId) {
    deviceId = createDeviceId();
    await writeDeviceId(deviceId);
  }

  if (!role) {
    role = DEFAULT_ROLE;
    await writeRole(role);
  }

  if (!totpSecretBase32) {
    totpSecretBase32 = generateSecretBase32();
    await writeTotpSecret(totpSecretBase32);
  }

  let keyPairProvisioned = false;
  if (!devicePrivateKeyHex || !devicePublicKeyHex) {
    const keyPair = createDeviceKeyPair();
    devicePrivateKeyHex = keyPair.privateKeyHex;
    devicePublicKeyHex = keyPair.publicKeyHex;
    await writeDevicePrivateKey(devicePrivateKeyHex);
    await writeDevicePublicKey(devicePublicKeyHex);
    keyPairProvisioned = true;
  }

  let nextState: AuthState = {
    deviceId,
    devicePrivateKeyHex,
    devicePublicKeyHex,
    role,
    totpSecretBase32,
    hotpCounter,
    auditLog,
  };

  if (auditLog.length === 0) {
    nextState = await appendAuditEvent(nextState, 'seed_created', {
      detail: 'Provisioned offline OTP secret and initialized audit chain.',
      role,
      otpMode: 'totp',
      otpPreview: previewSecret(totpSecretBase32),
    });
  }

  if (keyPairProvisioned) {
    nextState = await appendAuditEvent(nextState, 'key_pair_provisioned', {
      detail: 'Provisioned per-device Ed25519 keypair for offline identity.',
      keyFingerprint: publicKeyFingerprint(devicePublicKeyHex),
      role: nextState.role,
    });
  }

  return nextState;
}

export function readTotpSnapshot(state: AuthState): TotpSnapshot {
  const snapshot = generateTotp(state.totpSecretBase32);
  return {
    code: snapshot.code,
    remainingSeconds: snapshot.remainingSeconds,
    periodSeconds: snapshot.periodSeconds,
    expiresAt: snapshot.expiresAt,
  };
}

export async function recordTotpViewed(state: AuthState, snapshot: TotpSnapshot) {
  return appendAuditEvent(state, 'totp_viewed', {
    detail: `Displayed offline TOTP with ${snapshot.remainingSeconds}s until expiry.`,
    role: state.role,
    otpMode: 'totp',
    otpPreview: snapshot.code,
  });
}

export async function generateNextHotp(state: AuthState) {
  const nextCounter = state.hotpCounter + 1;
  const code = generateHotp(state.totpSecretBase32, nextCounter);
  const nextState = await appendAuditEvent(
    {
      ...state,
      hotpCounter: nextCounter,
    },
    'hotp_generated',
    {
      detail: `Generated offline HOTP counter ${nextCounter}.`,
      role: state.role,
      otpMode: 'hotp',
      otpPreview: code,
    },
  );

  return {
    code,
    state: nextState,
  };
}

export async function attemptTotpLogin(state: AuthState, providedCode: string) {
  const snapshot = readTotpSnapshot(state);
  const accepted = snapshot.code === providedCode;

  const nextState = await appendAuditEvent(
    state,
    accepted ? 'login_success' : 'login_failure',
    {
      detail: accepted
        ? `Accepted offline TOTP login for role ${state.role}.`
        : `Rejected offline TOTP login attempt for role ${state.role}.`,
      role: state.role,
      otpMode: 'totp',
      otpPreview: providedCode,
    },
  );

  return {
    accepted,
    state: nextState,
  };
}

export async function rotateSecret(state: AuthState) {
  const nextSecret = generateSecretBase32();
  await writeTotpSecret(nextSecret);

  return appendAuditEvent(
    {
      ...state,
      totpSecretBase32: nextSecret,
      hotpCounter: 0,
    },
    'secret_rotated',
    {
      detail: 'Rotated OTP seed and reset HOTP counter.',
      role: state.role,
      otpMode: 'totp',
      otpPreview: previewSecret(nextSecret),
    },
  );
}

export async function changeRole(state: AuthState, role: AuthRole) {
  await writeRole(role);
  return appendAuditEvent(
    {
      ...state,
      role,
    },
    'role_changed',
    {
      detail: `Changed active role to ${role}.`,
      role,
    },
  );
}

export async function tamperLatestLog(state: AuthState) {
  if (state.auditLog.length === 0) {
    return state;
  }

  const tamperedLog = state.auditLog.map((entry, index) =>
    index === state.auditLog.length - 1
      ? {
          ...entry,
          payload: {
            ...entry.payload,
            detail: `${entry.payload.detail} [tampered]`,
          },
        }
      : entry,
  );

  const nextState = {
    ...state,
    auditLog: tamperedLog,
  };

  await writeAuditLog(tamperedLog);
  return nextState;
}

export async function detectAuditTampering(state: AuthState) {
  for (let index = 0; index < state.auditLog.length; index += 1) {
    const entry = state.auditLog[index];
    const prevHash = index === 0 ? 'GENESIS' : state.auditLog[index - 1]?.hash ?? 'GENESIS';
    const expectedHash = await buildHash(entry.id, entry.type, entry.createdAt, prevHash, entry.payload);
    if (entry.prevHash !== prevHash || entry.hash !== expectedHash) {
      const nextState = await appendAuditEvent(state, 'tamper_detected', {
        detail: `Detected audit-chain corruption at log index ${index}.`,
        role: state.role,
      });

      return {
        compromised: true,
        state: nextState,
      };
    }
  }

  return {
    compromised: false,
    state,
  };
}

async function appendAuditEvent(state: AuthState, type: AuthLogEntry['type'], payload: AuthEventPayload) {
  const id = createDeviceId();
  const createdAt = new Date().toISOString();
  const prevHash = state.auditLog[state.auditLog.length - 1]?.hash ?? 'GENESIS';
  const hash = await buildHash(id, type, createdAt, prevHash, payload);

  const entry: AuthLogEntry = {
    id,
    type,
    createdAt,
    prevHash,
    hash,
    payload,
  };

  const nextLog = [...state.auditLog, entry];
  await writeAuditLog(nextLog);
  await writeHotpCounter(state.hotpCounter);

  return {
    ...state,
    auditLog: nextLog,
  };
}

async function buildHash(
  id: string,
  type: AuthLogEntry['type'],
  createdAt: string,
  prevHash: string,
  payload: AuthEventPayload,
) {
  return sha256Hex(JSON.stringify({ createdAt, id, payload, prevHash, type }));
}

function previewSecret(secret: string) {
  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
}
