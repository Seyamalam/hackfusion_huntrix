**Hackfusion-2026 || IEEE CS LU SBC**

Team Name : Huntrix 

**Answer the questions in the shortest way possible.**

### **Track A: UI/UX & Frontend (Design Evaluation)**

**A1–A5 Combined (UI/UX)**

1. How does your UI communicate system state (offline, syncing, conflict, verified) to users clearly during disaster scenarios?
Answer: We use text-first status pills and shared state strips, not color alone. Every critical mobile screen now shows `Offline`, `Syncing`, `Conflict`, and `Verified`, and the dashboard has a matching command ribbon plus explicit live/cached status.
2. Explain how your design ensures usability across mobile, tablet, and desktop without layout failure. What trade-offs did you make?
Answer: We split the surfaces by job: Expo handles field workflows, and the dashboard handles dense map operations. The mobile app uses stacked scrollable cards and keyboard-safe forms, and the dashboard collapses from two columns to one on smaller screens. The trade-off was keeping the map-heavy control surface out of the phone UI so the mobile flow stays readable.
3. How did you ensure accessibility (WCAG compliance)? Mention at least 2 concrete implementations.
Answer: We did not do a full formal WCAG audit, so we do not overclaim full compliance. Concrete steps we did take are: state is always written as text labels instead of color only, and critical controls use explicit accessibility labels and button roles. We also kept large tap targets, keyboard-focus states on the dashboard, and a keyboard-safe settings screen on mobile.

---

### **Module 1: Authentication & Identity**

1. How does your OTP system work completely offline, and how do you ensure its security (expiry, reuse prevention)?
Answer: OTPs are generated locally from a stored secret using offline TOTP and HOTP. TOTP expires and regenerates on-device, and HOTP advances with a monotonic counter. Auth actions are appended to a hash-chained audit log. In the current demo, login protection relies mainly on expiry, counter advancement, role checks, and tamper-evident logging.
2. Explain your key pair generation and storage mechanism. Why is it secure in a zero-trust environment?
Answer: On first setup the app generates a per-device Ed25519 keypair. The public key is written into the local identity ledger, and the private key is stored through secure local storage with a web fallback for development. This fits zero-trust because each device signs and verifies directly instead of trusting a central authority.
3. How are roles enforced in your system? Give one example of restricted action.
Answer: Roles are enforced through a permission matrix in the app logic before protected actions run. Example: only `sync_admin` can send sync traffic, so `Send Handshake` and `Send Delta Bundle` are blocked for other roles.

---

### **Module 2: Distributed DB & CRDT Sync**

1. Which CRDT did you use, and why is it suitable for this disaster scenario?
Answer: We use an LWW-register-style replicated inventory record with vector clocks and explicit conflict surfacing. It fits this scenario because field devices can keep writing while partitioned, then converge later without a central coordinator.
2. How does your system ensure consistency when two devices update the same data offline?
Answer: Every update carries a vector clock. On sync we compare clocks: causal updates merge automatically, equal states stay stable, and concurrent writes are marked as conflicts. The model is eventual consistency by design because partitions are expected.
3. Explain how conflicts are detected and resolved in your system.
Answer: A conflict is detected when two updates are concurrent in the vector clock and they changed the same fields. We show both values in the UI, then the operator resolves with `Keep Local` or `Keep Remote`, and that decision is logged.

---

### **Module 3: Mesh Network Protocol**

1. How does your store-and-forward mechanism ensure message delivery when intermediate nodes go offline?
Answer: Messages are wrapped in relay envelopes with TTL, dedupe keys, and a relay path. If the middle node goes offline, the envelope stays queued as `waiting_for_relay`; when the relay comes back, forwarding resumes from the saved state.
2. What factors determine whether a node acts as a relay or client in your system?
Answer: We score each node using battery, signal strength, and proximity. High-scoring nodes become relays automatically, low-scoring nodes stay clients, and each role switch is logged.
3. How do you guarantee end-to-end encryption while allowing relay nodes to forward messages?
Answer: We derive a shared key between sender and recipient, encrypt the payload with AES-256-GCM, and only the recipient can decrypt it. Relay nodes only see ciphertext plus routing metadata, so they can forward the envelope but not read the contents.

---

