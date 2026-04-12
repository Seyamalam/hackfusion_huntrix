# Pitch Deck Outline

Target: `5 minutes`, maximum `10 slides`

This outline is optimized for the HackFusion rubric and the strongest current demo story.

## Slide 1 - Title

Title:
- `Huntrix Delta`

Subtitle:
- `Offline-First Disaster Logistics For Flood Response`

Say:
- we built a resilient logistics system for disaster response when internet and roads fail at the same time

## Slide 2 - Problem

Cover:
- flood conditions in Sylhet and surrounding districts
- communications collapse
- commercial logistics assumptions break
- relief coordination becomes fragmented and slow

Say:
- the hard part is not just routing
- it is identity, delivery trust, sync, and prioritization under partition

## Slide 3 - Solution

Show:
- one-sentence system summary
- mobile nodes
- local-first data model
- routing + triage + predictive ML
- cryptographic PoD

Say:
- our system keeps field operations moving with local logic first and delayed convergence later

## Slide 4 - Architecture

Base this slide on:
- [docs/architecture-diagram.md](/C:/Users/user/Desktop/hackfusion_huntrix/docs/architecture-diagram.md:1)

Cover:
- Expo mobile node
- Go core services
- protobuf contracts
- chaos simulator
- Vite route dashboard
- ML training/artifacts

Say:
- contracts are shared through protobuf
- backend logic lives in Go
- mobile remains offline-first

## Slide 5 - Key Engineering Decisions

Use flat bullets:
- `AP` over strict consistency because partitions are expected
- CRDT + vector clocks for replicated inventory state
- Ed25519, SHA-256, AES-256-GCM for trust and delivery verification
- Wi-Fi Direct peer sync carrying protobuf RPC frames
- simple logistic regression for interpretable route risk scoring

## Slide 6 - Live Demo Path

Timeline:
1. offline auth
2. CRDT conflict merge
3. PoD QR handshake
4. peer sync between devices
5. route failure injection
6. triage preemption
7. predictive reroute
8. hybrid fleet handoff

Say:
- this is the exact order that fits inside the judge slot

## Slide 7 - Module Coverage

Use a concise score-style grid:
- `M1` auth and audit
- `M2` CRDT and sync
- `M3` mesh relay
- `M4` multimodal routing
- `M5` proof of delivery
- `M6` triage preemption
- `M7` predictive route decay
- `M8` hybrid fleet orchestration

Say:
- we prioritized end-to-end proof over shallow breadth

## Slide 8 - ML And Intelligence

Cover:
- feature set
- train/test split
- precision / recall / F1
- on-device inference
- route penalty integration

Source:
- [docs/model-card.md](/C:/Users/user/Desktop/hackfusion_huntrix/docs/model-card.md:1)

## Slide 9 - Demo Result Summary

Show:
- two-device peer exchange proof
- route recalculation under failure
- PoD replay rejection
- triage preemption decision
- drone-required zone and rendezvous output

Say:
- the system remains useful even when disconnected for most of the scenario

## Slide 10 - Roadmap

Near-term:
- full on-device HTTP/2 gRPC transport
- stronger real-device sync hardening
- exported architecture and model-card PDFs

Future:
- real field datasets
- production secure storage hardening
- larger-scale peer mesh stress tests

## Speaker Notes

### Keep Emphasis On
- offline-first behavior
- real engineering trade-offs
- judged proof moments
- honesty about the remaining sync transport caveat

### Avoid Overselling

Do not say:
- `full production-ready mesh`
- `fully complete native gRPC peer stack`

Prefer:
- `real two-device Wi-Fi Direct peer transport with protobuf RPC frames`
- `strong partial-to-high-credit evidence for M2.4, with native transport hardening still remaining`
