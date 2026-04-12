import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import type { AuthLogEntry, AuthRole } from '@/src/features/auth/auth-types';

const KEYS = {
  auditLog: 'huntrix.auth.audit-log',
  deviceId: 'huntrix.auth.device-id',
  devicePrivateKey: 'huntrix.auth.device-private-key',
  devicePublicKey: 'huntrix.auth.device-public-key',
  hotpCounter: 'huntrix.auth.hotp-counter',
  role: 'huntrix.auth.role',
  secret: 'huntrix.auth.secret',
} as const;

let secureStoreAvailable: boolean | null = null;

async function canUseSecureStore() {
  if (secureStoreAvailable !== null) {
    return secureStoreAvailable;
  }

  try {
    secureStoreAvailable = await SecureStore.isAvailableAsync();
  } catch {
    secureStoreAvailable = false;
  }

  return secureStoreAvailable;
}

async function getSecretStorageValue(key: string) {
  if (await canUseSecureStore()) {
    return SecureStore.getItemAsync(key);
  }

  return AsyncStorage.getItem(key);
}

async function setSecretStorageValue(key: string, value: string) {
  if (await canUseSecureStore()) {
    await SecureStore.setItemAsync(key, value);
    return;
  }

  await AsyncStorage.setItem(key, value);
}

export async function readDeviceId() {
  return getSecretStorageValue(KEYS.deviceId);
}

export async function writeDeviceId(value: string) {
  await setSecretStorageValue(KEYS.deviceId, value);
}

export async function readDevicePrivateKey() {
  return getSecretStorageValue(KEYS.devicePrivateKey);
}

export async function writeDevicePrivateKey(value: string) {
  await setSecretStorageValue(KEYS.devicePrivateKey, value);
}

export async function readDevicePublicKey() {
  return AsyncStorage.getItem(KEYS.devicePublicKey);
}

export async function writeDevicePublicKey(value: string) {
  await AsyncStorage.setItem(KEYS.devicePublicKey, value);
}

export async function readRole() {
  return (await AsyncStorage.getItem(KEYS.role)) as AuthRole | null;
}

export async function writeRole(value: AuthRole) {
  await AsyncStorage.setItem(KEYS.role, value);
}

export async function readTotpSecret() {
  return getSecretStorageValue(KEYS.secret);
}

export async function writeTotpSecret(value: string) {
  await setSecretStorageValue(KEYS.secret, value);
}

export async function readHotpCounter() {
  const value = await AsyncStorage.getItem(KEYS.hotpCounter);
  return value ? Number.parseInt(value, 10) : 0;
}

export async function writeHotpCounter(value: number) {
  await AsyncStorage.setItem(KEYS.hotpCounter, String(value));
}

export async function readAuditLog() {
  const value = await AsyncStorage.getItem(KEYS.auditLog);
  return value ? (JSON.parse(value) as AuthLogEntry[]) : [];
}

export async function writeAuditLog(entries: AuthLogEntry[]) {
  await AsyncStorage.setItem(KEYS.auditLog, JSON.stringify(entries));
}
