import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { ActionChip } from '@/src/components/ui/action-chip';
import { AnimatedPanel } from '@/src/components/ui/animated-panel';
import { HeroBanner } from '@/src/components/ui/hero-banner';
import { InfoRow } from '@/src/components/ui/info-row';
import { SectionCard } from '@/src/components/ui/section-card';
import { StatusPill } from '@/src/components/ui/status-pill';
import { SyncStateStrip } from '@/src/components/ui/sync-state-strip';
import {
  fetchFleetOrchestrationStatus,
  fetchNetworkStatus,
  fleetFallback,
  networkFallback,
  type FleetOrchestrationStatusResponse,
  type NetworkStatus,
} from '@/src/features/dashboard/dashboard-api';
import { useBleScanner } from '@/src/features/ble/use-ble-scanner';
import { MeshThrottlePanel } from '@/src/features/fleet/mesh-throttle-panel';
import { useMeshThrottle } from '@/src/features/fleet/use-mesh-throttle';
import { useMeshDemo } from '@/src/features/mesh/use-mesh-demo';
import { useWifiDirect } from '@/src/features/wifi-direct/use-wifi-direct';
import { useBackendReconnect } from '@/src/hooks/use-backend-reconnect';
import { palette } from '@/src/theme/palette';

export default function NetworkScreen() {
  const [network, setNetwork] = useState<NetworkStatus | null>(null);
  const [fleet, setFleet] = useState<FleetOrchestrationStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ble = useBleScanner();
  const throttle = useMeshThrottle(ble.peers);
  const mesh = useMeshDemo();
  const wifiDirect = useWifiDirect({
    backgroundPollEnabled: throttle.auto_poll_enabled,
    backgroundPollIntervalSeconds: throttle.adjusted_interval_seconds,
  });

  const reconnect = useBackendReconnect(
    async (signal) => {
      const [nextNetwork, nextFleet] = await Promise.all([
        fetchNetworkStatus(signal),
        fetchFleetOrchestrationStatus(signal),
      ]);
      setNetwork(nextNetwork);
      setFleet(nextFleet);
      setError(null);
    },
    {
      onError: (fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load network state');
      },
      onSuccess: () => {
        setError(null);
      },
    },
  );

  const liveNetwork = network ?? networkFallback;
  const liveFleet = fleet ?? fleetFallback;

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
          <ActionChip
            label={reconnect.isRefreshing ? 'Reconnecting…' : 'Reconnect'}
            onPress={reconnect.reconnect}
            tone="default"
            accessibilityHint="Retry backend network and fleet status requests."
          />
        </HeroBanner>
      </AnimatedPanel>

      <AnimatedPanel index={1}>
        <SyncStateStrip
          eyebrow="Transport State"
          items={[
            { label: 'Offline', value: wifiDirect.connectionInfo?.groupFormed ? 'Peer channel local' : 'No internet required', tone: 'success' },
            { label: 'Syncing', value: reconnect.isRefreshing ? 'Auto reconnecting backend' : wifiDirect.evidence.exchangeRequestSeen ? 'Bundle exchange active' : 'Handshake pending', tone: reconnect.isRefreshing ? 'info' : wifiDirect.evidence.exchangeRequestSeen ? 'info' : 'warning' },
            { label: 'Conflict', value: (wifiDirect.sessionSummary?.conflict_count ?? 0) > 0 ? 'Detected on merge' : 'No sync conflict', tone: (wifiDirect.sessionSummary?.conflict_count ?? 0) > 0 ? 'alert' : 'neutral' },
            { label: 'Verified', value: reconnect.lastSuccessAt ? `Backend ${new Date(reconnect.lastSuccessAt).toLocaleTimeString()}` : wifiDirect.evidence.exchangeResponseSeen ? 'Ack received' : 'Awaiting ack', tone: reconnect.lastSuccessAt || wifiDirect.evidence.exchangeResponseSeen ? 'success' : 'warning' },
          ]}
        />
      </AnimatedPanel>

      <AnimatedPanel index={2}>
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

      <AnimatedPanel index={3}>
        <SectionCard
          eyebrow="M2.4 Candidate"
          title="Wi-Fi Direct transport scaffold"
          description="This is the first actual phone-to-phone transfer candidate in the app. The channel is native Wi-Fi Direct sockets, and the payloads now follow SyncService protobuf RPC frames."
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <ActionChip label="Init Wi-Fi Direct" onPress={wifiDirect.initializeTransport} tone="primary" />
            <ActionChip label="Discover Peers" onPress={wifiDirect.discoverPeers} />
            <ActionChip label="Stop Discovery" onPress={wifiDirect.stopDiscovery} />
          </View>
          <View style={{ gap: 10 }}>
            <InfoRow label="Initialized" value={wifiDirect.isInitialized ? 'Yes' : 'No'} />
            <InfoRow label="Discovery" value={wifiDirect.isScanning ? 'Running' : 'Idle'} />
            <InfoRow
              label="Connection"
              value={
                wifiDirect.connectionInfo?.groupFormed
                  ? wifiDirect.connectionInfo.isGroupOwner
                    ? 'Group owner'
                    : 'Connected client'
                  : 'Not connected'
              }
            />
            <InfoRow label="Peers found" value={String(wifiDirect.peers.length)} />
          </View>
          <Text selectable style={{ color: palette.textSecondary, lineHeight: 22 }}>
            {wifiDirect.error ?? wifiDirect.transportNote}
          </Text>
        </SectionCard>
      </AnimatedPanel>

      <AnimatedPanel index={4}>
        <SectionCard
          eyebrow="Judge Proof"
          title="Peer transport evidence"
          description="This card is the fastest way to prove the sync path is using real peer radio transport plus protobuf RPC frames, not a local mock."
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <StatusPill label={wifiDirect.isInitialized ? 'Wi-Fi Direct Ready' : 'Init Pending'} tone={wifiDirect.isInitialized ? 'success' : 'warning'} />
            <StatusPill
              label={wifiDirect.connectionInfo?.groupFormed ? 'Peer Group Formed' : 'No Peer Group'}
              tone={wifiDirect.connectionInfo?.groupFormed ? 'success' : 'warning'}
            />
            <StatusPill label={wifiDirect.evidence.handshakeSent ? 'Handshake Sent' : 'Handshake Pending'} tone={wifiDirect.evidence.handshakeSent ? 'info' : 'neutral'} />
            <StatusPill label={wifiDirect.evidence.handshakeReceived ? 'Handshake Seen' : 'No Inbound Handshake'} tone={wifiDirect.evidence.handshakeReceived ? 'success' : 'neutral'} />
            <StatusPill
              label={wifiDirect.evidence.exchangeResponseSeen ? 'Exchange Ack Seen' : 'No Exchange Ack'}
              tone={wifiDirect.evidence.exchangeResponseSeen ? 'success' : 'warning'}
            />
            <StatusPill
              label={wifiDirect.evidence.pullPendingResponseSeen ? 'PullPending Seen' : 'PullPending Pending'}
              tone={wifiDirect.evidence.pullPendingResponseSeen ? 'info' : 'neutral'}
            />
          </View>
          <View style={{ gap: 10 }}>
            <InfoRow label="Transport channel" value="Wi-Fi Direct native socket messaging" />
            <InfoRow label="Payload contract" value="Protobuf SyncService request/response frames" />
            <InfoRow label="Last RPC method" value={wifiDirect.evidence.lastRpcMethod ?? 'none'} />
            <InfoRow
              label="Last RPC direction"
              value={wifiDirect.evidence.lastRpcDirection ?? 'none'}
            />
            <InfoRow
              label="Last correlation"
              value={wifiDirect.evidence.lastCorrelationId ?? 'none'}
            />
          </View>
        </SectionCard>
      </AnimatedPanel>

      <AnimatedPanel index={5}>
        <SectionCard
          eyebrow="Wi-Fi Direct"
          title="Peer transport candidates"
          description="Connect to a peer, send a handshake, then send a real delta bundle based on the current local inventory state."
        >
          <View style={{ gap: 12 }}>
            {wifiDirect.peers.length === 0 ? (
              <Text selectable style={{ color: palette.textSecondary, lineHeight: 22 }}>
                No Wi-Fi Direct peers discovered yet. Initialize transport first, then run discovery on two Android devices.
              </Text>
            ) : (
              wifiDirect.peers.map((peer) => (
                <View
                  key={peer.deviceAddress}
                  style={{
                    gap: 10,
                    borderRadius: 22,
                    borderCurve: 'continuous',
                    borderWidth: 1,
                    borderColor: palette.border,
                    backgroundColor: palette.shell,
                    padding: 14,
                  }}
                >
                  <Text selectable style={{ color: palette.textPrimary, fontWeight: '800' }}>
                    {peer.deviceName}
                  </Text>
                  <InfoRow label="Address" value={peer.deviceAddress} />
                  <InfoRow label="Status" value={String(peer.status)} />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    <ActionChip label="Connect" onPress={() => wifiDirect.connectToPeer(peer.deviceAddress)} tone="primary" />
                    <ActionChip label="Send Handshake" onPress={() => wifiDirect.sendHandshake(peer.deviceAddress)} />
                    <ActionChip label="Send Delta Bundle" onPress={() => wifiDirect.sendDeltaBundle(peer.deviceAddress)} />
                    <ActionChip label="Pull Pending" onPress={() => wifiDirect.sendPullPending(peer.deviceAddress)} />
                  </View>
                </View>
              ))
            )}
          </View>
        </SectionCard>
      </AnimatedPanel>

      <AnimatedPanel index={6}>
        <SectionCard
          eyebrow="Local Replica"
          title="Current sync payload state"
          description="Mutate this local state independently on each phone, then exchange delta bundles to demonstrate real peer convergence and conflicts."
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <ActionChip label="+10 Qty" onPress={wifiDirect.incrementQuantity} />
            <ActionChip label="-10 Qty" onPress={wifiDirect.decrementQuantity} />
            <ActionChip label="Set P0" onPress={() => wifiDirect.setPriority('P0')} tone="danger" />
            <ActionChip label="Set P3" onPress={() => wifiDirect.setPriority('P3')} />
          </View>
          <View style={{ gap: 10 }}>
            <InfoRow label="Item" value={wifiDirect.localInventory.name} />
            <InfoRow label="Quantity" value={String(wifiDirect.localInventory.quantity)} />
            <InfoRow label="Priority" value={wifiDirect.localInventory.priority} />
            <InfoRow label="Last writer" value={wifiDirect.localInventory.last_writer} />
            <InfoRow
              label="Vector clock"
              value={Object.entries(wifiDirect.localInventory.vector_clock)
                .map(([replica, counter]) => `${replica}:${counter}`)
                .join(' | ')}
            />
            <InfoRow label="Last handshake" value={wifiDirect.lastHandshakeReplica ?? 'none'} />
            <InfoRow label="Receipt ledger" value={`${wifiDirect.deliveryReceipts.length} receipt(s)`} />
            <InfoRow label="Handoff ledger" value={`${wifiDirect.handoffRecords.length} record(s)`} />
            <InfoRow label="RPC transport" value="SyncService protobuf frames over native socket messaging" />
            <InfoRow
              label="Background polling"
              value={
                wifiDirect.backgroundPollingEnabled
                  ? `every ${wifiDirect.backgroundPollingIntervalSeconds}s`
                  : 'disabled'
              }
            />
            <InfoRow
              label="Known peer clock"
              value={
                wifiDirect.lastPeerAddress
                  ? Object.entries(wifiDirect.peerClocks[wifiDirect.lastPeerAddress]?.knownClock ?? {})
                      .map(([replica, counter]) => `${replica}:${counter}`)
                      .join(' | ') || 'none'
                  : 'none'
              }
            />
          </View>
        </SectionCard>
      </AnimatedPanel>

      {wifiDirect.sessionSummary ? (
        <AnimatedPanel index={7}>
          <SectionCard
            eyebrow="Session Summary"
            title="Latest delta application result"
            description="This summary updates when a sync-delta payload is received and merged on-device."
          >
            <View style={{ gap: 10 }}>
              <InfoRow label="Records in bundle" value={String(wifiDirect.sessionSummary.record_count)} />
              <InfoRow label="Merged records" value={String(wifiDirect.sessionSummary.merged_count)} />
              <InfoRow label="Conflicts" value={String(wifiDirect.sessionSummary.conflict_count)} />
              <InfoRow label="Receipts synced" value={String(wifiDirect.sessionSummary.receipt_count)} />
              <InfoRow
                label="Accepted ops"
                value={String(wifiDirect.sessionSummary.accepted_operation_count ?? 0)}
              />
              <InfoRow
                label="Rejected ops"
                value={String(wifiDirect.sessionSummary.rejected_operation_count ?? 0)}
              />
              <InfoRow
                label="Pending envelopes"
                value={String(wifiDirect.sessionSummary.pending_envelope_count ?? 0)}
              />
              <InfoRow label="Payload bytes" value={String(wifiDirect.sessionSummary.bytes_estimate)} />
              <InfoRow
                label="Handoffs synced"
                value={String(wifiDirect.sessionSummary.handoff_count ?? 0)}
              />
            </View>
          </SectionCard>
        </AnimatedPanel>
      ) : null}

      {wifiDirect.messages.length > 0 ? (
        <AnimatedPanel index={8}>
          <SectionCard
            eyebrow="Session Log"
            title="Wi-Fi Direct message activity"
            description="Handshake messages and incoming payloads will appear here during development-build testing."
          >
            <View style={{ gap: 10 }}>
              {wifiDirect.messages.map((entry) => (
                <View
                  key={entry}
                  style={{
                    gap: 8,
                    borderRadius: 18,
                    borderCurve: 'continuous',
                    borderWidth: 1,
                    borderColor: palette.border,
                    backgroundColor: palette.shell,
                    padding: 12,
                  }}
                >
                  <StatusPill
                    label={entry.includes('handshake') ? 'HANDSHAKE' : entry.includes('delta') ? 'DELTA BUNDLE' : 'SESSION EVENT'}
                    tone={entry.includes('handshake') ? 'info' : entry.includes('delta') ? 'success' : 'neutral'}
                  />
                  <Text selectable style={{ color: palette.textSecondary, lineHeight: 22 }}>
                    {entry}
                  </Text>
                </View>
              ))}
            </View>
          </SectionCard>
        </AnimatedPanel>
      ) : null}

      <AnimatedPanel index={9}>
        <MeshThrottlePanel throttle={throttle} backgroundPollCount={wifiDirect.backgroundPollCount} />
      </AnimatedPanel>

      <AnimatedPanel index={10}>
        <SectionCard
          eyebrow="Module 3"
          title="Store-and-forward mesh relay"
          description="This demo uses an encrypted envelope from Device A to Device C via Device B. It supports offline relay pause/resume, TTL, dedupe, automatic relay role switching, and packet inspection."
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <ActionChip label="Create A → B → C" onPress={mesh.createRelayMessage} tone="primary" />
            <ActionChip label="Relay Next Hop" onPress={mesh.relayNextHop} />
            <ActionChip label="B Offline" onPress={() => mesh.setRelayOnline(false)} tone="danger" />
            <ActionChip label="B Online" onPress={() => mesh.setRelayOnline(true)} />
            <ActionChip label="Reset Mesh" onPress={mesh.resetMeshDemo} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <ActionChip label="Relay Battery 20%" onPress={() => mesh.changeRelayTelemetry({ battery: 20 })} />
            <ActionChip label="Relay Battery 85%" onPress={() => mesh.changeRelayTelemetry({ battery: 85 })} />
            <ActionChip label="Weak Signal" onPress={() => mesh.changeRelayTelemetry({ signal: 35 })} />
            <ActionChip label="Strong Signal" onPress={() => mesh.changeRelayTelemetry({ signal: 90 })} />
          </View>
        </SectionCard>
      </AnimatedPanel>

        <AnimatedPanel index={11}>
          <SectionCard
          eyebrow="Mesh Nodes"
          title="Automatic client / relay roles"
          description="Role assignment is recalculated from battery, signal strength, and proximity. Changes are logged automatically."
        >
          <View style={{ gap: 12 }}>
            {mesh.nodes.map((node) => (
              <View
                key={node.deviceId}
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
                  {node.deviceLabel}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  <StatusPill label={node.role} tone={node.role === 'relay' ? 'info' : 'neutral'} />
                  <StatusPill label={node.online ? 'Online' : 'Offline'} tone={node.online ? 'success' : 'alert'} />
                </View>
                <InfoRow label="Battery" value={`${node.telemetry.batteryPercent}%`} />
                <InfoRow label="Signal" value={`${node.telemetry.signalStrength}`} />
                <InfoRow label="Proximity" value={`${node.telemetry.proximityScore}`} />
              </View>
            ))}
          </View>
        </SectionCard>
      </AnimatedPanel>

      {mesh.envelopes.length > 0 ? (
        <AnimatedPanel index={12}>
          <SectionCard
            eyebrow="Relay Envelope"
            title="Encrypted packet state"
            description="Relay node B only sees ciphertext, nonce, TTL, and route metadata. Recipient C can decrypt."
          >
            <View style={{ gap: 10 }}>
              {mesh.envelopes.map((envelope) => (
                <View key={envelope.envelopeId} style={{ gap: 10 }}>
                  <InfoRow label="Status" value={envelope.status} />
                  <InfoRow label="TTL hops" value={String(envelope.ttlHops)} />
                  <InfoRow label="Next hop" value={envelope.nextHopId ?? 'none'} />
                  <InfoRow label="Relay path" value={envelope.relayPath.join(' -> ')} />
                  <InfoRow label="Dedupe key" value={`${envelope.dedupeKey.slice(0, 12)}...`} />
                  <InfoRow label="Ciphertext" value={`${envelope.ciphertextHex.slice(0, 24)}...`} />
                </View>
              ))}
            </View>
          </SectionCard>
        </AnimatedPanel>
      ) : null}

      {mesh.packetInspection ? (
        <AnimatedPanel index={13}>
          <SectionCard
            eyebrow="Packet Inspection"
            title="Relay cannot read payload"
            description="This is the explicit M3.3 proof. Relay B cannot decrypt the payload, while recipient C can."
          >
            <View style={{ gap: 10 }}>
              <InfoRow label="Relay readable?" value={mesh.packetInspection.relayCanRead ? 'Yes' : 'No'} />
              <InfoRow label="Relay preview" value={mesh.packetInspection.relayPreview} />
              <InfoRow label="Recipient preview" value={mesh.packetInspection.recipientPreview} />
            </View>
          </SectionCard>
        </AnimatedPanel>
      ) : null}

      {mesh.events.length > 0 ? (
        <AnimatedPanel index={14}>
          <SectionCard
            eyebrow="Mesh Log"
            title="Relay and role-switch events"
            description="Use this log to narrate offline relay pause/resume and automatic role switching."
          >
            <View style={{ gap: 10 }}>
              {mesh.events.map((event) => (
                <View
                  key={`${event.timestamp}-${event.detail}`}
                  style={{
                    gap: 8,
                    borderRadius: 18,
                    borderCurve: 'continuous',
                    borderWidth: 1,
                    borderColor: palette.border,
                    backgroundColor: palette.shell,
                    padding: 12,
                  }}
                >
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                    <StatusPill label={formatMeshEventType(event.type)} tone={toneForMeshEvent(event.type)} />
                    <Text selectable style={{ color: palette.textMuted, fontWeight: '700' }}>
                      {formatEventTimestamp(event.timestamp)}
                    </Text>
                  </View>
                  <Text selectable style={{ color: palette.textSecondary, lineHeight: 22 }}>
                    {event.detail}
                  </Text>
                </View>
              ))}
            </View>
          </SectionCard>
        </AnimatedPanel>
      ) : null}

      <AnimatedPanel index={15}>
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

      <AnimatedPanel index={16}>
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

function formatMeshEventType(value: string) {
  return value.replace(/_/g, ' ').toUpperCase();
}

function toneForMeshEvent(value: string) {
  switch (value) {
    case 'delivered':
      return 'success' as const;
    case 'role_switched':
      return 'info' as const;
    case 'ttl_expired':
    case 'dedupe_drop':
      return 'alert' as const;
    default:
      return 'neutral' as const;
  }
}

function formatEventTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}
