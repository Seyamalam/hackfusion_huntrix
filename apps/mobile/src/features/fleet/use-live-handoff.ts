import { useEffect, useMemo, useState } from 'react';

import { canPerform } from '@/src/features/auth/auth-rbac';
import { changeRole, ensureAuthState } from '@/src/features/auth/auth-service';
import type { AuthRole } from '@/src/features/auth/auth-types';
import type { FleetOrchestrationStatusResponse } from '@/src/features/dashboard/dashboard-api';
import { readHandoffRecords, resetHandoffRecords, writeHandoffRecords } from '@/src/features/fleet/handoff-storage';
import { summarizeCurrentOwner, upsertHandoffRecord } from '@/src/features/fleet/handoff-ledger';
import type { HandoffOwnershipRecord } from '@/src/features/fleet/handoff-types';
import { getPodLedgerState, createChallengeQr, countersignChallenge, finalizeReceipt } from '@/src/features/pod/pod-service';
import type { PodReceipt } from '@/src/features/pod/pod-types';
import { readReplicaId } from '@/src/features/wifi-direct/wifi-direct-storage';

type RendezvousScenario = FleetOrchestrationStatusResponse['status']['rendezvous'][number];

type LiveHandoffState = {
  currentRole: AuthRole | null;
  handoffRecords: HandoffOwnershipRecord[];
  isBusy: boolean;
  lastChallengeValue: string | null;
  lastResponseValue: string | null;
  receipts: PodReceipt[];
  selectedScenarioId: string | null;
  status: string;
};

const INITIAL_STATE: LiveHandoffState = {
  currentRole: null,
  handoffRecords: [],
  isBusy: false,
  lastChallengeValue: null,
  lastResponseValue: null,
  receipts: [],
  selectedScenarioId: null,
  status: 'Mark boat arrival, generate the handoff challenge, let the drone countersign, then finalize ownership transfer.',
};

