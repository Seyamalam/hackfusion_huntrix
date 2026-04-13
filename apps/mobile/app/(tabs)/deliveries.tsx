import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { ActionChip } from '@/src/components/ui/action-chip';
import { AnimatedPanel } from '@/src/components/ui/animated-panel';
import { HeroBanner } from '@/src/components/ui/hero-banner';
import { InfoRow } from '@/src/components/ui/info-row';
import { SectionCard } from '@/src/components/ui/section-card';
import { StatusPill } from '@/src/components/ui/status-pill';
import { SyncStateStrip } from '@/src/components/ui/sync-state-strip';
import { canPerform } from '@/src/features/auth/auth-rbac';
import { readRole } from '@/src/features/auth/auth-storage';
import {
  fetchInventoryDemoState,
  resetInventoryDemo,
  resolveInventoryConflict,
  runInventoryScenario,
  type InventoryDemoState,
} from '@/src/features/sync-demo/sync-demo-api';
import { useBackendReconnect } from '@/src/hooks/use-backend-reconnect';
import { PodDemoPanel } from '@/src/features/pod/pod-demo-panel';
import { palette } from '@/src/theme/palette';

export default function DeliveriesScreen() {
  const [demo, setDemo] = useState<InventoryDemoState | null>(null);
  const [status, setStatus] = useState<string>('Loading inventory sync demo...');

  const reconnect = useBackendReconnect(
    async (signal) => {
      const state = await fetchInventoryDemoState(signal);
      setDemo(state);
      setStatus('Inventory sync demo loaded from the Go API.');
    },
    {
      onError: (error) => {
        setStatus(error instanceof Error ? error.message : 'Failed to load inventory sync demo');
      },
      onSuccess: () => undefined,
    },
  );

  async function runScenario(scenario: 'causal' | 'conflict') {
    const role = (await readRole()) ?? 'field_volunteer';
    if (!canPerform(role, 'mutate_inventory')) {
      setStatus(`Role ${role} cannot mutate inventory.`);
      return;
    }
    const response = await runInventoryScenario(scenario);
    setDemo(response.state);
    setStatus(response.message);
  }

  async function resolve(choice: 'local' | 'remote') {
    const role = (await readRole()) ?? 'field_volunteer';
    if (!canPerform(role, 'resolve_conflict')) {
      setStatus(`Role ${role} cannot resolve conflicts.`);
      return;
    }
    const response = await resolveInventoryConflict(choice);
    setDemo(response.state);
    setStatus(response.message);
  }

  async function reset() {
    const response = await resetInventoryDemo();
    setDemo(response.state);
    setStatus(response.message);
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: 16, padding: 20 }}
      style={{ flex: 1, backgroundColor: palette.canvas }}
    >
      <AnimatedPanel index={0}>
        <HeroBanner
          eyebrow="Module 2"
          title="Replica merge simulator"
          description="Run causal and concurrent updates on the same supply entry, then inspect vector clocks, conflicts, and manual resolution."
        >
          <StatusPill label={demo?.scenario ?? 'baseline'} tone="info" />
          <StatusPill
            label={demo?.current.conflicts.length ? 'Conflict Active' : 'Replica Converged'}
            tone={demo?.current.conflicts.length ? 'alert' : 'success'}
          />
          <StatusPill label={`Logs ${demo?.resolution_log.length ?? 0}`} tone="neutral" />
          <ActionChip
            label={reconnect.isRefreshing ? 'Reconnecting…' : 'Reconnect'}
            onPress={reconnect.reconnect}
            tone="default"
            accessibilityHint="Retry the inventory demo request."
          />
        </HeroBanner>
      </AnimatedPanel>

      <AnimatedPanel index={1}>
        <SyncStateStrip
          eyebrow="Sync Feedback"
          items={[
            { label: 'Offline', value: reconnect.backendState === 'fallback' ? 'Using last local view' : 'Replica local', tone: reconnect.backendState === 'fallback' ? 'warning' : 'success' },
            { label: 'Syncing', value: reconnect.isRefreshing ? 'Auto reconnecting' : demo?.scenario === 'baseline' ? 'Waiting for delta' : 'Merge story active', tone: reconnect.isRefreshing ? 'info' : demo?.scenario === 'baseline' ? 'neutral' : 'info' },
            { label: 'Conflict', value: demo?.current.conflicts.length ? 'Detected' : 'Cleared', tone: demo?.current.conflicts.length ? 'alert' : 'success' },
            { label: 'Verified', value: reconnect.lastSuccessAt ? `Backend ${new Date(reconnect.lastSuccessAt).toLocaleTimeString()}` : demo?.resolution_log.length ? 'Decision logged' : 'No resolution yet', tone: reconnect.lastSuccessAt || demo?.resolution_log.length ? 'success' : 'warning' },
          ]}
        />
      </AnimatedPanel>

      <AnimatedPanel index={2}>
        <SectionCard
          eyebrow="Actions"
          title="Drive the merge story"
          description="Use causal first to explain preserved ordering, then trigger the concurrent conflict path and resolve it manually."
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <ActionChip label="Run Causal" onPress={() => runScenario('causal')} tone="primary" />
            <ActionChip label="Run Conflict" onPress={() => runScenario('conflict')} tone="danger" />
            <ActionChip label="Keep Local" onPress={() => resolve('local')} />
            <ActionChip label="Keep Remote" onPress={() => resolve('remote')} />
            <ActionChip label="Reset" onPress={reset} />
          </View>
          <Text selectable style={{ color: palette.textSecondary, lineHeight: 22 }}>
            {status}
          </Text>
        </SectionCard>
      </AnimatedPanel>

      {demo ? (
        <>
      <AnimatedPanel index={3}>
            <SectionCard
              eyebrow={demo.current.id}
              title={`${demo.current.name} merged state`}
              description={`Scenario: ${demo.scenario}`}
            >
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <StatusPill label={`Qty ${demo.current.quantity}`} tone="info" />
                <StatusPill label={demo.current.priority} tone="warning" />
                <StatusPill
                  label={demo.current.conflicts.length > 0 ? 'Conflict Active' : 'Merged Cleanly'}
                  tone={demo.current.conflicts.length > 0 ? 'alert' : 'success'}
                />
              </View>
              <View style={{ gap: 10 }}>
                <InfoRow label="Last writer" value={demo.current.last_writer} />
                <InfoRow
                  label="Vector clock"
                  value={Object.entries(demo.current.vector_clock)
                    .map(([replica, counter]) => `${replica}:${counter}`)
                    .join(' | ')}
                />
              </View>
            </SectionCard>
          </AnimatedPanel>

          <AnimatedPanel index={4}>
            <SectionCard
              eyebrow="Replicas"
              title="Disconnected device views"
              description="These are the competing states before resolution. This is the part to talk through slowly in the demo."
            >
              <View style={{ gap: 14 }}>
                <ReplicaCard
                  label="Local Replica A"
                  quantity={demo.local_replica.quantity}
                  priority={demo.local_replica.priority}
                  writer={demo.local_replica.last_writer}
                />
                <ReplicaCard
                  label="Remote Replica B"
                  quantity={demo.remote_replica.quantity}
                  priority={demo.remote_replica.priority}
                  writer={demo.remote_replica.last_writer}
                />
              </View>
            </SectionCard>
          </AnimatedPanel>

          {demo.current.conflicts.map((conflict, index) => (
            <AnimatedPanel key={conflict.field} index={5 + index}>
              <SectionCard
                eyebrow="Conflict"
                title={conflict.field}
                description={`Replica ${conflict.local_replica} vs ${conflict.remote_replica}`}
              >
                <View style={{ gap: 10 }}>
                  <InfoRow label="Local value" value={conflict.local_value} />
                  <InfoRow label="Remote value" value={conflict.remote_value} />
                </View>
              </SectionCard>
            </AnimatedPanel>
          ))}

      <AnimatedPanel index={8}>
        <SectionCard
          eyebrow="Resolution Log"
          title="Manual decisions"
          description="Every conflict resolution should be logged as part of the demo path."
        >
          <View style={{ gap: 10 }}>
            {demo.resolution_log.length === 0 ? (
              <Text selectable style={{ color: palette.textSecondary, lineHeight: 22 }}>
                No resolution recorded yet.
              </Text>
            ) : (
              demo.resolution_log.map((entry) => (
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
                  <StatusPill label={entry.toLowerCase().includes('remote') ? 'REMOTE WIN' : 'LOCAL WIN'} tone={entry.toLowerCase().includes('remote') ? 'info' : 'warning'} />
                  <Text selectable style={{ color: palette.textSecondary, lineHeight: 22 }}>
                    {entry}
                  </Text>
                </View>
                  ))
                )}
              </View>
            </SectionCard>
          </AnimatedPanel>
        </>
      ) : null}

      <PodDemoPanel />
    </ScrollView>
  );
}

type ReplicaCardProps = {
  label: string;
  quantity: number;
  priority: string;
  writer: string;
};

function ReplicaCard({ label, quantity, priority, writer }: ReplicaCardProps) {
  return (
    <View
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
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <StatusPill label={`Qty ${quantity}`} tone="info" />
        <StatusPill label={priority} tone="warning" />
        <StatusPill label={`Writer ${writer}`} tone="neutral" />
      </View>
    </View>
  );
}
