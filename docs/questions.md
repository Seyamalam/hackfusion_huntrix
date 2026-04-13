**Hackfusion-2026 || IEEE CS LU SBC**

Team Name : Huntrix 

**Answer the questions in the shortest way possible.**

### **Track A: UI/UX & Frontend (Design Evaluation)**

**A1–A5 Combined (UI/UX)**

1. How does your UI communicate system state (offline, syncing, conflict, verified) to users clearly during disaster scenarios?
Answer: We use text-first state communication instead of relying on color alone. In the mobile app, the critical screens show a shared state strip with `Offline`, `Syncing`, `Conflict`, and `Verified`, so the operator always sees the current data posture. On the dashboard, the same idea appears as a command ribbon with live/cached state, conflict state, and verification state. We also reinforce state in context-specific cards, for example `Replica Converged` vs `Conflict Active` in the sync flow, `Audit Intact` vs `Tampered` in auth, and handshake / ack indicators in the `Network` screen.
2. Explain how your design ensures usability across mobile, tablet, and desktop without layout failure. What trade-offs did you make?
Answer: We split the product by responsibility. The Expo app is optimized for field operators and task execution, while the dashboard is optimized for dense spatial awareness and command visibility. On mobile, the screens use stacked scrollable cards, wrapped actions, safe areas, and keyboard-safe forms, so the flow survives narrow widths and device notches. On the dashboard, the composition is map-first with the rest of the intelligence arranged below it in a multi-column command board, and it collapses down to a single-column layout on smaller screens. The main trade-off was not forcing the entire dense route-operations surface into the phone UI, because that would hurt readability and speed under stress.
3. How did you ensure accessibility (WCAG compliance)? Mention at least 2 concrete implementations.
Answer: We did not do a full formal WCAG audit, so we do not claim full compliance. But we did implement several concrete accessibility measures. First, state is written as text labels instead of color only, so `Conflict`, `Offline`, and `Verified` remain understandable even without color perception. Second, critical controls use explicit accessibility labels and button roles in the mobile app. Third, we kept large tap targets and keyboard-safe interaction patterns for forms. Fourth, the dashboard has visible keyboard focus styling and semantic heading structure, which improves navigation and scannability.

---

### **Module 1: Authentication & Identity**

1. How does your OTP system work completely offline, and how do you ensure its security (expiry, reuse prevention)?
Answer: OTPs are generated entirely on-device from a locally stored seed. We support both TOTP and HOTP. TOTP is time-based, so it expires and regenerates automatically after its time window. HOTP is counter-based, so the counter only advances when a new code is explicitly generated. We also write auth events into a tamper-evident hash chain, which gives us local auditability for login attempts, secret rotation, and anomalies. In the current demo, the strongest protections are expiry, counter advancement, role gating, and tamper-evident logging rather than any online server-side validation.
2. Explain your key pair generation and storage mechanism. Why is it secure in a zero-trust environment?
Answer: On first setup, the app generates a per-device Ed25519 key pair. The public key is added to the local identity ledger so it can be referenced by the rest of the trust flow. The private key is kept in secure local storage, with a development fallback for non-secure environments such as the web. This fits a zero-trust model because trust is attached to device-held cryptographic identity, not to a central online authority. That same identity is then reused for PoD signing and mesh encryption flows.
3. How are roles enforced in your system? Give one example of restricted action.
Answer: Roles are enforced through an explicit permission matrix in the app before protected actions run. The roles match the restored statement: Field Volunteer, Supply Manager, Drone Operator, Camp Commander, and Sync Admin. We gate sensitive actions such as inventory mutation, conflict resolution, secret rotation, PoD countersigning, and sync traffic. For example, only `sync_admin` can start sync traffic, so `Send Handshake` and `Send Delta Bundle` are blocked for other roles.

---

### **Module 2: Distributed DB & CRDT Sync**