export function useLiveHandoff(scenarios: RendezvousScenario[]) {
  const [state, setState] = useState<LiveHandoffState>(INITIAL_STATE);

  useEffect(() => {
    let active = true;

    Promise.all([ensureAuthState(), readHandoffRecords(), getPodLedgerState()]).then(
      ([authState, handoffRecords, podLedger]) => {
        if (!active) {
          return;
        }

        setState((current) => ({
          ...current,
          currentRole: authState.role,
          handoffRecords,
          receipts: podLedger.receipts,
          selectedScenarioId: current.selectedScenarioId ?? scenarios[0]?.scenario_id ?? null,
        }));
      },
    );

    return () => {
      active = false;
    };
  }, [scenarios]);

  const selectedScenario =
    scenarios.find((scenario) => scenario.scenario_id === state.selectedScenarioId) ?? scenarios[0] ?? null;

  const selectedScenarioRecords = useMemo(
    () =>
      selectedScenario
        ? state.handoffRecords.filter((record) => record.scenario_id === selectedScenario.scenario_id)
        : [],
    [selectedScenario, state.handoffRecords],
  );

  const currentOwner = selectedScenario
    ? summarizeCurrentOwner(state.handoffRecords, selectedScenario.scenario_id)
    : 'boat-convoy';

  async function markBoatArrival() {
    if (!selectedScenario) {
      return;
    }

    await withBusy(async () => {
      const [replicaId, role] = await Promise.all([
        readReplicaId(),
        switchRole('field_volunteer'),
      ]);
      const records = upsertHandoffRecord(state.handoffRecords, {
        cargoId: cargoIdForScenario(selectedScenario),
        deliveryId: deliveryIdForScenario(selectedScenario),
        fromOwner: 'boat-convoy',
        fromRole: role,
        handoffId: handoffIdForScenario(selectedScenario),
        lastWriter: replicaId,
        podReceiptHash: '',
        podReceiptId: '',
        rendezvousLabel: selectedScenario.label,
        rendezvousNodeId: selectedScenario.best_meeting_node_id,
        scenarioId: selectedScenario.scenario_id,
        status: 'boat_arrived',
        toOwner: 'drone-flight',
        toRole: 'drone_operator',
      });

      await writeHandoffRecords(records);
      setState((current) => ({
        ...current,
        currentRole: role,
        handoffRecords: records,
        status: `Boat arrival recorded at ${selectedScenario.best_meeting_node_id}.`,
      }));
    });
  }

  async function generateHandoffChallenge() {
    if (!selectedScenario) {
      return;
    }

    await withBusy(async () => {
      const [replicaId, role] = await Promise.all([
        readReplicaId(),
        switchRole('field_volunteer'),
      ]);
      if (!canPerform(role, 'generate_pod')) {
        setState((current) => ({
          ...current,
          currentRole: role,
          status: `Role ${role} cannot generate handoff receipts.`,
        }));
        return;
      }

      const result = await createChallengeQr(
        deliveryIdForScenario(selectedScenario),
        payloadSummaryForScenario(selectedScenario),
      );

      const records = upsertHandoffRecord(state.handoffRecords, {
        cargoId: cargoIdForScenario(selectedScenario),
        deliveryId: deliveryIdForScenario(selectedScenario),
        fromOwner: 'boat-convoy',
        fromRole: role,
        handoffId: handoffIdForScenario(selectedScenario),
        lastWriter: replicaId,
        podReceiptHash: '',
        podReceiptId: '',
        rendezvousLabel: selectedScenario.label,
        rendezvousNodeId: selectedScenario.best_meeting_node_id,
        scenarioId: selectedScenario.scenario_id,
        status: 'challenge_generated',
        toOwner: 'drone-flight',
        toRole: 'drone_operator',
      });

      await writeHandoffRecords(records);
      setState((current) => ({
        ...current,
        currentRole: role,
        handoffRecords: records,
        lastChallengeValue: result.value?.qrValue ?? current.lastChallengeValue,
        status: result.message,
      }));
    });
  }

  async function droneCountersign() {
    if (!state.lastChallengeValue || !selectedScenario) {
      return;
    }
    const challengeValue = state.lastChallengeValue;

    await withBusy(async () => {
      const [replicaId, role] = await Promise.all([
        readReplicaId(),
        switchRole('drone_operator'),
      ]);

      const result = await countersignChallenge(challengeValue);
      const nextReceiptId = result.value?.payload.receipt_id ?? '';
      const records = upsertHandoffRecord(state.handoffRecords, {
        cargoId: cargoIdForScenario(selectedScenario),
        deliveryId: deliveryIdForScenario(selectedScenario),
        fromOwner: 'boat-convoy',
        fromRole: 'field_volunteer',
        handoffId: handoffIdForScenario(selectedScenario),
        lastWriter: replicaId,
        podReceiptHash: '',
        podReceiptId: nextReceiptId,
        rendezvousLabel: selectedScenario.label,
        rendezvousNodeId: selectedScenario.best_meeting_node_id,
        scenarioId: selectedScenario.scenario_id,
        status: 'countersigned',
        toOwner: 'drone-flight',
        toRole: role,
      });

      await writeHandoffRecords(records);
      setState((current) => ({
        ...current,
        currentRole: role,
        handoffRecords: records,
        lastResponseValue: result.value?.qrValue ?? current.lastResponseValue,
        status: result.message,
      }));
    });
  }

  async function finalizeOwnershipTransfer() {
    if (!state.lastResponseValue || !selectedScenario) {
      return;
    }
    const responseValue = state.lastResponseValue;

    await withBusy(async () => {
      const [replicaId, role] = await Promise.all([
        readReplicaId(),
        switchRole('field_volunteer'),
      ]);

      const result = await finalizeReceipt(responseValue);
      const podLedger = await getPodLedgerState();
      const nextReceipt = result.value?.receipt;
      if (!nextReceipt) {
        setState((current) => ({
          ...current,
          currentRole: role,
          receipts: podLedger.receipts,
          status: result.message,
        }));
        return;
      }

      const records = upsertHandoffRecord(state.handoffRecords, {
        cargoId: cargoIdForScenario(selectedScenario),
        deliveryId: deliveryIdForScenario(selectedScenario),
        fromOwner: 'boat-convoy',
        fromRole: 'field_volunteer',
        handoffId: handoffIdForScenario(selectedScenario),
        lastWriter: replicaId,
        podReceiptHash: nextReceipt.receipt_hash,
        podReceiptId: nextReceipt.receipt_id,
        rendezvousLabel: selectedScenario.label,
        rendezvousNodeId: selectedScenario.best_meeting_node_id,
        scenarioId: selectedScenario.scenario_id,
        status: 'ownership_transferred',
        toOwner: 'drone-flight',
        toRole: 'drone_operator',
      });

      await writeHandoffRecords(records);
      setState((current) => ({
        ...current,
        currentRole: role,
        handoffRecords: records,
        receipts: result.value?.receipts ?? podLedger.receipts,
        status: `${result.message} Ownership transferred to drone-flight.`,
      }));
    });
  }

  async function clearHandoffLedger() {
    await resetHandoffRecords();
    setState((current) => ({
      ...current,
      handoffRecords: [],
      lastChallengeValue: null,
      lastResponseValue: null,
      status: 'Live handoff ledger reset.',
    }));
  }

  return {
    ...state,
    clearHandoffLedger,
    currentOwner,
    droneCountersign,
    finalizeOwnershipTransfer,
    generateHandoffChallenge,
    markBoatArrival,
    selectedScenario,
    selectedScenarioRecords,
    setSelectedScenarioId: (selectedScenarioId: string) =>
      setState((current) => ({
        ...current,
        selectedScenarioId,
      })),
  };

  async function switchRole(targetRole: AuthRole) {
    const authState = await ensureAuthState();
    if (authState.role === targetRole) {
      return authState.role;
    }

    const nextState = await changeRole(authState, targetRole);
    return nextState.role;
  }

  async function withBusy(run: () => Promise<void>) {
    setState((current) => ({
      ...current,
      isBusy: true,
    }));

    try {
      await run();
    } finally {
      setState((current) => ({
        ...current,
        isBusy: false,
      }));
    }
  }
}

function handoffIdForScenario(scenario: RendezvousScenario) {
  return `handoff-${scenario.scenario_id}`;
}

function deliveryIdForScenario(scenario: RendezvousScenario) {
  return `DELTA-${scenario.scenario_id.toUpperCase()}`;
}

function cargoIdForScenario(scenario: RendezvousScenario) {
  return `cargo-${scenario.scenario_id}`;
}

function payloadSummaryForScenario(scenario: RendezvousScenario) {
  return [
    `handoff=${scenario.label}`,
    `meeting=${scenario.best_meeting_node_id}`,
    `boat=${scenario.boat_node_id}`,
    `drone_base=${scenario.drone_base_node_id}`,
    `destination=${scenario.destination_node_id}`,
    `payload_kg=${scenario.payload_kg}`,
  ].join(' | ');
}
