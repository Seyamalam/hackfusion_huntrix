import { useEffect, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Pane,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
} from "react-leaflet";
import L, { type DivIcon } from "leaflet";
import "leaflet/dist/leaflet.css";

import { fetchDashboardSnapshot, getApiBaseUrlForDisplay, readCachedSnapshot } from "./api";
import type { DashboardSnapshot, Edge, Graph, LinkType, RoutePreview } from "./types";

const POLL_INTERVAL_MS = 8000;
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

type VehiclePosition = {
  route: RoutePreview;
  label: string;
  lat: number;
  lng: number;
  progressPct: number;
};

const edgeStroke: Record<LinkType, string> = {
  road: "#f7b955",
  waterway: "#4fc0ff",
  airway: "#95a4ff",
};

const routeStroke: Record<string, string> = {
  truck: "#ff8d3b",
  speedboat: "#18d4d4",
  drone: "#e88cff",
};

const nodeFill: Record<string, string> = {
  central_command: "#f9f2c2",
  supply_drop: "#9ad4ff",
  relief_camp: "#ffb0aa",
  hospital: "#e2c7ff",
  waypoint: "#a2f0bf",
};

function createVehicleIcon(label: string, color: string): DivIcon {
  return L.divIcon({
    className: "vehicle-marker-shell",
    html: `<div class="vehicle-marker" style="--vehicle-color:${color}"><span>${label}</span></div>`,
    iconSize: [54, 54],
    iconAnchor: [27, 27],
  });
}