1. Which CRDT did you use, and why is it suitable for this disaster scenario?
Answer: We use an LWW-register-style replicated inventory record with vector clocks and explicit conflict surfacing. The important property for this disaster scenario is that field devices can continue making local writes while disconnected, and those writes can later converge without a central coordinator. We intentionally expose concurrent conflicts instead of silently hiding them, because in a relief workflow it is safer to show a conflict than to pretend certainty.
2. How does your system ensure consistency when two devices update the same data offline?
Answer: Every syncable update carries vector clock metadata. During merge, we compare the clocks to determine the relationship between writes. If one update causally follows another, it merges automatically. If the clocks are equal, the state remains stable. If the clocks are concurrent, we surface a true conflict. This is an eventual-consistency design by choice, because disaster conditions assume partitions are normal rather than exceptional.
3. Explain how conflicts are detected and resolved in your system.
Answer: A conflict is detected when two updates are concurrent in vector-clock terms and they changed the same fields on the same record. We do not collapse those writes silently. Instead, the UI shows both competing values and their source replicas. The operator can then resolve the record with `Keep Local` or `Keep Remote`, and that resolution is recorded in the log so the demo shows both the detection and the human decision path.

---

### **Module 3: Mesh Network Protocol**

1. How does your store-and-forward mechanism ensure message delivery when intermediate nodes go offline?
Answer: Messages are wrapped in relay envelopes that include TTL, a dedupe key, and relay-path metadata. If the intermediate node goes offline, the envelope remains queued in a waiting state instead of being discarded. When the relay becomes available again, forwarding resumes from the stored state. This lets us demonstrate delay-tolerant message handling in a disconnected environment without needing a central broker.
2. What factors determine whether a node acts as a relay or client in your system?
Answer: We score each node using battery level, signal strength, and proximity. Devices with stronger battery, stronger signal, and better proximity are promoted into relay behavior, while weaker devices remain clients. The role switch is automatic and logged, which demonstrates that the mesh behavior is not statically assigned to one device.
3. How do you guarantee end-to-end encryption while allowing relay nodes to forward messages?
Answer: The sender derives a shared key for the recipient, then encrypts the payload with AES-256-GCM. Relay nodes only see ciphertext and routing metadata such as the intended next step; they do not have the key material needed to decrypt the payload. So they can still forward the packet while remaining cryptographically blind to the message contents.

---

### **Module 4: VRP Routing Engine**

1. How is your transportation network modeled (graph structure), and what factors influence edge weights?
Answer: The transportation network is modeled as a weighted directed graph with three edge types: `road`, `waterway`, and `airway`. Each edge carries route-relevant attributes such as travel time, risk score, capacity, and payload limit. The effective route cost is influenced by travel time, risk penalties, and near-capacity penalties, so the chosen route reflects more than just geometric distance.
2. What happens in your system when a route suddenly becomes unavailable (e.g., flood)? Explain the recomputation process.
Answer: When a route becomes unavailable, we mark the affected edge as blocked or impassable in the graph. If predictive penalties are also present, they are applied to the same updated graph before route computation. The routing engine then recalculates the shortest valid path from the new graph state. If no valid path exists, the request fails cleanly instead of returning a misleading route.
3. How do you enforce vehicle-specific constraints in routing (truck vs boat vs drone)?
Answer: Each vehicle is restricted to its own traversal mode: trucks to roads, boats to waterways, and drones to airways. We also enforce payload limits per edge, so a drone route can fail if the requested payload exceeds the edge’s limit. That means the routing engine is constrained both by topology and by vehicle capability.

---

### **Module 5: Proof-of-Delivery (PoD)**

1. Explain the QR-based handshake process. How do both parties verify authenticity without a server?
Answer: The sender creates a signed QR challenge containing delivery metadata, payload hash, nonce, timestamp, and the sender’s public key. The recipient scans the challenge and verifies the sender signature offline. If valid, the recipient countersigns a response QR and returns it. The sender then verifies the countersignature locally and finalizes the receipt. No server is required at any step of the handshake.
2. How does your system prevent replay attacks or tampered QR codes?
Answer: We track used nonces locally, so replaying the same challenge or response triggers a specific replay rejection path. We also verify Ed25519 signatures on both sides of the handshake. If the payload is tampered with, the signature check fails and the QR is rejected before the receipt can be finalized.
3. How is delivery history stored and later verified across the system?
Answer: Each completed receipt is stored in a local hash-linked receipt chain using `prev_receipt_hash` and `receipt_hash`. That lets us reconstruct the chain of custody per delivery directly from ledger history. The receipts are also added to sync bundles, so once devices reconnect, the delivery proof can propagate to peers.

