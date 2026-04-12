import { useEffect, useRef, useState } from 'react';
import { NativeModules, PermissionsAndroid } from 'react-native';
import type { EmitterSubscription } from 'react-native';
import {
  connect,
  getAvailablePeers,
  getConnectionInfo,
  initialize,
  sendMessageTo,
  startDiscoveringPeers,
  startReceivingMessage,
  stop,
  stopDiscoveringPeers,
  subscribeOnConnectionInfoUpdates,
  subscribeOnMessageReceived,
  subscribeOnPeersUpdates,
  type Device,
  type WifiP2pInfo,
} from 'rn-wifi-p2p';

type WifiDirectState = {
  connectionInfo: WifiP2pInfo | null;
  error: string | null;
  isInitialized: boolean;
  isReady: boolean;
  isReceiving: boolean;
  isScanning: boolean;
  messages: string[];
  peers: Device[];
  transportNote: string;
};

const INITIAL_STATE: WifiDirectState = {
  connectionInfo: null,
  error: null,
  isInitialized: false,
  isReady: process.env.EXPO_OS === 'android',
  isReceiving: false,
  isScanning: false,
  messages: [],
  peers: [],
  transportNote:
    'Wi-Fi Direct is the first credible path for actual phone-to-phone delta sync in this stack.',
};

export function useWifiDirect() {
  const subscriptionsRef = useRef<EmitterSubscription[]>([]);
  const stopReceivingRef = useRef<(() => void) | null>(null);
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

    return () => {
      for (const subscription of subscriptionsRef.current) {
        subscription.remove();
      }
      subscriptionsRef.current = [];
      stopReceivingRef.current?.();
      void stop();
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
      const initialized = await initialize();
      const connectionInfo = await getConnectionInfo().catch(() => null);

      for (const subscription of subscriptionsRef.current) {
        subscription.remove();
      }
      subscriptionsRef.current = [];
      subscriptionsRef.current.push(
        subscribeOnPeersUpdates(({ devices }) => {
          setState((current) => ({
            ...current,
            peers: devices,
          }));
        }),
      );
      subscriptionsRef.current.push(
        subscribeOnConnectionInfoUpdates((nextInfo) => {
          setState((current) => ({
            ...current,
            connectionInfo: nextInfo,
          }));
        }),
      );
      subscriptionsRef.current.push(
        subscribeOnMessageReceived((message) => {
          setState((current) => ({
            ...current,
            messages: [
              `from ${message.fromAddress}: ${message.message}`,
              ...current.messages,
            ].slice(0, 8),
          }));
        }),
      );

      stopReceivingRef.current?.();
      stopReceivingRef.current = await startReceivingMessage({ meta: true });

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
      await startDiscoveringPeers();
      const peerList = await getAvailablePeers();
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
    await stopDiscoveringPeers().catch(() => undefined);
    setState((current) => ({
      ...current,
      isScanning: false,
    }));
  }

  async function connectToPeer(deviceAddress: string) {
    try {
      await connect(deviceAddress);
      const connectionInfo = await getConnectionInfo().catch(() => null);
      setState((current) => ({
        ...current,
        connectionInfo,
        error: null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : 'Failed to connect to Wi-Fi Direct peer.',
      }));
    }
  }

  async function sendHandshake(deviceAddress: string) {
    const payload = JSON.stringify({
      deviceLabel: 'Huntrix Delta',
      kind: 'sync-handshake',
      lastSyncAt: new Date().toISOString(),
      replicaId: 'android-peer',
      vectorClock: { 'android-peer': 1 },
    });

    try {
      const result = await sendMessageTo(payload, deviceAddress);
      setState((current) => ({
        ...current,
        error: null,
        messages: [
          `to ${deviceAddress}: ${result.message}`,
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

  return {
    ...state,
    connectToPeer,
    discoverPeers,
    initializeTransport,
    sendHandshake,
    stopDiscovery,
  };
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
