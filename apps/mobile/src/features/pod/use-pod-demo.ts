import { useEffect, useMemo, useState } from 'react';

import { ensureAuthState } from '@/src/features/auth/auth-service';
import type { AuthRole } from '@/src/features/auth/auth-types';
import {
  clearPodLedger,
  countersignChallenge,
  createChallengeQr,
  finalizeReceipt,
  getPodLedgerState,
  parsePodPayload,
} from '@/src/features/pod/pod-service';
import type { PodErrorCode, PodReceipt } from '@/src/features/pod/pod-types';

type PodDemoState = {
  currentRole: AuthRole | null;
  deliveryId: string;
  errorCode: PodErrorCode | null;
  lastChallengeValue: string | null;
  lastResponseValue: string | null;
  payloadSummary: string;
  receipts: PodReceipt[];
  scannerOpen: boolean;
  status: string;
  usedNonces: string[];
};

const INITIAL_STATE: PodDemoState = {
  currentRole: null,
  deliveryId: 'DELTA-001',
  errorCode: null,
  lastChallengeValue: null,
  lastResponseValue: null,
  payloadSummary: 'ORS saline x48 | medical kits x12 | route N1 -> N3',
  receipts: [],
  scannerOpen: false,
  status: 'Generate a signed QR challenge as the driver, countersign as the camp, then finalize the receipt.',
  usedNonces: [],
};

export function usePodDemo() {
  const [demo, setDemo] = useState<PodDemoState>(INITIAL_STATE);

  useEffect(() => {
    let active = true;

    Promise.all([ensureAuthState(), getPodLedgerState()]).then(([authState, ledger]) => {
      if (!active) {
        return;
      }

      setDemo((current) => ({
        ...current,
        currentRole: authState.role,
        receipts: ledger.receipts,
        usedNonces: ledger.usedNonces,
      }));
    });

    return () => {
      active = false;
    };
  }, []);

  const receiptChain = useMemo(
    () => demo.receipts.filter((receipt) => receipt.delivery_id === demo.deliveryId),
    [demo.deliveryId, demo.receipts],
  );

  async function generateDriverQr() {
    const result = await createChallengeQr(demo.deliveryId, demo.payloadSummary);
    const authState = await ensureAuthState();
    setDemo((current) => ({
      ...current,
      currentRole: authState.role,
      errorCode: result.code,
      lastChallengeValue: result.value?.qrValue ?? current.lastChallengeValue,
      status: result.message,
    }));
  }

  async function processScannedValue(rawValue: string) {
    const parsed = parsePodPayload(rawValue);
    if (!parsed.ok || !parsed.value) {
      setDemo((current) => ({
        ...current,
        errorCode: parsed.code,
        scannerOpen: false,
        status: parsed.message,
      }));
      return;
    }

    if (parsed.value.kind === 'pod-challenge') {
      const result = await countersignChallenge(rawValue);
      const [ledger, authState] = await Promise.all([getPodLedgerState(), ensureAuthState()]);
      setDemo((current) => ({
        ...current,
        currentRole: authState.role,
        errorCode: result.code,
        lastResponseValue: result.value?.qrValue ?? current.lastResponseValue,
        receipts: ledger.receipts,
        scannerOpen: false,
        status: result.message,
        usedNonces: ledger.usedNonces,
      }));
      return;
    }

    const result = await finalizeReceipt(rawValue);
    const [ledger, authState] = await Promise.all([getPodLedgerState(), ensureAuthState()]);
    setDemo((current) => ({
      ...current,
      currentRole: authState.role,
      errorCode: result.code,
      receipts: result.value?.receipts ?? ledger.receipts,
      scannerOpen: false,
      status: result.message,
      usedNonces: ledger.usedNonces,
    }));
  }

  async function simulateRecipientScan() {
    if (!demo.lastChallengeValue) {
      return;
    }
    await processScannedValue(demo.lastChallengeValue);
  }

  async function simulateDriverFinalize() {
    if (!demo.lastResponseValue) {
      return;
    }
    await processScannedValue(demo.lastResponseValue);
  }

  async function replayLastChallenge() {
    if (!demo.lastChallengeValue) {
      return;
    }
    await processScannedValue(demo.lastChallengeValue);
  }

  async function tamperLastChallenge() {
    if (!demo.lastChallengeValue) {
      return;
    }

    try {
      const payload = JSON.parse(demo.lastChallengeValue) as { payload_hash: string };
      payload.payload_hash = `${payload.payload_hash.slice(0, -1)}0`;
      await processScannedValue(JSON.stringify(payload));
    } catch {
      setDemo((current) => ({
        ...current,
        errorCode: 'POD_ERR_TAMPERED',
        status: 'Failed to tamper with the last challenge payload.',
      }));
    }
  }

  async function resetLedger() {
    const ledger = await clearPodLedger();
    const authState = await ensureAuthState();
    setDemo((current) => ({
      ...INITIAL_STATE,
      currentRole: authState.role,
      receipts: ledger.receipts,
      status: 'PoD ledger reset for a fresh demo run.',
      usedNonces: ledger.usedNonces,
    }));
  }

  return {
    ...demo,
    receiptChain,
    generateDriverQr,
    processScannedValue,
    replayLastChallenge,
    resetLedger,
    setDeliveryId: (value: string) =>
      setDemo((current) => ({
        ...current,
        deliveryId: value,
      })),
    setPayloadSummary: (value: string) =>
      setDemo((current) => ({
        ...current,
        payloadSummary: value,
      })),
    setScannerOpen: (open: boolean) =>
      setDemo((current) => ({
        ...current,
        scannerOpen: open,
      })),
    simulateDriverFinalize,
    simulateRecipientScan,
    tamperLastChallenge,
  };
}
