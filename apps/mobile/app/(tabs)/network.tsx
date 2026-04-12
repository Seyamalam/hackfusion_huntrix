import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { ActionChip } from '@/src/components/ui/action-chip';
import { AnimatedPanel } from '@/src/components/ui/animated-panel';
import { HeroBanner } from '@/src/components/ui/hero-banner';
import { InfoRow } from '@/src/components/ui/info-row';
import { SectionCard } from '@/src/components/ui/section-card';
import { StatusPill } from '@/src/components/ui/status-pill';
import {
  fetchNetworkStatus,
  networkFallback,
  type NetworkStatus,
} from '@/src/features/dashboard/dashboard-api';
import { useBleScanner } from '@/src/features/ble/use-ble-scanner';
import { palette } from '@/src/theme/palette';

export default function NetworkScreen() {
  const [network, setNetwork] = useState<NetworkStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ble = useBleScanner();

  useEffect(() => {
    const controller = new AbortController();

    fetchNetworkStatus(controller.signal)
      .then((nextNetwork) => {
        setNetwork(nextNetwork);
        setError(null);
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load network state');
      });

    return () => controller.abort();
  }, []);

  const liveNetwork = network ?? networkFallback;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: 16, padding: 20 }}
      style={{ flex: 1, backgroundColor: palette.canvas }}
    >
      <AnimatedPanel index={0}>
        <HeroBanner
          eyebrow="Mesh"
          title="Network and transport readiness"
          description={
            error
              ? `Backend unavailable, showing fallback topology. ${error}`
              : `${liveNetwork.metadata.scenario} network loaded from the Go API.`
          }
        >
          <StatusPill label={`${liveNetwork.nodes.length} nodes`} tone="info" />
          <StatusPill label={`${liveNetwork.edges.length} edges`} tone="neutral" />
          <StatusPill label={ble.isReady ? ble.bleState : 'BLE unavailable'} tone={ble.isReady ? 'success' : 'warning'} />
        </HeroBanner>
      </AnimatedPanel>

      <AnimatedPanel index={1}>
        <SectionCard
          eyebrow="M2.4"
          title="BLE transport scaffold"
          description="This validates native BLE scanning in a dev build. We can add Wi-Fi Direct later, but this screen is focused on BLE transport readiness first."
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <ActionChip label="Start BLE Scan" onPress={ble.startScan} tone="primary" />
            <ActionChip label="Stop Scan" onPress={ble.stopScan} />
          </View>
          <View style={{ gap: 10 }}>
            <InfoRow label="BLE state" value={ble.bleState} />
            <InfoRow label="Peers found" value={String(ble.peers.length)} />
            <InfoRow label="Scanner" value={ble.isScanning ? 'Scanning now' : 'Idle'} />
          </View>
          <Text selectable style={{ color: palette.textSecondary, lineHeight: 22 }}>
            {ble.error ?? ble.transportNote}
          </Text>
        </SectionCard>
      </AnimatedPanel>

      <AnimatedPanel index={2}>
        <SectionCard
          eyebrow="Native BLE"
          title="Discovered nearby devices"
          description="This only proves scanning and discovery in a development build. It does not yet prove full sync transport."
        >
          <View style={{ gap: 12 }}>
            {ble.peers.length === 0 ? (
              <Text selectable style={{ color: palette.textSecondary, lineHeight: 22 }}>
                No peers discovered yet. Keep scanning, move closer to another BLE device, or verify Bluetooth is powered on.
              </Text>
            ) : (
              ble.peers.map((peer) => (
                <View
                  key={peer.id}
                  style={{
                    gap: 8,
                    borderRadius: 22,
                    borderCurve: 'continuous',
                    borderWidth: 1,
                    borderColor: palette.border,
                    backgroundColor: palette.shell,
                    padding: 14,
                  }}
                >
                  <Text selectable style={{ color: palette.textPrimary, fontWeight: '800' }}>
                    {peer.name}
                  </Text>
                  <InfoRow label="Local name" value={peer.localName} />
                  <InfoRow label="Identifier" value={peer.id} />
                  <InfoRow label="RSSI" value={peer.rssi === null ? 'unknown' : String(peer.rssi)} />
                </View>
              ))
            )}
          </View>
        </SectionCard>
      </AnimatedPanel>

      <AnimatedPanel index={3}>
        <SectionCard
          eyebrow="Topology"
          title="Relief nodes in the current scenario"
          description="This remains the backend-driven map topology view for route and node status."
        >
          <View style={{ gap: 12 }}>
            {liveNetwork.nodes.map((node) => (
              <View
                key={node.id}
                style={{
                  gap: 8,
                  borderRadius: 22,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: palette.border,
                  backgroundColor: palette.shell,
                  padding: 14,
                }}
              >
                <Text selectable style={{ color: palette.textPrimary, fontWeight: '800' }}>
                  {node.name}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  <StatusPill label={statusForNode(node.id, liveNetwork)} tone={toneForNode(node.id, liveNetwork)} />
                  <StatusPill label={coordinateLabel(node.lat, node.lng)} tone="neutral" />
                </View>
                <Text selectable style={{ color: palette.textSecondary, lineHeight: 22 }}>
                  {describeNode(node.id, liveNetwork)}
                </Text>
              </View>
            ))}
          </View>
        </SectionCard>
      </AnimatedPanel>
    </ScrollView>
  );
}

function statusForNode(nodeID: string, network: NetworkStatus) {
  const connectedEdges = network.edges.filter(
    (edge) => edge.source === nodeID || edge.target === nodeID,
  );
  const blocked = connectedEdges.filter((edge) => edge.is_flooded).length;
  if (blocked > 0) {
    return `${blocked} blocked edge${blocked > 1 ? 's' : ''}`;
  }

  return 'All routes clear';
}

function toneForNode(nodeID: string, network: NetworkStatus) {
  const hasBlocked = network.edges.some(
    (edge) => (edge.source === nodeID || edge.target === nodeID) && edge.is_flooded,
  );
  return hasBlocked ? 'warning' : 'success';
}

function coordinateLabel(lat: number, lng: number) {
  return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
}

function describeNode(nodeID: string, network: NetworkStatus) {
  const routes = network.edges.filter((edge) => edge.source === nodeID || edge.target === nodeID);
  return `${routes.length} connected route${routes.length === 1 ? '' : 's'} currently tracked for this node.`;
}
