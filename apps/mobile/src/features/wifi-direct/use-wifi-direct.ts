import { useEffect, useRef, useState } from 'react';
import { NativeModules, PermissionsAndroid } from 'react-native';
import type { EmitterSubscription } from 'react-native';
import type { Device, WifiP2pInfo } from 'rn-wifi-p2p';
import {
  applyDeltaBundle,
  buildDeltaBundle,
  buildHandshake,
  createSeedInventoryItem,
  filterChangedRecords,
  mutateLocalInventory,
  type InventoryItem,
  type SyncDeltaBundle,
  type SyncHandshake,
  type SyncSessionSummary,
} from '@/src/features/sync-demo/sync-protocol';
import type { PodReceipt } from '@/src/features/pod/pod-types';
import {
  readLocalInventory,
  readPeerClocks,
  readReplicaId,
  writeLocalInventory,
  writePeerClocks,
} from '@/src/features/wifi-direct/wifi-direct-storage';
import { readPodReceipts, writePodReceipts } from '@/src/features/pod/pod-storage';
import { canPerform } from '@/src/features/auth/auth-rbac';
import { readRole } from '@/src/features/auth/auth-storage';

type WifiDirectState = {
  connectionInfo: WifiP2pInfo | null;
  error: string | null;
  isInitialized: boolean;
  isReady: boolean;
  isReceiving: boolean;
  isScanning: boolean;
  lastHandshakeReplica: string | null;
  lastPeerAddress: string | null;
  deliveryReceipts: PodReceipt[];
  localInventory: InventoryItem;
  messages: string[];
  peers: Device[];
  peerClocks: Record<
    string,
    {
      knownClock: Record<string, number>;
      replicaId: string | null;
    }
  >;
  replicaId: string;
  sessionSummary: SyncSessionSummary | null;
  transportNote: string;
};

const INITIAL_STATE: WifiDirectState = {
  connectionInfo: null,
  error: null,
  isInitialized: false,
  isReady: process.env.EXPO_OS === 'android',
  isReceiving: false,
  isScanning: false,
  lastHandshakeReplica: null,
  lastPeerAddress: null,
  deliveryReceipts: [],
  localInventory: createSeedInventoryItem(),
  messages: [],
  peers: [],
  peerClocks: {},
  replicaId: 'android-peer',
  sessionSummary: null,
  transportNote:
    'Wi-Fi Direct is the first credible path for actual phone-to-phone delta sync in this stack.',
};

