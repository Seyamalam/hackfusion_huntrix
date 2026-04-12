export const syncSignals = [
  { label: 'Offline Ready', tone: 'success' as const },
  { label: '2 Conflicts Pending', tone: 'warning' as const },
  { label: 'Route Risk Rising', tone: 'alert' as const },
  { label: 'Mesh Relay Stable', tone: 'info' as const },
];

export const dashboardMetrics = [
  {
    label: 'Active Relief Nodes',
    value: '06',
    detail: 'Hub, airport, camps, waypoint, and hospital synced from the Sylhet scenario.',
  },
  {
    label: 'Priority Cargo',
    value: '14',
    detail: 'Four loads are P0 or P1 and currently influence route recomputation pressure.',
  },
  {
    label: 'Relay Queue',
    value: '23',
    detail: 'Store-and-forward envelopes waiting for peer delivery after partition recovery.',
  },
  {
    label: 'Predicted Edge Failures',
    value: '03',
    detail: 'Risk-scored segments will soon feed penalties into the routing engine.',
  },
];

export const deliveryQueue = [
  {
    id: 'DEL-104',
    title: 'Critical medical kit to Habiganj Medical',
    route: 'Sylhet City Hub -> Habiganj Medical',
    priority: 'P0 Critical',
    priorityTone: 'alert' as const,
    status: 'SLA at risk',
    statusTone: 'warning' as const,
    note: 'Route decay prediction suggests one road segment may fail within two hours.',
  },
  {
    id: 'DEL-118',
    title: 'Dry food and water to Sunamganj Sadar Camp',
    route: 'Osmani Airport Node -> Sunamganj Sadar Camp',
    priority: 'P1 High',
    priorityTone: 'warning' as const,
    status: 'Reroute candidate',
    statusTone: 'info' as const,
    note: 'The triage engine may preempt lower-priority cargo if flood conditions worsen.',
  },
  {
    id: 'DEL-121',
    title: 'Shelter kits to Companyganj Outpost',
    route: 'Sylhet City Hub -> Companyganj Outpost',
    priority: 'P2 Standard',
    priorityTone: 'neutral' as const,
    status: 'Hold for handoff',
    statusTone: 'success' as const,
    note: 'This load is the most likely candidate for drop-and-reroute under priority pressure.',
  },
];

export const networkNodes = [
  {
    id: 'N1',
    name: 'Sylhet City Hub',
    role: 'Coordinator / Relay',
    status: 'Synced',
    statusTone: 'success' as const,
    battery: '100%',
    note: 'Primary command node holding the current delivery ledger snapshot.',
  },
  {
    id: 'N3',
    name: 'Sunamganj Sadar Camp',
    role: 'Volunteer Node',
    status: 'Partitioned',
    statusTone: 'warning' as const,
    battery: '42%',
    note: 'Pending envelopes should resume relay once peer visibility returns.',
  },
  {
    id: 'N6',
    name: 'Habiganj Medical',
    role: 'Medic Node',
    status: 'Priority lane',
    statusTone: 'alert' as const,
    battery: '67%',
    note: 'Incoming P0 medical delivery currently drives the most urgent reroute decisions.',
  },
];