function App() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(() => readCachedSnapshot());
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      if (!cancelled) {
        setIsRefreshing(true);
      }
      try {
        const next = await fetchDashboardSnapshot();
        if (cancelled) {
          return;
        }
        setSnapshot(next);
        setError(null);
        setIsLive(true);
      } catch (fetchError) {
        if (cancelled) {
          return;
        }
        setError(fetchError instanceof Error ? fetchError.message : "Live refresh failed");
        setIsLive(false);
      } finally {
        if (!cancelled) {
          setIsRefreshing(false);
        }
      }
    }

    void refresh();
    const handle = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, []);

  if (!snapshot) {
    return (
      <main className="shell shell-empty">
        <section className="empty-card">
          <p className="eyebrow">Huntrix Delta</p>
          <h1>Route Deck is waiting for the live graph.</h1>
          <p>
            Start the Go API on <code>{getApiBaseUrlForDisplay()}</code>, then refresh this page.
          </p>
          {error ? <p className="error-copy">{error}</p> : null}
        </section>
      </main>
    );
  }

  const center = computeMapCenter(snapshot.graph);
  const vehiclePositions = deriveVehiclePositions(snapshot.graph, snapshot.summary.route_previews);
  const blockedEdges = snapshot.graph.edges.filter((edge) => edge.is_flooded);
  const openEdges = snapshot.graph.edges.filter((edge) => !edge.is_flooded);
  const inventory = snapshot.inventory;
  const primaryMission = snapshot.missions.missions[0];
  const predictive = snapshot.predictive;
  const predictiveByEdge = new Map(
    predictive.status.predictions.map((prediction) => [prediction.edge_id, prediction]),
  );
  const fleet = snapshot.fleet;
  const triage = snapshot.triage;
  const flaggedZones =
    fleet.status.live_reachability.drone_required_zones.length > 0
      ? fleet.status.live_reachability.drone_required_zones
      : fleet.status.drill_reachability.drone_required_zones;
  const stateCards = [
    {
      label: "Offline",
      tone: isLive ? "good" : "warn",
      value: isLive ? "Graceful fallback ready" : "Running from cached snapshot",
    },
    {
      label: "Syncing",
      tone: isRefreshing ? "info" : error ? "warn" : "good",
      value: isRefreshing ? "Refreshing command feed" : error ? "Feed interrupted" : "Route feed in sync",
    },
    {
      label: "Conflict",
      tone: inventory.current.conflicts.length > 0 ? "danger" : "good",
      value: inventory.current.conflicts.length > 0 ? "Inventory conflict detected" : "No active inventory conflict",
    },
    {
      label: "Verified",
      tone: fleet.status.handoff.pod_receipt_id ? "good" : "warn",
      value: fleet.status.handoff.pod_receipt_id ? "Signed handoff proof present" : "Awaiting signed receipt",
    },
  ] as const;
  const inventoryCells = buildInventoryCells(inventory);
  const nodeStatus = buildNodeStatus(snapshot.graph, blockedEdges, flaggedZones);

  return (
    <main className="shell">
      <a className="skip-link" href="#command-panels">Skip to command panels</a>
      <section className="hero" aria-labelledby="hero-title">
        <div>
          <div className="brand-mark">
            <img src="/logo.png" alt="Huntrix Delta logo" />
            <div>
              <p className="eyebrow">Huntrix Delta</p>
              <p className="brand-subtitle">Flood logistics command deck</p>
            </div>
          </div>
          <p className="eyebrow">M4.4 Route Deck</p>
          <h1 id="hero-title">Live flood logistics on one map.</h1>
          <p className="hero-copy">
            Road, waterway, and airway corridors update against the live graph feed. Routes,
            vehicle markers, and failed edges refresh automatically for the judge demo.
          </p>
        </div>
        <div className="hero-meta">
          <StatusBadge label={isRefreshing ? "Syncing Feed" : isLive ? "Live Feed" : "Cached Snapshot"} tone={isRefreshing ? "info" : isLive ? "good" : "warn"} />
          <div className="meta-stack">
            <span>{snapshot.graph.metadata.scenario}</span>
            <span>{snapshot.graph.metadata.region}</span>
            <span>API: {getApiBaseUrlForDisplay()}</span>
          </div>
        </div>
      </section>

      <section className="command-ribbon" aria-live="polite">
        {stateCards.map((card) => (
          <article className="state-card" data-tone={card.tone} key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </section>

      <section className="dashboard-grid" id="command-panels">
        <article className="panel map-panel" aria-label="Operational route map">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Operational Map</p>
              <h2>Active routes, failed links, and moving fleet markers</h2>
            </div>
            <div className="legend">
              <LegendSwatch label="Road" color={edgeStroke.road} />
              <LegendSwatch label="Waterway" color={edgeStroke.waterway} />
              <LegendSwatch label="Airway" color={edgeStroke.airway} />
              <LegendSwatch label="Failed Edge" color="#ff5b6d" />
              <LegendSwatch label="Predicted Risk" color="#d22f5a" />
            </div>
          </div>
          <div className="map-frame">
            <MapContainer center={center} zoom={10} scrollWheelZoom className="leaflet-root">
              <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />

              <Pane name="edges" style={{ zIndex: 300 }}>
                {openEdges.map((edge) => (
                  <Polyline
                    key={edge.id}
                    positions={edgeToPolyline(snapshot.graph, edge)}
                    pathOptions={{
                      color: riskColor(predictiveByEdge.get(edge.id)?.probability ?? 0, edge.type),
                      weight: 4,
                      opacity: 0.7,
                    }}
                  >
                    {predictiveByEdge.has(edge.id) ? (
                      <Popup>
                        <strong>{edge.id}</strong>
                        <br />
                        Risk: {Math.round((predictiveByEdge.get(edge.id)?.probability ?? 0) * 100)}%
                        <br />
                        Cumulative rain: {predictiveByEdge.get(edge.id)?.feature_snapshot.cumulative_rainfall_mm} mm
                        <br />
                        Rate change: {predictiveByEdge.get(edge.id)?.feature_snapshot.rainfall_rate_change}
                        <br />
                        Elevation: {predictiveByEdge.get(edge.id)?.feature_snapshot.elevation_m} m
                        <br />
                        Soil proxy: {predictiveByEdge.get(edge.id)?.feature_snapshot.soil_saturation_proxy}
                        <br />
                        Predicted at: {predictiveByEdge.get(edge.id)?.prediction_timestamp}
                      </Popup>
                    ) : null}
                    {predictiveByEdge.has(edge.id) ? (
                      <Tooltip sticky>
                        {edge.id} • {Math.round((predictiveByEdge.get(edge.id)?.probability ?? 0) * 100)}%
                      </Tooltip>
                    ) : null}
                  </Polyline>
                ))}
                {blockedEdges.map((edge) => (
                  <Polyline
                    key={edge.id}
                    positions={edgeToPolyline(snapshot.graph, edge)}
                    pathOptions={{
                      color: "#ff5b6d",
                      weight: 6,
                      opacity: 0.9,
                      dashArray: "10 10",
                    }}
                  />
                ))}
              </Pane>

              <Pane name="routes" style={{ zIndex: 450 }}>
                {snapshot.summary.route_previews.map((route) => (
                  <Polyline
                    key={`${route.vehicle}-${route.source}-${route.target}`}
                    positions={routeToPolyline(snapshot.graph, route)}
                    pathOptions={{
                      color: routeStroke[route.vehicle],
                      weight: 8,
                      opacity: 0.95,
                    }}
                  >
                    <Tooltip sticky>{`${route.vehicle} ${route.source} -> ${route.target}`}</Tooltip>
                  </Polyline>
                ))}
              </Pane>

              <Pane name="nodes" style={{ zIndex: 500 }}>
                {snapshot.graph.nodes.map((node) => (
                  <CircleMarker
                    key={node.id}
                    center={[node.lat, node.lng]}
                    radius={9}
                    pathOptions={{
                      color: "#10181f",
                      weight: 2,
                      fillColor: nodeFill[node.type] ?? "#f6f4eb",
                      fillOpacity: 1,
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -8]} permanent>
                      {node.id}
                    </Tooltip>
                    <Popup>
                      <strong>{node.name}</strong>
                      <br />
                      {node.type}
                    </Popup>
                  </CircleMarker>
                ))}
              </Pane>

              <Pane name="drone-zones" style={{ zIndex: 560 }}>
                {flaggedZones.map((zone) => (
                  <CircleMarker
                    key={`zone-${zone.node_id}`}
                    center={[zone.lat, zone.lng]}
                    radius={14}
                    pathOptions={{
                      color: "#d22f5a",
                      weight: 3,
                      fillColor: "#d22f5a",
                      fillOpacity: 0.22,
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -10]} permanent>
                      Drone Required
                    </Tooltip>
                    <Popup>
                      <strong>{zone.name}</strong>
                      <br />
                      {zone.reason}
                    </Popup>
                  </CircleMarker>
                ))}
              </Pane>

              <Pane name="vehicles" style={{ zIndex: 700 }}>
                {vehiclePositions.map((vehicle) => (
                  <Marker
                    key={`${vehicle.route.vehicle}-${vehicle.label}`}
                    position={[vehicle.lat, vehicle.lng]}
                    icon={createVehicleIcon(vehicle.label, routeStroke[vehicle.route.vehicle])}
                  >
                    <Popup>
                      <strong>{vehicle.label}</strong>
                      <br />
                      Vehicle: {vehicle.route.vehicle}
                      <br />
                      Route progress: {vehicle.progressPct}%
                    </Popup>
                  </Marker>
                ))}
              </Pane>
            </MapContainer>
          </div>
          <p className="footnote">
            OSM tiles are cached by the service worker after first load, so the map can survive
            brief disconnects during the demo.
          </p>
          <div className="sr-summary" aria-live="polite">
            {blockedEdges.length} blocked corridors, {flaggedZones.length} drone-required zones,{" "}
            {snapshot.summary.route_previews.length} active routes.
          </div>
        </article>

        <aside className="side-column">
          <article className="panel metrics-panel">
            <div className="panel-header compact">
              <div>
                <p className="panel-kicker">Situation</p>
                <h2>Command metrics</h2>
              </div>
              <span className="timestamp">{formatTimestamp(snapshot.fetchedAt)}</span>
            </div>
            <div className="metric-grid">
              <MetricCard label="Nodes" value={snapshot.summary.node_count} />
              <MetricCard label="Edges" value={snapshot.summary.edge_count} />
              <MetricCard label="Blocked" value={snapshot.summary.blocked_edge_count} tone="danger" />
              <MetricCard label="Routes" value={snapshot.summary.route_previews.length} tone="good" />
              <MetricCard label="Handoffs" value={primaryMission?.handoffs.length ?? 0} tone="neutral" />
              <MetricCard label="Slowdown" value={triage.snapshot.slowdown_pct} tone="danger" />
              <MetricCard label="High Risk" value={predictive.status.predictions.filter((prediction) => prediction.high_risk).length} tone="danger" />
              <MetricCard label="Drone Zones" value={flaggedZones.length} tone="danger" />
            </div>
            {error ? <p className="warning-banner">Live refresh error: {error}</p> : null}
          </article>

          <article className="panel routes-panel" aria-label="Supply inventory heatmap">
            <div className="panel-header compact">
              <div>
                <p className="panel-kicker">Inventory Heat</p>
                <h2>Conflict and stock pressure at a glance</h2>
              </div>
            </div>
            <div className="heatmap-grid" role="list" aria-label="Inventory heatmap">
              {inventoryCells.map((cell) => (
                <div className="heatmap-cell" data-level={cell.level} key={cell.label} role="listitem" tabIndex={0}>
                  <span>{cell.label}</span>
                  <strong>{cell.value}</strong>
                  <p>{cell.detail}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="panel routes-panel" aria-label="Node status panel">
            <div className="panel-header compact">
              <div>
                <p className="panel-kicker">Node Status</p>
                <h2>Operational readiness by destination</h2>
              </div>
            </div>
            <div className="route-list">
              {nodeStatus.map((node) => (
                <div className="route-card" key={node.id} tabIndex={0}>
                  <div className="route-topline">
                    <span className="vehicle-pill" data-vehicle={node.tone}>
                      {node.status}
                    </span>
                    <span>{node.linkCount} links</span>
                  </div>
                  <strong>{node.name}</strong>
                  <p>{node.detail}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="panel routes-panel">
            <div className="panel-header compact">
              <div>
                <p className="panel-kicker">Module 8</p>
                <h2>Hybrid fleet orchestration</h2>
              </div>
            </div>
            <div className="route-list">
              <div className="route-card">
                <div className="route-topline">
                  <span className="vehicle-pill" data-vehicle="drone">
                    Drone-required zones
                  </span>
                  <span>{flaggedZones.length}</span>
                </div>
                <strong>
                  {flaggedZones.length > 0 ? flaggedZones.map((zone) => zone.name).join(" / ") : "No live dead zones"}
                </strong>
                <p>
                  {flaggedZones.length > 0
                    ? flaggedZones.map((zone) => zone.reason).join(" ")
                    : "The live graph currently keeps at least one surface route open to every destination."}
                </p>
              </div>
              {fleet.status.rendezvous.map((scenario) => (
                <div className="route-card" key={scenario.scenario_id}>
                  <div className="route-topline">
                    <span className="vehicle-pill" data-vehicle="speedboat">
                      {scenario.best_meeting_node_id}
                    </span>
                    <span>{scenario.combined_mission_mins} min</span>
                  </div>
                  <strong>{scenario.label}</strong>
                  <p>
                    Boat {scenario.boat_travel_mins} min / Drone {scenario.drone_travel_mins + scenario.drone_final_leg_mins} min
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="panel routes-panel">
            <div className="panel-header compact">
              <div>
                <p className="panel-kicker">Handoff</p>
                <h2>Boat to drone transfer</h2>
              </div>
            </div>
            <div className="route-list">
              <div className="route-card">
                <div className="route-topline">
                  <span className="vehicle-pill" data-vehicle="truck">
                    {fleet.status.handoff.boat_arrival_node_id}
                  </span>
                  <span>{fleet.status.handoff.pod_receipt_id}</span>
                </div>
                <strong>{fleet.status.handoff.scenario_label}</strong>
                <p>
                  Ownership {fleet.status.handoff.ownership_before} {"->"} {fleet.status.handoff.ownership_after}
                </p>
                {fleet.status.handoff.ledger_history.map((entry) => (
                  <p key={`${entry.event_type}-${entry.created_at}`}>
                    [{entry.event_type}] {entry.detail}
                  </p>
                ))}
              </div>
            </div>
          </article>

          <article className="panel routes-panel">
            <div className="panel-header compact">
              <div>
                <p className="panel-kicker">Mesh Throttle</p>
                <h2>10-minute battery simulation</h2>
              </div>
            </div>
            <div className="route-list">
              <div className="route-card">
                <div className="route-topline">
                  <span className="vehicle-pill" data-vehicle="truck">
                    {fleet.status.mesh_throttle.accelerometer_state}
                  </span>
                  <span>{fleet.status.mesh_throttle.battery_savings_pct}% savings</span>
                </div>
                <strong>Broadcast interval {fleet.status.mesh_throttle.base_interval_seconds}s {"->"} {fleet.status.mesh_throttle.adjusted_interval_seconds}s</strong>
                <p>
                  Broadcasts {fleet.status.mesh_throttle.baseline_broadcasts} {"->"} {fleet.status.mesh_throttle.adjusted_broadcasts}
                </p>
                {fleet.status.mesh_throttle.applied_rules.map((rule) => (
                  <p key={rule.rule}>
                    [{rule.applied ? "applied" : "idle"}] {rule.rule}: {rule.reason}
                  </p>
                ))}
              </div>
            </div>
          </article>

          <article className="panel routes-panel">
            <div className="panel-header compact">
              <div>
                <p className="panel-kicker">Module 7</p>
                <h2>Predictive route decay</h2>
              </div>
            </div>
            <div className="route-list">
              <div className="route-card">
                <div className="route-topline">
                  <span className="vehicle-pill" data-vehicle="drone">
                    1 Hz rainfall feed
                  </span>
                  <span>F1 {predictive.status.metrics.f1}</span>
                </div>
                <strong>Model quality</strong>
                <p>
                  Precision {predictive.status.metrics.precision} / Recall {predictive.status.metrics.recall} / Threshold {predictive.status.model.threshold}
                </p>
              </div>
              {predictive.status.recommendations.map((recommendation) => (
                <div className="route-card" key={`${recommendation.vehicle}-${recommendation.source}-${recommendation.target}`}>
                  <div className="route-topline">
                    <span className="vehicle-pill" data-vehicle={recommendation.vehicle}>
                      {recommendation.vehicle}
                    </span>
                    <span>{recommendation.proactive_eta_mins} min</span>
                  </div>
                  <strong>{recommendation.source} {"->"} {recommendation.target}</strong>
                  <p>{recommendation.message}</p>
                  <p>
                    Baseline {recommendation.baseline_eta_mins} min | avoided {recommendation.avoided_edges.join(", ") || "none"}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="panel routes-panel">
            <div className="panel-header compact">
              <div>
                <p className="panel-kicker">Module 6</p>
                <h2>Autonomous triage engine</h2>
              </div>
            </div>
            <div className="route-list">
              <div className="route-card">
                <div className="route-topline">
                  <span className="vehicle-pill" data-vehicle="truck">
                    {triage.snapshot.mode}
                  </span>
                  <span>{triage.snapshot.slowdown_pct}% slowdown</span>
                </div>
                <strong>{triage.snapshot.trigger_source}</strong>
                <p>{triage.decision.action}</p>
                <p>
                  Safe waypoint: {triage.decision.safe_waypoint || 'n/a'} | Reroute ETA: {triage.decision.reroute_eta_mins} min
                </p>
              </div>
              {triage.snapshot.predictions.map((prediction) => (
                <div className="route-card" key={prediction.cargo_id}>
                  <div className="route-topline">
                    <span className="vehicle-pill" data-vehicle={prediction.priority === "P0" ? "truck" : prediction.priority === "P1" ? "speedboat" : "drone"}>
                      {prediction.priority}
                    </span>
                    <span>{prediction.sla_window_mins / 60}h SLA</span>
                  </div>
                  <strong>{prediction.name}</strong>
                  <p>
                    ETA {prediction.current_eta_mins} min | breach: {prediction.will_breach ? "yes" : "no"} | track: {prediction.recommended_track}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="panel routes-panel">
            <div className="panel-header compact">
              <div>
                <p className="panel-kicker">Scenario Brief</p>
                <h2>What changed in the flood zone</h2>
              </div>
            </div>
            <div className="route-list">
              <div className="route-card">
                <div className="route-topline">
                  <span className="vehicle-pill" data-vehicle="truck">
                    {snapshot.graph.metadata.region}
                  </span>
                  <span>{snapshot.summary.last_recompute_ms ?? snapshot.missions.recompute_ms} ms</span>
                </div>
                <strong>{snapshot.graph.metadata.scenario}</strong>
                <p>Last network update: {formatTimestamp(snapshot.graph.metadata.last_updated)}</p>
                <p>{snapshot.summary.weighted_graph_note ?? "Weighted route cost blends travel time, risk, and capacity pressure."}</p>
                <p>
                  {blockedEdges.length > 0
                    ? `${blockedEdges.length} corridor(s) are blocked and rendered as red dashed overlays.`
                    : "No blocked corridors in the current snapshot."}
                </p>
              </div>
            </div>
          </article>

          <article className="panel routes-panel">
            <div className="panel-header compact">
              <div>
                <p className="panel-kicker">Routes</p>
                <h2>Fleet lanes</h2>
              </div>
            </div>
            <div className="route-list">
              {snapshot.summary.route_previews.map((route) => (
                <div className="route-card" key={`${route.vehicle}-${route.source}-${route.target}`}>
                  <div className="route-topline">
                    <span className="vehicle-pill" data-vehicle={route.vehicle}>
                      {route.vehicle}
                    </span>
                    <span>{route.total_mins} min</span>
                  </div>
                  <strong>{route.source} {"->"} {route.target}</strong>
                  <p>{route.legs.map((leg) => `${leg.source} -> ${leg.target}`).join(" / ")}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="panel routes-panel">
            <div className="panel-header compact">
              <div>
                <p className="panel-kicker">Multimodal Mission</p>
                <h2>Cross-mode handoffs</h2>
              </div>
            </div>
            {primaryMission ? (
              <div className="route-list">
                <div className="route-card">
                  <div className="route-topline">
                    <span className="vehicle-pill" data-vehicle={primaryMission.stages[0]?.vehicle ?? "truck"}>
                      {primaryMission.stage_count} stages
                    </span>
                    <span>{primaryMission.total_mins} min</span>
                  </div>
                  <strong>{primaryMission.label}</strong>
                  <p>
                    {primaryMission.stages.map((stage) => `${stage.vehicle}: ${stage.source} -> ${stage.target}`).join(" / ")}
                  </p>
                  {primaryMission.handoffs.map((handoff) => (
                    <p key={`${handoff.node_id}-${handoff.from_vehicle}-${handoff.to_vehicle}`}>
                      Handoff at {handoff.node_id}: {handoff.from_vehicle} {"->"} {handoff.to_vehicle}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <p className="muted-copy">No multimodal mission is active in this snapshot.</p>
            )}
          </article>

          <article className="panel routes-panel">
            <div className="panel-header compact">
              <div>
                <p className="panel-kicker">Failures</p>
                <h2>Blocked overlays</h2>
              </div>
            </div>
            <div className="failure-list">
              {blockedEdges.length === 0 ? (
                <p className="muted-copy">No flooded edges in the current snapshot.</p>
              ) : (
                blockedEdges.map((edge) => (
                  <div className="failure-card" key={edge.id}>
                    <span>{edge.id}</span>
                    <strong>
                      {edge.source} {"->"} {edge.target}
                    </strong>
                    <p>{edge.type} marked impassable</p>
                  </div>
                ))
              )}
            </div>
          </article>
        </aside>
      </section>
    </main>
  );
}

function computeMapCenter(graph: Graph): [number, number] {
  if (graph.nodes.length === 0) {
    return [24.8949, 91.8687];
  }

  const lat = graph.nodes.reduce((sum, node) => sum + node.lat, 0) / graph.nodes.length;
  const lng = graph.nodes.reduce((sum, node) => sum + node.lng, 0) / graph.nodes.length;
  return [lat, lng];
}

function edgeToPolyline(graph: Graph, edge: Edge): [number, number][] {
  const source = graph.nodes.find((node) => node.id === edge.source);
  const target = graph.nodes.find((node) => node.id === edge.target);
  if (!source || !target) {
    return [];
  }

  return [
    [source.lat, source.lng],
    [target.lat, target.lng],
  ];
}

function routeToPolyline(graph: Graph, route: RoutePreview): [number, number][] {
  const points: [number, number][] = [];
  for (const leg of route.legs ?? []) {
    const segment = edgeToPolyline(graph, {
      id: leg.edgeId ?? leg.edge_id ?? `${leg.source}-${leg.target}`,
      source: leg.source,
      target: leg.target,
      type: leg.linkType ?? leg.link_type ?? "road",
      base_weight_mins: leg.weightMins ?? leg.weight_mins ?? 0,
      is_flooded: false,
    });

    if (segment.length === 0) {
      continue;
    }

    if (points.length === 0) {
      points.push(...segment);
      continue;
    }

    points.push(segment[1]);
  }

  return points;
}

function deriveVehiclePositions(graph: Graph, routes: RoutePreview[]): VehiclePosition[] {
  return routes
    .map((route) => {
      const polyline = routeToPolyline(graph, route);
      if (polyline.length < 2) {
        return null;
      }

      const now = Date.now() / 1000;
      const offset = route.vehicle === "truck" ? 0.21 : route.vehicle === "speedboat" ? 0.61 : 0.85;
      const progressPct = Math.floor(((now / 18 + offset) % 1) * 100);
      const progress = progressPct / 100;
      const start = polyline[0];
      const end = polyline[polyline.length - 1];

      return {
        route,
        label: route.vehicle === "truck" ? "TRK" : route.vehicle === "speedboat" ? "SPB" : "DRN",
        lat: start[0] + (end[0] - start[0]) * progress,
        lng: start[1] + (end[1] - start[1]) * progress,
        progressPct,
      } satisfies VehiclePosition;
    })
    .filter((vehicle): vehicle is VehiclePosition => vehicle !== null);
}

function MetricCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "good" | "danger";
}) {
  return (
    <div className="metric-card" data-tone={tone}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LegendSwatch({ label, color }: { label: string; color: string }) {
  return (
    <span className="legend-swatch">
      <i style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: "good" | "info" | "warn" }) {
  return (
    <span className="status-badge" data-tone={tone}>
      {label}
    </span>
  );
}

function buildInventoryCells(snapshot: DashboardSnapshot["inventory"]) {
  return [
    {
      label: "Merged stock",
      value: `${snapshot.current.quantity}`,
      detail: `${snapshot.current.name} • ${snapshot.current.priority}`,
      level: heatLevel(snapshot.current.quantity),
    },
    {
      label: "Replica A",
      value: `${snapshot.local_replica.quantity}`,
      detail: `Writer ${snapshot.local_replica.last_writer} • ${snapshot.local_replica.priority}`,
      level: heatLevel(snapshot.local_replica.quantity),
    },
    {
      label: "Replica B",
      value: `${snapshot.remote_replica.quantity}`,
      detail: `Writer ${snapshot.remote_replica.last_writer} • ${snapshot.remote_replica.priority}`,
      level: heatLevel(snapshot.remote_replica.quantity),
    },
    {
      label: "Conflict load",
      value: `${snapshot.current.conflicts.length}`,
      detail: snapshot.current.conflicts.length > 0 ? "Manual resolution needed" : "Converged cleanly",
      level: snapshot.current.conflicts.length > 0 ? "critical" : "cool",
    },
  ];
}

function buildNodeStatus(
  graph: Graph,
  blockedEdges: Edge[],
  flaggedZones: DashboardSnapshot["fleet"]["status"]["live_reachability"]["drone_required_zones"],
) {
  return graph.nodes.map((node) => {
    const links = graph.edges.filter((edge) => edge.source === node.id || edge.target === node.id);
    const blocked = blockedEdges.filter((edge) => edge.source === node.id || edge.target === node.id).length;
    const droneRequired = flaggedZones.some((zone) => zone.node_id === node.id);
    const status = droneRequired ? "Drone required" : blocked > 0 ? "Degraded" : "Operational";
    const tone = droneRequired ? "drone" : blocked > 0 ? "truck" : "speedboat";
    return {
      detail: droneRequired
        ? "Surface access is cut; use rendezvous + drone handoff."
        : blocked > 0
          ? `${blocked} connected corridor(s) are blocked.`
          : "All connected corridors are currently available.",
      id: node.id,
      linkCount: links.length,
      name: node.name,
      status,
      tone,
    };
  });
}

function heatLevel(quantity: number) {
  if (quantity >= 170) {
    return "critical";
  }
  if (quantity >= 120) {
    return "warm";
  }
  return "cool";
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function riskColor(probability: number, fallback: LinkType) {
  if (probability >= 0.85) {
    return "#d22f5a";
  }
  if (probability >= 0.7) {
    return "#ea6f3b";
  }
  if (probability >= 0.45) {
    return "#e7b341";
  }
  return edgeStroke[fallback];
}

export default App;