export function useWifiDirect() {
  const subscriptionsRef = useRef<EmitterSubscription[]>([]);
  const stopReceivingRef = useRef<(() => void) | null>(null);
  const moduleRef = useRef<WifiDirectModule | null>(null);
  const [state, setState] = useState<WifiDirectState>(INITIAL_STATE);

  useEffect(() => {
    if (process.env.EXPO_OS !== 'android') {
      setState((current) => ({
        ...current,
        error: 'Wi-Fi Direct transport is Android-only.',
        isReady: false,
      }));
      return;
    }

    if (!hasNativeWifiDirectModule()) {
      setState((current) => ({
        ...current,
        error: 'Wi-Fi Direct native module unavailable. Use a development build on Android.',
        isReady: false,
      }));
      return;
    }

    let active = true;
    Promise.all([readReplicaId(), readLocalInventory(), readPeerClocks(), readPodReceipts()]).then(
      ([replicaId, localInventory, peerClocks, deliveryReceipts]) => {
        if (!active) {
          return;
        }
        setState((current) => ({
          ...current,
          deliveryReceipts,
          localInventory,
          peerClocks,
          replicaId,
        }));
      },
    );

    return () => {
      active = false;
      for (const subscription of subscriptionsRef.current) {
        subscription.remove();
      }
      subscriptionsRef.current = [];
      stopReceivingRef.current?.();
      if (hasNativeWifiDirectModule()) {
        void import('rn-wifi-p2p')
          .then((wifiDirect) => wifiDirect.stop())
          .catch(() => undefined);
      }
    };
  }, []);

  async function initializeTransport() {
    if (!state.isReady) {
      return;
    }

    const granted = await requestWifiDirectPermissions();
    if (!granted) {
      setState((current) => ({
        ...current,
        error: 'Wi-Fi Direct permissions were denied.',
      }));
      return;
    }

    try {
      const wifiDirect = await getWifiDirectModule(moduleRef);
      const initialized = await wifiDirect.initialize();
      const connectionInfo = await wifiDirect.getConnectionInfo().catch(() => null);

      for (const subscription of subscriptionsRef.current) {
        subscription.remove();
      }
      subscriptionsRef.current = [];
      subscriptionsRef.current.push(
        wifiDirect.subscribeOnPeersUpdates(({ devices }) => {
          setState((current) => ({
            ...current,
            peers: devices,
          }));
        }),
      );
      subscriptionsRef.current.push(
        wifiDirect.subscribeOnConnectionInfoUpdates((nextInfo) => {
          setState((current) => ({
            ...current,
            connectionInfo: nextInfo,
          }));
        }),
      );
      stopReceivingRef.current?.();
      stopReceivingRef.current = await wifiDirect.startReceivingMessage(
        { meta: true },
        (message) => {
          handleIncomingPayload(message.fromAddress, message.message);
        },
        { useJson: true },
      );

      setState((current) => ({
        ...current,
        connectionInfo,
        error: null,
        isInitialized: initialized,
        isReceiving: true,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : 'Failed to initialize Wi-Fi Direct.',
      }));
    }
  }

  async function discoverPeers() {
    try {
      const wifiDirect = await getWifiDirectModule(moduleRef);
      await wifiDirect.startDiscoveringPeers();
      const peerList = await wifiDirect.getAvailablePeers();
      setState((current) => ({
        ...current,
        error: null,
        isScanning: true,
        peers: peerList.devices,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : 'Failed to discover Wi-Fi Direct peers.',
      }));
    }
  }

  async function stopDiscovery() {
    await moduleRef.current?.stopDiscoveringPeers().catch(() => undefined);
    setState((current) => ({
      ...current,
      isScanning: false,
    }));
  }

  async function connectToPeer(deviceAddress: string) {
    try {
      const wifiDirect = await getWifiDirectModule(moduleRef);
      await wifiDirect.connect(deviceAddress);
      const connectionInfo = await wifiDirect.getConnectionInfo().catch(() => null);
      setState((current) => ({
        ...current,
        connectionInfo,
        error: null,
        lastPeerAddress: deviceAddress,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : 'Failed to connect to Wi-Fi Direct peer.',
      }));
    }
  }

  async function sendHandshake(deviceAddress: string) {
    const role = (await readRole()) ?? 'field_volunteer';
    if (!canPerform(role, 'send_sync')) {
      setState((current) => ({
        ...current,
        error: `Role ${role} cannot start a sync session.`,
      }));
      return;
    }

    const payload = JSON.stringify(
      buildHandshake(state.replicaId, state.localInventory.vector_clock),
    );

    try {
      const wifiDirect = await getWifiDirectModule(moduleRef);
      await wifiDirect.sendMessageTo(payload, deviceAddress);
      setState((current) => ({
        ...current,
        error: null,
        lastPeerAddress: deviceAddress,
        messages: [
          `to ${deviceAddress}: handshake sent`,
          ...current.messages,
        ].slice(0, 8),
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : 'Failed to send Wi-Fi Direct handshake.',
      }));
    }
  }

  async function sendDeltaBundle(deviceAddress: string) {
    const role = (await readRole()) ?? 'field_volunteer';
    if (!canPerform(role, 'send_sync')) {
      setState((current) => ({
        ...current,
        error: `Role ${role} cannot send sync bundles.`,
      }));
      return;
    }

    const targetReplica = state.peerClocks[deviceAddress]?.replicaId ?? state.lastHandshakeReplica ?? deviceAddress;
    const knownClock = state.peerClocks[deviceAddress]?.knownClock ?? {};
    const changedRecords = filterChangedRecords([state.localInventory], knownClock);
    const payload = JSON.stringify(
      buildDeltaBundle(state.replicaId, targetReplica, changedRecords, state.deliveryReceipts),
    );

    try {
      const wifiDirect = await getWifiDirectModule(moduleRef);
      await wifiDirect.sendMessageTo(payload, deviceAddress);
      setState((current) => ({
        ...current,
        error: null,
        lastPeerAddress: deviceAddress,
        messages: [`to ${deviceAddress}: delta bundle sent`, ...current.messages].slice(0, 8),
        sessionSummary: {
          bytes_estimate: payload.length,
          conflict_count: 0,
          merged_count: 0,
          record_count: changedRecords.length,
          receipt_count: state.deliveryReceipts.length,
        },
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : 'Failed to send Wi-Fi Direct delta bundle.',
      }));
    }
  }

  return {
    ...state,
    connectToPeer,
    discoverPeers,
    initializeTransport,
    setPriority,
    incrementQuantity,
    decrementQuantity,
    sendDeltaBundle,
    sendHandshake,
    stopDiscovery,
  };

  function incrementQuantity() {
    void mutateInventory(10);
  }

  function decrementQuantity() {
    void mutateInventory(-10);
  }

  function setPriority(priority: string) {
    void applyPriority(priority);
  }

  function handleIncomingPayload(fromAddress: string, payload: unknown) {
    if (!payload || typeof payload !== 'object' || !('kind' in payload)) {
      setState((current) => ({
        ...current,
        messages: [`from ${fromAddress}: received unsupported payload`, ...current.messages].slice(0, 8),
      }));
      return;
    }

    const kind = String((payload as { kind: string }).kind);
    if (kind === 'sync-handshake') {
      const handshake = payload as SyncHandshake;
      setState((current) => {
        const nextPeerClocks = {
          ...current.peerClocks,
          [fromAddress]: {
            knownClock: { ...handshake.vector_clock },
            replicaId: handshake.replica_id,
          },
        };
        void writePeerClocks(nextPeerClocks);
        return {
          ...current,
          lastHandshakeReplica: handshake.replica_id,
          lastPeerAddress: fromAddress,
          peerClocks: nextPeerClocks,
          messages: [
            `from ${fromAddress}: handshake from ${handshake.replica_id}`,
            ...current.messages,
          ].slice(0, 8),
        };
      });
      return;
    }

    if (kind === 'sync-delta') {
      const bundle = payload as SyncDeltaBundle;
      setState((current) => {
        const result = applyDeltaBundle(current.localInventory, bundle, current.deliveryReceipts);
        const nextPeerClocks = {
          ...current.peerClocks,
          [fromAddress]: {
            knownClock:
              bundle.records[0]?.vector_clock ?? current.peerClocks[fromAddress]?.knownClock ?? {},
            replicaId: bundle.source_replica,
          },
        };
        void writePeerClocks(nextPeerClocks);
        persistLocalInventory(result.item);
        void writePodReceipts(result.receipts);
        return {
          ...current,
          deliveryReceipts: result.receipts,
          lastPeerAddress: fromAddress,
          localInventory: result.item,
          messages: [
            `from ${fromAddress}: delta bundle applied`,
            ...current.messages,
          ].slice(0, 8),
          peerClocks: nextPeerClocks,
          sessionSummary: result.summary,
        };
      });
      return;
    }

    setState((current) => ({
      ...current,
      messages: [`from ${fromAddress}: unknown kind ${kind}`, ...current.messages].slice(0, 8),
    }));
  }

  async function mutateInventory(deltaQuantity: number) {
    const role = (await readRole()) ?? 'field_volunteer';
    if (!canPerform(role, 'mutate_inventory')) {
      setState((current) => ({
        ...current,
        error: `Role ${role} cannot mutate inventory records.`,
      }));
      return;
    }

    setState((current) => ({
      ...current,
      error: null,
      localInventory: persistLocalInventory(
        mutateLocalInventory(current.localInventory, current.replicaId, {
          deltaQuantity,
        }),
      ),
    }));
  }

  async function applyPriority(priority: string) {
    const role = (await readRole()) ?? 'field_volunteer';
    if (!canPerform(role, 'mutate_inventory')) {
      setState((current) => ({
        ...current,
        error: `Role ${role} cannot change inventory priority.`,
      }));
      return;
    }

    setState((current) => ({
      ...current,
      error: null,
      localInventory: persistLocalInventory(
        mutateLocalInventory(current.localInventory, current.replicaId, {
          priority,
        }),
      ),
    }));
  }
}

