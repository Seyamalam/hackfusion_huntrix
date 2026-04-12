import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PodReceipt } from '@/src/features/pod/pod-types';

const KEYS = {
  receipts: 'huntrix.pod.receipts',
  usedNonces: 'huntrix.pod.used-nonces',
} as const;

export async function readPodReceipts() {
  const value = await AsyncStorage.getItem(KEYS.receipts);
  return value ? (JSON.parse(value) as PodReceipt[]) : [];
}

export async function writePodReceipts(receipts: PodReceipt[]) {
  await AsyncStorage.setItem(KEYS.receipts, JSON.stringify(receipts));
}

export async function readUsedPodNonces() {
  const value = await AsyncStorage.getItem(KEYS.usedNonces);
  return value ? (JSON.parse(value) as string[]) : [];
}

export async function writeUsedPodNonces(nonces: string[]) {
  await AsyncStorage.setItem(KEYS.usedNonces, JSON.stringify(nonces));
}

export async function resetPodLedger() {
  await AsyncStorage.multiRemove([KEYS.receipts, KEYS.usedNonces]);
}
