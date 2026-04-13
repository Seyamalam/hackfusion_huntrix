import { create } from '@bufbuild/protobuf';
import { useEffect, useRef, useState } from 'react';
import { NativeModules, PermissionsAndroid } from 'react-native';
import type { EmitterSubscription } from 'react-native';
import type { Device, WifiP2pInfo } from 'react-native-wifi-p2p';
import {
  ExchangeBundleResponseSchema,
  PullPendingResponseSchema,
  type ExchangeBundleRequest,
  type PullPendingRequest,
} from '@/src/gen/sync_pb';
import { createDeviceId } from '@/src/features/auth/auth-utils';
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
import {
  decodePeerPacket,
  encodeDeltaPacket,
  encodeExchangeBundleResponsePacket,
  encodeHandshakePacket,
  encodePullPendingRequestPacket,
  encodePullPendingResponsePacket,
} from '@/src/features/sync-demo/sync-protobuf-wire';
import type { PodReceipt } from '@/src/features/pod/pod-types';
import type { HandoffOwnershipRecord } from '@/src/features/fleet/handoff-types';
import { readHandoffRecords, writeHandoffRecords } from '@/src/features/fleet/handoff-storage';
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

type UseWifiDirectOptions = {
  backgroundPollEnabled?: boolean;
  backgroundPollIntervalSeconds?: number;
};

type WifiDirectState = {
  backgroundPollCount: number;
  backgroundPollingEnabled: boolean;
  backgroundPollingIntervalSeconds: number;
  connectionInfo: WifiP2pInfo | null;
  error: string | null;
  groupInfo: {
    networkName: string;
    ownerDeviceAddress: string;
    passphrase: string;
  } | null;
  evidence: {
    exchangeRequestSeen: boolean;
    exchangeResponseSeen: boolean;
    handshakeReceived: boolean;
    handshakeSent: boolean;
    lastCorrelationId: string | null;
    lastRpcDirection: 'inbound' | 'outbound' | null;
    lastRpcMethod: string | null;
    pullPendingRequestSeen: boolean;
    pullPendingResponseSeen: boolean;
  };
  isInitialized: boolean;
  isReady: boolean;
  isReceiving: boolean;
  isScanning: boolean;
  lastHandshakeReplica: string | null;
  lastPeerAddress: string | null;
  deliveryReceipts: PodReceipt[];
  handoffRecords: HandoffOwnershipRecord[];
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
  backgroundPollCount: 0,
  backgroundPollingEnabled: false,
  backgroundPollingIntervalSeconds: 5,
  connectionInfo: null,
  error: null,
  groupInfo: null,
  evidence: {
    exchangeRequestSeen: false,
    exchangeResponseSeen: false,
    handshakeReceived: false,
    handshakeSent: false,
    lastCorrelationId: null,
    lastRpcDirection: null,
    lastRpcMethod: null,
    pullPendingRequestSeen: false,
    pullPendingResponseSeen: false,
  },
  isInitialized: false,
  isReady: process.env.EXPO_OS === 'android',
  isReceiving: false,
  isScanning: false,
  lastHandshakeReplica: null,
  lastPeerAddress: null,
  deliveryReceipts: [],
  handoffRecords: [],
  localInventory: createSeedInventoryItem(),
  messages: [],
  peers: [],
  peerClocks: {},
  replicaId: 'android-peer',
  sessionSummary: null,
  transportNote:
    'Wi-Fi Direct currently carries protobuf SyncService RPC frames over native sockets using react-native-wifi-p2p; full HTTP/2 gRPC on-device still needs deeper native support.',
};

