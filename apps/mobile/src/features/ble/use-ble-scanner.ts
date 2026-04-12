import { useEffect, useRef, useState } from 'react';
import { NativeModules, PermissionsAndroid } from 'react-native';
import { BleManager, type Device } from 'react-native-ble-plx';

export type BlePeer = {
  id: string;
  localName: string;
  name: string;
  rssi: number | null;
};

type BleScannerState = {
  error: string | null;
  isReady: boolean;
  isScanning: boolean;
  peers: BlePeer[];
  transportNote: string;
  bleState: string;
};

const INITIAL_STATE: BleScannerState = {
  error: null,
  isReady: process.env.EXPO_OS !== 'web',
  isScanning: false,
  peers: [],
  transportNote:
    'BLE scanning validates native transport readiness, but full phone-to-phone sync still needs a peripheral or Wi-Fi Direct path.',
  bleState: 'Unknown',
};

export function useBleScanner() {
  const managerRef = useRef<BleManager | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<BleScannerState>(INITIAL_STATE);

  useEffect(() => {
    if (process.env.EXPO_OS === 'web') {
      setState((current) => ({
        ...current,
        error: 'BLE scanning is unavailable on web. Use a development build on a device.',
        isReady: false,
      }));
      return;
    }

    if (!hasNativeBleModule()) {
      setState((current) => ({
        ...current,
        error: 'BLE native module unavailable. Use a development build instead of Expo Go.',
        isReady: false,
        bleState: 'Unavailable',
      }));
      return;
    }

    let manager: BleManager;
    try {
      manager = new BleManager();
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : 'Failed to initialize BLE manager.',
        isReady: false,
        bleState: 'Unavailable',
      }));
      return;
    }

    managerRef.current = manager;

    manager.state().then((bleState) => {
      setState((current) => ({
        ...current,
        bleState,
      }));
    });

    const subscription = manager.onStateChange((bleState) => {
      setState((current) => ({
        ...current,
        bleState,
      }));
    }, true);

    return () => {
      subscription.remove();
      manager.stopDeviceScan();
      clearScanTimeout(scanTimeoutRef.current);
      manager.destroy();
      managerRef.current = null;
    };
  }, []);

  async function startScan() {
    if (!managerRef.current) {
      return;
    }

    const currentBleState = await managerRef.current.state();
    setState((current) => ({
      ...current,
      bleState: currentBleState,
    }));

    if (currentBleState !== 'PoweredOn') {
      setState((current) => ({
        ...current,
        error: 'Bluetooth is off. Enable Bluetooth on the device, then try scanning again.',
        isScanning: false,
      }));
      return;
    }

    const granted = await requestPermissions();
    if (!granted) {
      setState((current) => ({
        ...current,
        error: 'Bluetooth permissions were denied.',
      }));
      return;
    }

    setState((current) => ({
      ...current,
      error: null,
      isScanning: true,
    }));

    const seen = new Map<string, BlePeer>();
    managerRef.current.startDeviceScan(null, null, (error, device) => {
      if (error) {
        setState((current) => ({
          ...current,
          error: error.message,
          isScanning: false,
        }));
        managerRef.current?.stopDeviceScan();
        return;
      }

      if (!device) {
        return;
      }

      const peer = toPeer(device);
      seen.set(peer.id, peer);
      setState((current) => ({
        ...current,
        peers: Array.from(seen.values()).sort((left, right) => (right.rssi ?? -999) - (left.rssi ?? -999)),
      }));
    });

    clearScanTimeout(scanTimeoutRef.current);
    scanTimeoutRef.current = setTimeout(() => {
      managerRef.current?.stopDeviceScan();
      setState((current) => ({
        ...current,
        isScanning: false,
      }));
      scanTimeoutRef.current = null;
    }, 180000);
  }

  function stopScan() {
    managerRef.current?.stopDeviceScan();
    clearScanTimeout(scanTimeoutRef.current);
    scanTimeoutRef.current = null;
    setState((current) => ({
      ...current,
      isScanning: false,
    }));
  }

  return {
    ...state,
    startScan,
    stopScan,
  };
}

async function requestPermissions() {
  if (process.env.EXPO_OS !== 'android') {
    return true;
  }

  const permissions = [
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  ];

  const result = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every((permission) => result[permission] === PermissionsAndroid.RESULTS.GRANTED);
}

function toPeer(device: Device): BlePeer {
  return {
    id: device.id,
    localName: device.localName ?? 'Unknown local name',
    name: device.name ?? 'Unnamed BLE device',
    rssi: device.rssi,
  };
}

function hasNativeBleModule() {
  return Boolean(
    (NativeModules as Record<string, unknown>).BleClientManager ||
      (NativeModules as Record<string, unknown>).BlePlx,
  );
}

function clearScanTimeout(timer: ReturnType<typeof setTimeout> | null) {
  if (timer) {
    clearTimeout(timer);
  }
}