---

### **Module 6: Triage & Priority Engine**

1. How are delivery priorities defined, and how do they affect routing decisions?
Answer: We define four delivery tiers: `P0`, `P1`, `P2`, and `P3`, with SLA windows of `2h`, `6h`, `24h`, and `72h`. These tiers are part of the triage model, not just labels. When conditions degrade, the system uses them to decide which cargo should keep the fastest route and which cargo can be deprioritized or dropped at a safe waypoint.
2. How does your system detect a potential SLA breach in real time?
Answer: The system compares current ETA against the SLA window after route failures, slowdown assumptions, or predictive penalties change the route state. If the ETA exceeds the allowed window and the slowdown exceeds the decision threshold, that cargo is marked as a likely breach. This is how the preemption engine knows that a delivery is no longer safe to leave on the original plan.
3. Explain the logic behind autonomous rerouting or cargo-dropping decisions.
Answer: If slowdown is severe enough that critical cargo would miss SLA, the engine preserves `P0/P1` cargo on the urgent route and instructs the convoy to drop `P2/P3` at a safe waypoint. In the current scenario, that becomes a truck-to-drone reroute through waypoint `N2`. The decision is recorded in the audit trail so the handoff is explainable, not just automatic.

---

### **Module 7: Predictive Route Decay (ML)**

1. What features did you use to predict route failure, and why are they relevant?
Answer: We use four features: cumulative rainfall, rainfall rate change, elevation, and a soil saturation proxy. These are relevant because flood-driven route failure depends on how much water has accumulated, whether rainfall is intensifying, how the terrain drains, and how saturated the route context already is. Together, they give the model a simple but explainable way to score near-term impassability risk.
2. Which ML model did you choose and how did you evaluate its performance?
Answer: We chose logistic regression because it is simple, interpretable, and easy to mirror on-device. We trained with an `80/20` train/test split and currently report `1.0` precision, `0.8333` recall, and `0.9091` F1 on our synthetic dataset. Those same metrics and the model-card summary are surfaced inside the mobile app so the ML story is demoable from the phone as well as the backend/dashboard.
3. How are predictions integrated into routing decisions in real time?
Answer: The predictive engine scores route edges continuously from the feature snapshot, and any edge above the `0.7` threshold receives a penalty in the routing graph. That changes the effective route cost before route recommendations are served. The dashboard and the mobile app then surface those reroute recommendations, and the mobile app also demonstrates the same model logic running locally through mirrored coefficients.

---

### **Module 8: Fleet & Drone Handoff**

1. How does your system identify locations that require drone delivery?
Answer: We first test whether a destination is reachable by truck and by boat under the current graph state. If both surface modes fail but a drone path still exists, that destination is flagged as a `drone-required zone`. This lets us distinguish between a hard unreachable destination and a destination that is still serviceable by an aerial handoff.
2. Explain how you compute the optimal rendezvous point between vehicles and drones.
Answer: We evaluate candidate meeting nodes across the graph. For each candidate, we compute the boat travel time to the rendezvous, the drone travel time from the drone base to the rendezvous, and the drone’s final leg to the destination. We also enforce drone range and payload limits. The selected rendezvous is the feasible candidate with the lowest combined mission time.
3. How is the handoff process (including ownership and verification) handled securely?
Answer: The mobile app now runs a live PoD-backed handoff flow. The boat generates the signed challenge, the drone countersigns, and the sender finalizes the receipt locally. Once finalized, ownership is written into a handoff ledger that carries vector-clock metadata and receipt-hash linkage. That means the handoff is not only shown in UI; it is represented as syncable state with cryptographic proof attached.