export function useWifiDirect(options: UseWifiDirectOptions = {}) {
  const subscriptionsRef = useRef<EmitterSubscription[]>([]);
  const stopReceivingRef = useRef<(() => void) | null>(null);
  const moduleRef = useRef<WifiDirectModule | null>(null);
  const processedOperationIdsRef = useRef<Set<string>>(new Set());
  const [state, setState] = useState<WifiDirectState>(INITIAL_STATE);
  const stateRef = useRef<WifiDirectState>(INITIAL_STATE);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    setState((current) => ({
      ...current,
      backgroundPollingEnabled: options.backgroundPollEnabled ?? false,
      backgroundPollingIntervalSeconds: options.backgroundPollIntervalSeconds ?? 5,
    }));
  }, [options.backgroundPollEnabled, options.backgroundPollIntervalSeconds]);

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
    Promise.all([
      readReplicaId(),
      readLocalInventory(),
      readPeerClocks(),
      readPodReceipts(),
      readHandoffRecords(),
    ]).then(
      ([replicaId, localInventory, peerClocks, deliveryReceipts, handoffRecords]) => {
        if (!active) {
          return;
        }
        setState((current) => ({
          ...current,
          deliveryReceipts,
          handoffRecords,
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
        void import('react-native-wifi-p2p')
          .then((wifiDirect) => {
            wifiDirect.stopReceivingMessage();
            return wifiDirect.removeGroup().catch(() => undefined);
          })
          .catch(() => undefined);
      }
    };
  }, []);

  useEffect(() => {
    if (!options.backgroundPollEnabled || !state.lastPeerAddress || !state.isInitialized) {
      return;
    }

    const intervalMs = Math.max(1000, Math.round((options.backgroundPollIntervalSeconds ?? 5) * 1000));
    const handle = setInterval(() => {
      if (!stateRef.current.connectionInfo?.groupFormed || !stateRef.current.lastPeerAddress) {
        return;
      }
      void sendPullPendingInternal(stateRef.current.lastPeerAddress, 'background');
    }, intervalMs);

    return () => clearInterval(handle);
  }, [options.backgroundPollEnabled, options.backgroundPollIntervalSeconds, state.isInitialized, state.lastPeerAddress]);

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
      stopReceivingRef.current = startReceivingLoop(wifiDirect);

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
      await wifiDirect.connectWithConfig({
        deviceAddress,
        groupOwnerIntent: 0,
      });
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

  async function createGroup() {
    try {
      const wifiDirect = await getWifiDirectModule(moduleRef);
      await wifiDirect.createGroup();
      const [connectionInfo, groupInfo] = await Promise.all([
        wifiDirect.getConnectionInfo().catch(() => null),
        wifiDirect.getGroupInfo().catch(() => null),
      ]);
      setState((current) => ({
        ...current,
        connectionInfo,
        error: null,
        groupInfo: groupInfo
          ? {
              networkName: groupInfo.networkName,
              ownerDeviceAddress: groupInfo.owner?.deviceAddress ?? 'unknown',
              passphrase: groupInfo.passphrase,
            }
          : null,
        messages: ['local: Wi-Fi Direct group created', ...current.messages].slice(0, 8),
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: formatWifiDirectError(error, 'Failed to create Wi-Fi Direct group.'),
      }));
    }
  }

  async function removeGroup() {
    try {
      const wifiDirect = await getWifiDirectModule(moduleRef);
      await wifiDirect.removeGroup();
      const connectionInfo = await wifiDirect.getConnectionInfo().catch(() => null);
      setState((current) => ({
        ...current,
        connectionInfo,
        error: null,
        groupInfo: null,
        messages: ['local: Wi-Fi Direct group removed', ...current.messages].slice(0, 8),
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: formatWifiDirectError(error, 'Failed to remove Wi-Fi Direct group.'),
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

    const correlationId = createDeviceId();
    const payload = encodeHandshakePacket(
      buildHandshake(state.replicaId, state.localInventory.vector_clock),
      correlationId,
    );

    try {
      const wifiDirect = await getWifiDirectModule(moduleRef);
      await wifiDirect.sendMessageTo(payload, deviceAddress);
      setState((current) => ({
        ...current,
        evidence: {
          ...current.evidence,
          handshakeSent: true,
          lastCorrelationId: correlationId,
          lastRpcDirection: 'outbound',
          lastRpcMethod: 'MeshHandshake',
        },
        error: null,
        lastPeerAddress: deviceAddress,
        messages: [
          `to ${deviceAddress}: mesh handshake sent (${correlationId.slice(0, 8)})`,
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
    const correlationId = createDeviceId();
    const payload = encodeDeltaPacket(
      buildDeltaBundle(
        state.replicaId,
        targetReplica,
        changedRecords,
        state.deliveryReceipts,
        state.handoffRecords,
      ),
      correlationId,
    );

    try {
      const wifiDirect = await getWifiDirectModule(moduleRef);
      await wifiDirect.sendMessageTo(payload, deviceAddress);
      setState((current) => ({
        ...current,
        evidence: {
          ...current.evidence,
          exchangeRequestSeen: true,
          lastCorrelationId: correlationId,
          lastRpcDirection: 'outbound',
          lastRpcMethod: 'SyncService.ExchangeBundle',
        },
        error: null,
        lastPeerAddress: deviceAddress,
        messages: [
          `to ${deviceAddress}: ExchangeBundle request sent (${correlationId.slice(0, 8)})`,
          ...current.messages,
        ].slice(0, 8),
        sessionSummary: {
          accepted_operation_count: 0,
          bytes_estimate: payload.length / 2,
          conflict_count: 0,
          merged_count: 0,
          pending_envelope_count: 0,
          record_count: changedRecords.length,
          rejected_operation_count: 0,
          receipt_count: state.deliveryReceipts.length,
          handoff_count: state.handoffRecords.length,
        },
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : 'Failed to send Wi-Fi Direct delta bundle.',
      }));
    }
  }

  async function sendPullPending(deviceAddress: string) {
    await sendPullPendingInternal(deviceAddress, 'manual');
  }

  async function sendPullPendingInternal(deviceAddress: string, source: 'background' | 'manual') {
    const role = (await readRole()) ?? 'field_volunteer';
    if (!canPerform(role, 'send_sync')) {
      if (source === 'manual') {
        setState((current) => ({
          ...current,
          error: `Role ${role} cannot pull pending sync messages.`,
        }));
      }
      return;
    }

    const correlationId = createDeviceId();
    const payload = encodePullPendingRequestPacket(state.replicaId, 16, correlationId);

    try {
      const wifiDirect = await getWifiDirectModule(moduleRef);
      await wifiDirect.sendMessageTo(payload, deviceAddress);
      setState((current) => ({
        ...current,
        backgroundPollCount:
          source === 'background' ? current.backgroundPollCount + 1 : current.backgroundPollCount,
        evidence: {
          ...current.evidence,
          lastCorrelationId: correlationId,
          lastRpcDirection: 'outbound',
          lastRpcMethod: 'SyncService.PullPending',
          pullPendingRequestSeen: true,
        },
        error: null,
        lastPeerAddress: deviceAddress,
        messages: [
          `to ${deviceAddress}: ${source === 'background' ? 'background ' : ''}PullPending request sent (${correlationId.slice(0, 8)})`,
          ...current.messages,
        ].slice(0, 8),
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : 'Failed to request pending sync payloads.',
      }));
    }
  }

  return {
    ...state,
    connectToPeer,
    createGroup,
    discoverPeers,
    initializeTransport,
    setPriority,
    incrementQuantity,
    decrementQuantity,
    removeGroup,
    sendDeltaBundle,
    sendHandshake,
    sendPullPending,
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

  async function handleIncomingPayload(fromAddress: string, payload: unknown) {
    if (typeof payload !== 'string') {
      setState((current) => ({
        ...current,
        messages: [`from ${fromAddress}: received unsupported payload`, ...current.messages].slice(0, 8),
      }));
      return;
    }

    const decoded = decodePeerPacket(payload);
    if (!decoded) {
      setState((current) => ({
        ...current,
        messages: [`from ${fromAddress}: invalid protobuf packet`, ...current.messages].slice(0, 8),
      }));
      return;
    }

    if (decoded.kind === 'handshake') {
      const handshake: SyncHandshake = decoded.handshake;
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
          evidence: {
            ...current.evidence,
            handshakeReceived: true,
            lastCorrelationId: decoded.correlationId,
            lastRpcDirection: 'inbound',
            lastRpcMethod: 'MeshHandshake',
          },
          lastHandshakeReplica: handshake.replica_id,
          lastPeerAddress: fromAddress,
          peerClocks: nextPeerClocks,
          messages: [
            `from ${fromAddress}: mesh handshake from ${handshake.replica_id}`,
            ...current.messages,
          ].slice(0, 8),
        };
      });
      return;
    }

    if (decoded.kind === 'exchange_request') {
      const bundle: SyncDeltaBundle = decoded.bundle;
      const snapshot = stateRef.current;
      const result = applyDeltaBundle(
        snapshot.localInventory,
        bundle,
        snapshot.deliveryReceipts,
        snapshot.handoffRecords,
      );
      const exchangeResponse = buildExchangeBundleResponse(decoded.request, snapshot.replicaId);
      const nextPeerClocks = {
        ...snapshot.peerClocks,
        [fromAddress]: {
          knownClock:
            bundle.records[0]?.vector_clock ?? snapshot.peerClocks[fromAddress]?.knownClock ?? {},
          replicaId: bundle.source_replica,
        },
      };

      persistLocalInventory(result.item);
      void writePodReceipts(result.receipts);
      void writeHandoffRecords(result.handoffRecords);
      void writePeerClocks(nextPeerClocks);
      await sendRpcResponse(fromAddress, encodeExchangeBundleResponsePacket(exchangeResponse, decoded.correlationId));

      setState((current) => ({
        ...current,
        deliveryReceipts: result.receipts,
        handoffRecords: result.handoffRecords,
        evidence: {
          ...current.evidence,
          exchangeRequestSeen: true,
          lastCorrelationId: decoded.correlationId,
          lastRpcDirection: 'inbound',
          lastRpcMethod: 'SyncService.ExchangeBundle',
        },
        lastPeerAddress: fromAddress,
        localInventory: result.item,
        messages: [
          `from ${fromAddress}: ExchangeBundle request applied (${exchangeResponse.acceptedOperationIds.length} accepted)`,
          ...current.messages,
        ].slice(0, 8),
        peerClocks: nextPeerClocks,
        sessionSummary: {
              ...result.summary,
              accepted_operation_count: exchangeResponse.acceptedOperationIds.length,
              pending_envelope_count: exchangeResponse.pendingEnvelopeIds.length,
              rejected_operation_count: exchangeResponse.rejectedOperationIds.length,
            },
      }));
      return;
    }

    if (decoded.kind === 'exchange_response') {
      setState((current) => ({
        ...current,
        evidence: {
          ...current.evidence,
          exchangeResponseSeen: true,
          lastCorrelationId: decoded.correlationId,
          lastRpcDirection: 'inbound',
          lastRpcMethod: 'SyncService.ExchangeBundle',
        },
        messages: [
          `from ${fromAddress}: ExchangeBundle response accepted=${decoded.response.acceptedOperationIds.length} rejected=${decoded.response.rejectedOperationIds.length}`,
          ...current.messages,
        ].slice(0, 8),
        sessionSummary: current.sessionSummary
          ? {
              ...current.sessionSummary,
              accepted_operation_count: decoded.response.acceptedOperationIds.length,
              pending_envelope_count: decoded.response.pendingEnvelopeIds.length,
              rejected_operation_count: decoded.response.rejectedOperationIds.length,
            }
          : null,
      }));
      return;
    }

    if (decoded.kind === 'pull_pending_request') {
      const response = create(PullPendingResponseSchema, {
        envelopes: [],
      });
      await sendRpcResponse(fromAddress, encodePullPendingResponsePacket(response, decoded.correlationId));
      setState((current) => ({
        ...current,
        evidence: {
          ...current.evidence,
          lastCorrelationId: decoded.correlationId,
          lastRpcDirection: 'inbound',
          lastRpcMethod: 'SyncService.PullPending',
          pullPendingRequestSeen: true,
        },
        messages: [`from ${fromAddress}: PullPending request answered with 0 envelopes`, ...current.messages].slice(0, 8),
      }));
      return;
    }

    if (decoded.kind === 'pull_pending_response') {
      setState((current) => ({
        ...current,
        evidence: {
          ...current.evidence,
          lastCorrelationId: decoded.correlationId,
          lastRpcDirection: 'inbound',
          lastRpcMethod: 'SyncService.PullPending',
          pullPendingResponseSeen: true,
        },
        messages: [
          `from ${fromAddress}: PullPending response returned ${decoded.response.envelopes.length} envelopes`,
          ...current.messages,
        ].slice(0, 8),
        sessionSummary: current.sessionSummary
          ? {
              ...current.sessionSummary,
              pending_envelope_count: decoded.response.envelopes.length,
            }
          : {
              accepted_operation_count: 0,
              bytes_estimate: 0,
              conflict_count: 0,
              merged_count: 0,
              pending_envelope_count: decoded.response.envelopes.length,
              record_count: 0,
              rejected_operation_count: 0,
              receipt_count: 0,
              handoff_count: 0,
            },
      }));
      return;
    }
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

  function buildExchangeBundleResponse(request: ExchangeBundleRequest, replicaId: string) {
    const acceptedOperationIds: string[] = [];
    const rejectedOperationIds: string[] = [];

    for (const operation of request.bundle?.operations ?? []) {
      if (processedOperationIdsRef.current.has(operation.operationId)) {
        rejectedOperationIds.push(operation.operationId);
        continue;
      }
      processedOperationIdsRef.current.add(operation.operationId);
      acceptedOperationIds.push(operation.operationId);
    }

    return create(ExchangeBundleResponseSchema, {
      replicaId,
      acceptedOperationIds,
      rejectedOperationIds,
      pendingEnvelopeIds: [],
    });
  }

  async function sendRpcResponse(deviceAddress: string, payload: string) {
    try {
      const wifiDirect = await getWifiDirectModule(moduleRef);
      await wifiDirect.sendMessageTo(payload, deviceAddress);
    } catch (error) {
      setState((current) => ({
        ...current,
        error: formatWifiDirectError(error, 'Failed to send sync RPC response.'),
      }));
    }
  }

  function startReceivingLoop(wifiDirect: WifiDirectModule) {
    let active = true;

    const listen = async () => {
      while (active) {
        try {
          const incoming = await wifiDirect.receiveMessage({ meta: true });
          if (!active) {
            return;
          }

          if (incoming && typeof incoming === 'object' && 'fromAddress' in incoming && 'message' in incoming) {
            await handleIncomingPayload(
              String((incoming as { fromAddress: unknown }).fromAddress),
              (incoming as { message: unknown }).message,
            );
          }
        } catch (error) {
          if (!active) {
            return;
          }

          setState((current) => ({
            ...current,
            error: formatWifiDirectError(error, 'Failed while listening for Wi-Fi Direct messages.'),
          }));
          return;
        }
      }
    };

    void listen();

    return () => {
      active = false;
      wifiDirect.stopReceivingMessage();
    };
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
  return Boolean((NativeModules as Record<string, unknown>).WiFiP2PManagerModule);
}

function persistLocalInventory(item: InventoryItem) {
  void writeLocalInventory(item);
  return item;
}

type WifiDirectModule = {
  connectWithConfig: (config: { deviceAddress: string; groupOwnerIntent?: number }) => Promise<void>;
  connect: (deviceAddress: string) => Promise<void>;
  createGroup: () => Promise<void>;
  getAvailablePeers: () => Promise<{ devices: Device[] }>;
  getConnectionInfo: () => Promise<WifiP2pInfo>;
  getGroupInfo: () => Promise<{
    networkName: string;
    owner: { deviceAddress: string };
    passphrase: string;
  }>;
  initialize: () => Promise<boolean>;
  receiveMessage: (props: { meta: boolean }) => Promise<unknown>;
  sendMessageTo: (message: string, address: string) => Promise<unknown>;
  removeGroup: () => Promise<void>;
  startDiscoveringPeers: () => Promise<string>;
  stopReceivingMessage: () => void;
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

  const module = await import('react-native-wifi-p2p');
  ref.current = {
    connectWithConfig: module.connectWithConfig,
    connect: module.connect,
    createGroup: module.createGroup,
    getAvailablePeers: module.getAvailablePeers,
    getConnectionInfo: module.getConnectionInfo,
    getGroupInfo: module.getGroupInfo,
    initialize: module.initialize,
    receiveMessage: module.receiveMessage,
    sendMessageTo: module.sendMessageTo,
    removeGroup: module.removeGroup,
    startDiscoveringPeers: module.startDiscoveringPeers,
    stopReceivingMessage: module.stopReceivingMessage,
    stopDiscoveringPeers: module.stopDiscoveringPeers,
    subscribeOnConnectionInfoUpdates: module.subscribeOnConnectionInfoUpdates,
    subscribeOnPeersUpdates: module.subscribeOnPeersUpdates,
  };
  return ref.current;
}

function formatWifiDirectError(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    const code = 'code' in error ? String((error as { code: unknown }).code) : null;
    const message = String((error as { message: unknown }).message);
    return code ? `${fallback} [${code}] ${message}` : `${fallback} ${message}`;
  }
  if (error instanceof Error) {
    return `${fallback} ${error.message}`;
  }
  return fallback;
}
