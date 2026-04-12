import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { SectionCard } from '@/src/components/ui/section-card';
import { StatusPill } from '@/src/components/ui/status-pill';
import {
  fetchNetworkStatus,
  networkFallback,
  type NetworkStatus,
} from '@/src/features/dashboard/dashboard-api';
import { palette } from '@/src/theme/palette';

export default function NetworkScreen() {
  const [network, setNetwork] = useState<NetworkStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      contentContainerStyle={{
        gap: 16,
        padding: 20,
      }}
      style={{ flex: 1, backgroundColor: palette.canvas }}
    >
      <SectionCard
        eyebrow="Mesh"
        title="Relay state"
        description={
          error
            ? `Backend unavailable, showing fallback topology. ${error}`
            : `${liveNetwork.metadata.scenario} network loaded from the Go API.`
        }
      />

      {liveNetwork.nodes.map((node) => (
        <SectionCard
          key={node.id}
          eyebrow={node.id}
          title={node.name}
          description={node.type.replaceAll('_', ' ')}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <StatusPill label={statusForNode(node.id, liveNetwork)} tone={toneForNode(node.id, liveNetwork)} />
            <StatusPill label={coordinateLabel(node.lat, node.lng)} tone="neutral" />
          </View>
          <Text selectable style={{ color: palette.textSecondary, lineHeight: 22 }}>
            {describeNode(node.id, liveNetwork)}
          </Text>
        </SectionCard>
      ))}
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
