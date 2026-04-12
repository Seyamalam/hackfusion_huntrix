# Submission Checklist

This checklist maps the official HackFusion deliverables and scoring risks to the current repository state.

Use this file as the final pre-submission control sheet.

## Deliverables

### D1 - GitHub Repository

Status: `Mostly Ready`

Required items:
- public repo with full source
- setup instructions in `README.md`
- architecture diagram in `docs/`
- `.proto` schema files
- root `DEMO.md`

Current evidence:
- setup instructions: [README.md](/C:/Users/user/Desktop/hackfusion_huntrix/README.md:1)
- root walkthrough: [DEMO.md](/C:/Users/user/Desktop/hackfusion_huntrix/DEMO.md:1)
- architecture doc: [docs/architecture.md](/C:/Users/user/Desktop/hackfusion_huntrix/docs/architecture.md:1)
- export-ready diagram doc: [docs/architecture-diagram.md](/C:/Users/user/Desktop/hackfusion_huntrix/docs/architecture-diagram.md:1)
- proto contracts: [proto/](/C:/Users/user/Desktop/hackfusion_huntrix/proto)

Still do:
- export one final architecture image or PDF into `docs/`

### D2 - Working Prototype Demo

Status: `Needs Final Rehearsal`

Must demonstrate in `10 minutes`:
- offline sync with `2` devices
- route recalculation on failure injection
- PoD handshake
- triage preemption

Current evidence and scripts:
- main script: [DEMO.md](/C:/Users/user/Desktop/hackfusion_huntrix/DEMO.md:1)
- M2 transport proof: [docs/compliance/M2-transport-proof.md](/C:/Users/user/Desktop/hackfusion_huntrix/docs/compliance/M2-transport-proof.md:1)
- module QA docs: [docs/qa/](/C:/Users/user/Desktop/hackfusion_huntrix/docs/qa)

Still do:
- full two-phone rehearsal
- capture screenshots/video proof during the final rehearsal

### D3 - System Architecture Diagram

Status: `Content Ready, Export Pending`

Required content:
- components
- communication protocols
- offline vs online data flow
- CAP theorem choice with justification

Current evidence:
- architecture narrative: [docs/architecture.md](/C:/Users/user/Desktop/hackfusion_huntrix/docs/architecture.md:1)
- export-ready diagram source: [docs/architecture-diagram.md](/C:/Users/user/Desktop/hackfusion_huntrix/docs/architecture-diagram.md:1)

Still do:
- export to `PNG`, `PDF`, or `drawio` asset in `docs/`

### D4 - ML Model Card

Status: `Content Ready, PDF Pending`

Required content:
- model type
- dataset description
- train/test split
- precision / recall / F1
- edge cases

Current evidence:
- model card source: [docs/model-card.md](/C:/Users/user/Desktop/hackfusion_huntrix/docs/model-card.md:1)
- metrics artifact: [ml/artifacts/route_decay_metrics.json](/C:/Users/user/Desktop/hackfusion_huntrix/ml/artifacts/route_decay_metrics.json:1)

Still do:
- export to final `1-page PDF`

### D5 - 5-Minute Pitch Deck

Status: `Outline Ready, Deck Pending`

Required content:
- problem framing
- architecture overview
- key engineering decisions
- live demo summary
- roadmap

Current evidence:
- deck outline: [docs/pitch-deck-outline.md](/C:/Users/user/Desktop/hackfusion_huntrix/docs/pitch-deck-outline.md:1)

Still do:
- turn outline into `.pptx` or `.pdf`

### D6 - Video Walkthrough

Status: `Optional / Not Started`

Bonus only.

Recommended if time remains:
- record one full narrated run across all modules

## Module Confidence

### High Confidence
- `M1`
- `M4`
- `M5`
- `M6`
- `M7`
- `M8`

### Medium Confidence
- `M2.1` to `M2.3`
- `M3`
- Track A dashboard polish

### Main Risk
- `M2.4`

Reason:
- strongest current proof is real Wi-Fi Direct peer transport carrying protobuf `SyncService` RPC frames over native sockets
- this is strong demo evidence
- it is still not a full native HTTP/2 gRPC runtime between both phones

## Final Test Sequence

1. `Auth` tab: OTP, keypair, RBAC, tamper log
2. `Deliveries` tab: causal merge, conflict resolution, PoD flow
3. `Network` tab on `2` phones: handshake, exchange bundle, pull pending
4. dashboard: route failure, predictive risk, triage preemption, fleet orchestration
5. full offline rehearsal using [DEMO.md](/C:/Users/user/Desktop/hackfusion_huntrix/DEMO.md:1)

## Final Packaging Sequence

1. export architecture diagram
2. export model card PDF
3. build pitch deck PDF or PPTX
4. run final rehearsal
5. capture proof screenshots
6. submit repo + docs + deck + PDFs
