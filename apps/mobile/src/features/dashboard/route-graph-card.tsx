import { Text, View } from 'react-native';

import { SectionCard } from '@/src/components/ui/section-card';
import { StatusPill } from '@/src/components/ui/status-pill';
import type { MissionPlan, NetworkStatus } from '@/src/features/dashboard/dashboard-api';
import { palette } from '@/src/theme/palette';

const GRAPH_WIDTH = 310;
const GRAPH_HEIGHT = 210;

const vehicleColor: Record<string, string> = {
  truck: '#ca4f38',
  speedboat: '#245f7f',
  drone: '#7d4fc9',
};

const edgeColor: Record<string, string> = {
  road: '#cb7e1f',
  waterway: '#1d7ea1',
  airway: '#7d4fc9',
};

type RouteGraphCardProps = {
  network: NetworkStatus;
  mission: MissionPlan;
};

type Point = { x: number; y: number };

export function RouteGraphCard({ network, mission }: RouteGraphCardProps) {
  const positions = buildNodePositions(network);

  return (
    <SectionCard
      eyebrow="M4.3 Mission Graph"
      title={mission.label}
      description="The app now renders the same multimodal mission story as the backend: stage routing, vehicle-specific lanes, and explicit handoff events."
    >
      <View
        style={{
          position: 'relative',
          height: GRAPH_HEIGHT,
          borderRadius: 24,
          borderCurve: 'continuous',
          overflow: 'hidden',
          backgroundColor: '#efe8dc',
          borderWidth: 1,
          borderColor: palette.border,
        }}
      >
        {network.edges.map((edge) => {
          const source = positions[edge.source];
          const target = positions[edge.target];
          if (!source || !target) {
            return null;
          }

          return (
            <Line
              key={edge.id}
              start={source}
              end={target}
              color={edge.is_flooded ? palette.alert : edgeColor[normalizeType(edge.type)] ?? palette.textMuted}
              thickness={edge.is_flooded ? 5 : 3}
              faded={!edge.is_flooded}
            />
          );
        })}

        {mission.stages.map((stage, stageIndex) =>
          stage.legs?.map((leg, legIndex) => {
            const source = positions[leg.source];
            const target = positions[leg.target];
            if (!source || !target) {
              return null;
            }

            return (
              <Line
                key={`${stage.vehicle}-${stageIndex}-${leg.edge_id ?? legIndex}`}
                start={source}
                end={target}
                color={vehicleColor[stage.vehicle] ?? palette.info}
                thickness={8}
              />
            );
          }),
        )}

        {network.nodes.map((node) => {
          const point = positions[node.id];
          if (!point) {
            return null;
          }

          const isHandoffNode = mission.handoffs.some((handoff) => handoff.node_id === node.id);

          return (
            <View
              key={node.id}
              style={{
                position: 'absolute',
                left: point.x - 18,
                top: point.y - 18,
                alignItems: 'center',
                gap: 6,
              }}
            >
              <View
                style={{
                  width: isHandoffNode ? 38 : 30,
                  height: isHandoffNode ? 38 : 30,
                  borderRadius: 999,
                  backgroundColor: isHandoffNode ? '#13232f' : palette.shell,
                  borderWidth: 2,
                  borderColor: isHandoffNode ? '#13232f' : palette.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  selectable
                  style={{
                    color: isHandoffNode ? '#fbf7f0' : palette.textPrimary,
                    fontSize: 11,
                    fontWeight: '800',
                  }}
                >
                  {node.id}
                </Text>
              </View>
              <Text
                selectable
                style={{
                  color: palette.textSecondary,
                  fontSize: 11,
                  fontWeight: '600',
                }}
              >
                {node.name}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <StatusPill label={`${mission.total_mins} min`} tone="info" />
        <StatusPill label={`Cost ${mission.total_cost}`} tone="warning" />
        <StatusPill label={`${mission.handoffs.length} handoff`} tone={mission.handoffs.length > 0 ? 'alert' : 'success'} />
      </View>

      <View style={{ gap: 10 }}>
        {mission.stages.map((stage, index) => (
          <View
            key={`${mission.mission_id}-${stage.vehicle}-${index}`}
            style={{
              gap: 8,
              borderRadius: 18,
              borderCurve: 'continuous',
              padding: 12,
              backgroundColor: palette.shell,
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
              <Text selectable style={{ color: palette.textPrimary, fontWeight: '800' }}>
                Stage {index + 1}: {stage.vehicle.toUpperCase()}
              </Text>
              <Text selectable style={{ color: palette.textSecondary }}>
                {stage.total_mins} min
              </Text>
            </View>
            <Text selectable style={{ color: palette.textSecondary, lineHeight: 21 }}>
              {stage.source} {'->'} {stage.target} | payload {stage.payload_kg ?? 0} kg
            </Text>
          </View>
        ))}
      </View>

      <View style={{ gap: 10 }}>
        {mission.handoffs.length === 0 ? (
          <Text selectable style={{ color: palette.textSecondary, lineHeight: 21 }}>
            No cross-mode handoff in this mission.
          </Text>
        ) : (
          mission.handoffs.map((handoff) => (
            <Text key={`${handoff.node_id}-${handoff.from_vehicle}-${handoff.to_vehicle}`} selectable style={{ color: palette.textSecondary, lineHeight: 21 }}>
              Handoff at {handoff.node_id}: {handoff.from_vehicle} {'->'} {handoff.to_vehicle} carrying {handoff.payload_kg} kg.
            </Text>
          ))
        )}
      </View>
    </SectionCard>
  );
}

function buildNodePositions(network: NetworkStatus) {
  const nodes = network.nodes;
  if (nodes.length === 0) {
    return {} as Record<string, Point>;
  }

  const minLat = Math.min(...nodes.map((node) => node.lat));
  const maxLat = Math.max(...nodes.map((node) => node.lat));
  const minLng = Math.min(...nodes.map((node) => node.lng));
  const maxLng = Math.max(...nodes.map((node) => node.lng));

  return Object.fromEntries(
    nodes.map((node) => {
      const x = scale(node.lng, minLng, maxLng, 36, GRAPH_WIDTH - 36);
      const y = scale(node.lat, minLat, maxLat, GRAPH_HEIGHT - 32, 28);
      return [node.id, { x, y }];
    }),
  ) as Record<string, Point>;
}

function scale(value: number, min: number, max: number, outMin: number, outMax: number) {
  if (max === min) {
    return (outMin + outMax) / 2;
  }
  const ratio = (value - min) / (max - min);
  return outMin + ratio * (outMax - outMin);
}

function normalizeType(value: string) {
  return value === 'river' ? 'waterway' : value;
}

function Line({
  start,
  end,
  color,
  thickness,
  faded = false,
}: {
  start: Point;
  end: Point;
  color: string;
  thickness: number;
  faded?: boolean;
}) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = `${Math.atan2(dy, dx)}rad`;

  return (
    <View
      style={{
        position: 'absolute',
        left: start.x,
        top: start.y,
        width: length,
        height: thickness,
        borderRadius: 999,
        backgroundColor: color,
        opacity: faded ? 0.38 : 0.98,
        transform: [{ translateY: -thickness / 2 }, { rotateZ: angle }],
      }}
    />
  );
}
