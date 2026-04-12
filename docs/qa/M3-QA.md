# M3 QA

## Goal
Validate `Module 3 - Ad-Hoc Mesh Network Protocol` against the official problem statement.

Targets:
- `M3.1` Store-and-forward message relay
- `M3.2` Dual-role node architecture
- `M3.3` End-to-end message encryption

## Test Environment
- App running on mobile or web for UI verification
- `Network` tab
- No backend dependency required for the mesh demo path itself

## M3.1 Store-and-Forward Message Relay

### Expected Behavior
- A sends an encrypted message to C through relay B
- B going offline pauses relay
- B coming back online allows relay to resume
- TTL exists
- dedupe metadata exists

### Manual Steps
1. Open `Network`.
2. In the `Store-and-forward mesh relay` section, press `Create A → B → C`.
3. Press `Relay Next Hop`.
4. Press `B Offline`.
5. Press `Relay Next Hop` again.
6. Confirm the message is not delivered and the event log says the relay is offline / queued.
7. Press `B Online`.
8. Press `Relay Next Hop` again.
9. Confirm the envelope reaches `delivered`.

### Pass Criteria
- envelope is created
- relay path updates
- offline relay pauses delivery
- resumed relay completes delivery
- TTL and dedupe key are visible in the envelope card

## M3.2 Dual-Role Node Architecture

### Expected Behavior
- node role changes automatically
- role depends on battery, signal, and proximity heuristics
- role change is logged

### Manual Steps
1. Open `Network`.
2. Inspect the `Mesh Nodes` section.
3. Change relay B conditions using:
   - `Relay Battery 20%`
   - `Relay Battery 85%`
   - `Weak Signal`
   - `Strong Signal`
4. Observe B switching between `client` and `relay`.
5. Check the `Mesh Log`.

### Pass Criteria
- role can switch automatically
- switch is triggered by telemetry changes
- role-switch event is logged

## M3.3 End-to-End Message Encryption

### Expected Behavior
- payload is encrypted for recipient C
- relay B cannot decrypt or read plaintext
- packet inspection proves this difference

### Manual Steps
1. Open `Network`.
2. Press `Create A → B → C`.
3. Inspect:
   - `Relay Envelope`
   - `Packet Inspection`
4. Confirm:
   - ciphertext is shown
   - relay preview is not readable
   - recipient preview is readable

### Pass Criteria
- relay envelope shows ciphertext only
- `Relay readable?` is `No`
- recipient preview shows plaintext payload

## Evidence to Capture
- screenshot/video of created relay envelope
- screenshot/video of B going offline and resume after B comes back
- screenshot of TTL and dedupe key
- screenshot of role switching in `Mesh Nodes`
- screenshot of `Packet Inspection` proving relay cannot read payload
- screenshot of `Mesh Log`

## Current Honest Status
- `M3.1`: implemented as a demo/store-and-forward simulation layer
- `M3.2`: implemented as heuristic role switching with logs
- `M3.3`: implemented as recipient-only encrypted relay envelope demo

## Caveat
This current M3 path is demo-oriented and app-layer simulated. It demonstrates the required logic and security properties, but it is not yet fused into the final real on-device transport pipeline for every path in the app.
