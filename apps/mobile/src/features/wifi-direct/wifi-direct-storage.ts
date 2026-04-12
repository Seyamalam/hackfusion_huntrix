import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import {
  createSeedInventoryItem,
  type InventoryItem,
} from '@/src/features/sync-demo/sync-protocol';

type PeerClockState = Record<
  string,
  {
    knownClock: Record<string, number>;
    replicaId: string | null;
  }
>;

const KEYS = {
  inventory: 'huntrix.sync.inventory',
  peerClocks: 'huntrix.sync.peer-clocks',
  replicaId: 'huntrix.sync.replica-id',
} as const;

export async function readReplicaId() {
  const value = await AsyncStorage.getItem(KEYS.replicaId);
  if (value) {
    return value;
  }

  const next = Crypto.randomUUID();
  await AsyncStorage.setItem(KEYS.replicaId, next);
  return next;
}

export async function readLocalInventory() {
  const value = await AsyncStorage.getItem(KEYS.inventory);
  return value ? (JSON.parse(value) as InventoryItem) : createSeedInventoryItem();
}

export async function writeLocalInventory(item: InventoryItem) {
  await AsyncStorage.setItem(KEYS.inventory, JSON.stringify(item));
}

export async function readPeerClocks() {
  const value = await AsyncStorage.getItem(KEYS.peerClocks);
  return value ? (JSON.parse(value) as PeerClockState) : {};
}

export async function writePeerClocks(value: PeerClockState) {
  await AsyncStorage.setItem(KEYS.peerClocks, JSON.stringify(value));
}
