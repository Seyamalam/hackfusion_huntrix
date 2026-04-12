# Architecture Diagram

This file is the export-ready source for `D3`.

Recommended export options:
- render this Mermaid diagram to `PNG`
- export to `PDF`
- recreate it in draw.io using the same component groups and labels

## Diagram

```mermaid
flowchart LR
    subgraph Mobile["Expo Mobile Node"]
        M1["Auth + OTP"]
        M2["CRDT Store"]
        M3["PoD QR"]
        M4["Wi-Fi Direct Peer Sync"]
        M5["Mesh Relay Demo"]
        M6["On-Device Risk Inference"]
    end

    subgraph Core["Go Core"]
        G1["HTTP API"]
        G2["gRPC API"]
        G3["Routing Engine"]
        G4["Predictive Penalty Engine"]
        G5["Triage Engine"]
        G6["Fleet / Handoff Engine"]
        G7["Inventory Sync Demo"]
    end

    subgraph Shared["Contracts + Data"]
        S1["Proto Contracts"]
        S2["Sylhet Scenario Data"]
        S3["ML Artifacts"]
    end

    subgraph Sim["Simulation"]
        C1["Chaos Simulator"]
    end

    subgraph Dashboard["Route Deck"]
        D1["Vite + React + Leaflet"]
    end

    M1 --> M2
    M2 --> M3
    M2 --> M4
    M2 --> M5
    M6 --> M2

    M4 <-- "protobuf RPC frames over Wi-Fi Direct sockets" --> M4
    M2 --> G1
    M3 --> G7
    G1 --> G3
    G1 --> G4
    G1 --> G5
    G1 --> G6
    G2 --> G3
    G2 --> G7
    C1 --> G1
    S1 --> M4
    S1 --> G2
    S2 --> G3
    S3 --> G4
    G1 --> D1
```

## Protocol Labels

Use these exact labels in the exported visual:
- mobile to peer mobile: `Wi-Fi Direct native socket transport carrying protobuf SyncService RPC frames`
- mobile to Go API: `HTTP + JSON`
- dashboard to Go API: `HTTP + JSON`
- Go internal contract boundary: `gRPC + Protobuf`
- shared schema boundary: `proto/`

## Offline Vs Online Notes

### Offline Path
- auth stays local
- CRDT inventory stays local-first
- PoD stays local
- peer sync uses local radios
- routing and ML overlays continue from preloaded local/system state

### Online / Setup Path
- dashboard loads from Go API
- chaos simulator feeds route failures
- mobile can fetch initial scenario-backed read models before the offline phase

## CAP Theorem Callout

Add this caption under the diagram if you export it:

`CAP choice: AP (Availability + Partition Tolerance). In disaster conditions, nodes must continue operating while partitioned and reconcile later via CRDT merge rules.`