async function requestWifiDirectPermissions() {
  const permissions = [
    PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES,
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
  ].filter(Boolean);

  const result = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every((permission) => result[permission] === PermissionsAndroid.RESULTS.GRANTED);
}

function hasNativeWifiDirectModule() {
  return Boolean((NativeModules as Record<string, unknown>).RnWifiP2P);
}

function persistLocalInventory(item: InventoryItem) {
  void writeLocalInventory(item);
  return item;
}

type WifiDirectModule = {
  connect: (deviceAddress: string) => Promise<void>;
  getAvailablePeers: () => Promise<{ devices: Device[] }>;
  getConnectionInfo: () => Promise<WifiP2pInfo>;
  initialize: () => Promise<boolean>;
  sendMessageTo: (message: string, address: string) => Promise<unknown>;
  startDiscoveringPeers: () => Promise<void>;
  startReceivingMessage: (
    props?: { meta?: boolean },
    callback?: (message: { fromAddress: string; message: unknown }) => void,
    options?: { parse?: (message: string) => unknown; useJson?: boolean },
  ) => Promise<() => void>;
  stop: () => Promise<boolean>;
  stopDiscoveringPeers: () => Promise<void>;
  subscribeOnConnectionInfoUpdates: (callback: (data: WifiP2pInfo) => void) => EmitterSubscription;
  subscribeOnPeersUpdates: (callback: (data: { devices: Device[] }) => void) => EmitterSubscription;
};

async function getWifiDirectModule(
  ref: React.MutableRefObject<WifiDirectModule | null>,
) {
  if (ref.current) {
    return ref.current;
  }

  const module = await import('rn-wifi-p2p');
  ref.current = {
    connect: module.connect,
    getAvailablePeers: module.getAvailablePeers,
    getConnectionInfo: module.getConnectionInfo,
    initialize: module.initialize,
    sendMessageTo: module.sendMessageTo,
    startDiscoveringPeers: module.startDiscoveringPeers,
    startReceivingMessage: module.startReceivingMessage,
    stop: module.stop,
    stopDiscoveringPeers: module.stopDiscoveringPeers,
    subscribeOnConnectionInfoUpdates: module.subscribeOnConnectionInfoUpdates,
    subscribeOnPeersUpdates: module.subscribeOnPeersUpdates,
  };
  return ref.current;
}