### **Module 4: VRP Routing Engine**

1. How is your transportation network modeled (graph structure), and what factors influence edge weights?
Answer: The network is a weighted directed graph with `road`, `waterway`, and `airway` edges. Edge cost combines travel time, risk score, and near-capacity penalty, and it also respects payload limits.
2. What happens in your system when a route suddenly becomes unavailable (e.g., flood)? Explain the recomputation process.
Answer: The failed edge is marked blocked or impassable in the graph, predictive penalties are applied if needed, and the routing engine recomputes the shortest valid path immediately from the updated graph. If no path remains, the route fails cleanly instead of pretending success.
3. How do you enforce vehicle-specific constraints in routing (truck vs boat vs drone)?
Answer: Each vehicle can traverse only its allowed edge type: trucks use roads, boats use waterways, drones use airways. Payload limits are checked per edge, so an overweight drone route is rejected.

---

### **Module 5: Proof-of-Delivery (PoD)**

1. Explain the QR-based handshake process. How do both parties verify authenticity without a server?
Answer: The sender creates a signed QR challenge containing delivery data, payload hash, nonce, timestamp, and public key. The recipient verifies that signature offline, countersigns a response QR, and the sender verifies both signatures locally before finalizing the receipt.
2. How does your system prevent replay attacks or tampered QR codes?
Answer: We track used nonces locally and reject reused ones with a specific error. We also verify Ed25519 signatures on both the challenge and response, so tampered QR payloads fail verification.
3. How is delivery history stored and later verified across the system?
Answer: Each receipt is stored in a local hash-linked chain with `prev_receipt_hash` and `receipt_hash`. That chain can be reconstructed per delivery, and receipts are also included in sync bundles for later propagation.

---

### **Module 6: Triage & Priority Engine**

1. How are delivery priorities defined, and how do they affect routing decisions?
Answer: We use four tiers: `P0`, `P1`, `P2`, and `P3`, with SLA windows of `2h`, `6h`, `24h`, and `72h`. Higher-priority cargo gets protected first when slowdown or route failure threatens SLA.
2. How does your system detect a potential SLA breach in real time?
Answer: We compare current ETA against the SLA window after live route failure or slowdown updates. If the slowdown crosses the risk threshold and ETA exceeds SLA, the cargo is flagged as a predicted breach.
3. Explain the logic behind autonomous rerouting or cargo-dropping decisions.
Answer: If slowdown is severe and critical cargo would miss SLA, the engine keeps `P0/P1` cargo on the urgent route and tells the convoy to drop `P2/P3` at a safe waypoint. In the current scenario that becomes a truck-to-drone reroute anchored in the audit trail.

---

### **Module 7: Predictive Route Decay (ML)**

1. What features did you use to predict route failure, and why are they relevant?
Answer: We use cumulative rainfall, rainfall rate change, elevation, and a soil saturation proxy. They are relevant because flood-driven impassability depends on water load, rainfall trend, terrain, and how saturated the ground already is.
2. Which ML model did you choose and how did you evaluate its performance?
Answer: We chose logistic regression because it is simple, transparent, and easy to run on-device. We trained on an `80/20` split and currently report `1.0` precision, `0.8333` recall, and `0.9091` F1 on our synthetic dataset.
3. How are predictions integrated into routing decisions in real time?
Answer: The predictive engine scores edges, and edges above the `0.7` threshold get penalized in the routing graph. The API, dashboard, and mobile app then use that penalized graph to recommend proactive reroutes before failure.

---

### **Module 8: Fleet & Drone Handoff**

1. How does your system identify locations that require drone delivery?
Answer: We run reachability checks for truck and boat first. If both surface modes fail but a drone route still exists, the destination is flagged as a `drone-required zone`.
2. Explain how you compute the optimal rendezvous point between vehicles and drones.
Answer: We test candidate meeting nodes, compute boat travel time plus drone flight legs, enforce drone range and payload limits, and choose the node with the lowest combined mission time.
3. How is the handoff process (including ownership and verification) handled securely?
Answer: The mobile app now runs a live PoD-backed handoff flow. The boat generates the signed challenge, the drone countersigns, the sender finalizes the receipt, and ownership is written into a syncable handoff ledger with vector-clock metadata and receipt-hash linkage.
