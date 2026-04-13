import { useEffect, useMemo, useState } from 'react';
import * as Battery from 'expo-battery';
import { Accelerometer } from 'expo-sensors';

import type { BlePeer } from '@/src/features/ble/use-ble-scanner';

type MeshThrottleRule = {
  applied: boolean;
  reason: string;
  reduction_pct: number;
  rule: string;
};

export type LiveMeshThrottleState = {
  accelerometer_state: 'moving' | 'stationary' | 'unknown';
  adjusted_battery_drain_pct: number;
  adjusted_broadcasts: number;
  adjusted_interval_seconds: number;
  applied_rules: MeshThrottleRule[];
  auto_poll_enabled: boolean;
  battery_pct: number;
  battery_savings_pct: number;
  base_interval_seconds: number;
  baseline_battery_drain_pct: number;
  baseline_broadcasts: number;
  duration_minutes: number;
  proximity_meters: number;
  strongest_rssi: number | null;
};

const BASE_INTERVAL_SECONDS = 5;
const DEMO_DURATION_MINUTES = 10;
const BATTERY_DRAIN_PER_BROADCAST_PCT = 0.018;

export function useMeshThrottle(blePeers: BlePeer[]) {
  const [batteryPct, setBatteryPct] = useState(100);
  const [accelerometerState, setAccelerometerState] =
    useState<LiveMeshThrottleState['accelerometer_state']>('unknown');

  useEffect(() => {
    if (process.env.EXPO_OS === 'web') {
      setAccelerometerState('unknown');
      return;
    }

    let active = true;

    void Battery.getBatteryLevelAsync().then((level) => {
      if (!active) {
        return;
      }
      setBatteryPct(Math.round(level * 100));
    }).catch(() => undefined);

    const batterySubscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      setBatteryPct(Math.round(batteryLevel * 100));
    });

    const recentSamples: number[] = [];
    Accelerometer.setUpdateInterval(1000);
    const accelerometerSubscription = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const motionDelta = Math.abs(magnitude - 1);
      recentSamples.push(motionDelta);
      if (recentSamples.length > 5) {
        recentSamples.shift();
      }

      const averageDelta =
        recentSamples.reduce((sum, sample) => sum + sample, 0) / recentSamples.length;
      setAccelerometerState(averageDelta < 0.08 ? 'stationary' : 'moving');
    });

    return () => {
      active = false;
      batterySubscription.remove();
      accelerometerSubscription.remove();
    };
  }, []);

  return useMemo(() => {
    const strongestRssi =
      blePeers.length > 0
        ? blePeers.reduce<number | null>(
            (best, peer) =>
              peer.rssi === null
                ? best
                : best === null || peer.rssi > best
                  ? peer.rssi
                  : best,
            null,
          )
        : null;

    const proximityMeters =
      strongestRssi === null ? 250 : roundToTwo(estimateDistanceFromRssi(strongestRssi));

    let frequencyFactor = 1;
    const appliedRules: MeshThrottleRule[] = [];

    const batteryRuleApplied = batteryPct < 30;
    if (batteryRuleApplied) {
      frequencyFactor *= 0.4;
    }
    appliedRules.push({
      applied: batteryRuleApplied,
      reason: batteryRuleApplied
        ? 'Battery under 30% reduces background mesh frequency by 60%.'
        : 'Battery is healthy; no low-power reduction applied.',
      reduction_pct: 60,
      rule: 'battery_below_30',
    });

    const stationaryRuleApplied = accelerometerState === 'stationary';
    if (stationaryRuleApplied) {
      frequencyFactor *= 0.2;
    }
    appliedRules.push({
      applied: stationaryRuleApplied,
      reason: stationaryRuleApplied
        ? 'Stationary motion state reduces mesh frequency by 80%.'
        : 'Device is moving; stationary reduction skipped.',
      reduction_pct: 80,
      rule: 'stationary_motion',
    });

    const proximityRuleApplied = proximityMeters <= 25;
    if (proximityRuleApplied) {
      frequencyFactor *= 0.5;
    }
    appliedRules.push({
      applied: proximityRuleApplied,
      reason: proximityRuleApplied
        ? 'A known peer is nearby, so duplicate rebroadcasts can be reduced by 50%.'
        : 'No nearby known peer detected from live BLE RSSI.',
      reduction_pct: 50,
      rule: 'near_known_node',
    });

    const adjustedIntervalSeconds = roundToTwo(BASE_INTERVAL_SECONDS / frequencyFactor);
    const baselineBroadcasts = Math.max(
      1,
      Math.floor((DEMO_DURATION_MINUTES * 60) / BASE_INTERVAL_SECONDS),
    );
    const adjustedBroadcasts = Math.max(
      1,
      Math.floor((DEMO_DURATION_MINUTES * 60) / adjustedIntervalSeconds),
    );
    const baselineBatteryDrainPct = roundToTwo(
      baselineBroadcasts * BATTERY_DRAIN_PER_BROADCAST_PCT,
    );
    const adjustedBatteryDrainPct = roundToTwo(
      adjustedBroadcasts * BATTERY_DRAIN_PER_BROADCAST_PCT,
    );
    const batterySavingsPct = roundToTwo(
      ((baselineBatteryDrainPct - adjustedBatteryDrainPct) / baselineBatteryDrainPct) * 100,
    );

    return {
      accelerometer_state: accelerometerState,
      adjusted_battery_drain_pct: adjustedBatteryDrainPct,
      adjusted_broadcasts: adjustedBroadcasts,
      adjusted_interval_seconds: adjustedIntervalSeconds,
      applied_rules: appliedRules,
      auto_poll_enabled: Number.isFinite(adjustedIntervalSeconds) && adjustedIntervalSeconds > 0,
      battery_pct: batteryPct,
      battery_savings_pct: batterySavingsPct,
      base_interval_seconds: BASE_INTERVAL_SECONDS,
      baseline_battery_drain_pct: baselineBatteryDrainPct,
      baseline_broadcasts: baselineBroadcasts,
      duration_minutes: DEMO_DURATION_MINUTES,
      proximity_meters: proximityMeters,
      strongest_rssi: strongestRssi,
    } satisfies LiveMeshThrottleState;
  }, [accelerometerState, batteryPct, blePeers]);
}

function estimateDistanceFromRssi(rssi: number) {
  const txPower = -59;
  const pathLoss = 2;
  return Math.pow(10, (txPower - rssi) / (10 * pathLoss));
}

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}
