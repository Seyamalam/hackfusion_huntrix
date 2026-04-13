import AsyncStorage from '@react-native-async-storage/async-storage';

import type { HandoffOwnershipRecord } from '@/src/features/fleet/handoff-types';

const HANDOFF_LEDGER_KEY = 'huntrix.fleet.handoff-ledger';

export async function readHandoffRecords() {
  const value = await AsyncStorage.getItem(HANDOFF_LEDGER_KEY);
  return value ? (JSON.parse(value) as HandoffOwnershipRecord[]) : [];
}

export async function writeHandoffRecords(records: HandoffOwnershipRecord[]) {
  await AsyncStorage.setItem(HANDOFF_LEDGER_KEY, JSON.stringify(records));
}

export async function resetHandoffRecords() {
  await AsyncStorage.removeItem(HANDOFF_LEDGER_KEY);
}
