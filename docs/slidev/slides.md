---
theme: default
title: Huntrix Delta
titleTemplate: '%s'
info: |
  HackFusion 2026 pitch deck for Digital Delta.
drawings:
  enabled: true
transition: slide-left
mdc: true
colorSchema: dark
class: text-left
canvasWidth: 1440
seoMeta:
  title: Huntrix Delta
  description: Offline-first disaster logistics for HackFusion 2026.
---

<div class="grid grid-cols-[1.35fr_0.9fr] gap-8 h-full">
  <div class="flex flex-col justify-center">
    <p class="uppercase tracking-[0.25em] text-sm text-cyan-300 mb-4">HackFusion 2026</p>
    <h1 class="text-6xl font-black leading-tight !mb-6">Huntrix Delta</h1>
    <p class="text-2xl leading-relaxed text-slate-200 !mb-8">
      Offline-first disaster logistics for flood response when internet, roads, and trust channels fail at the same time.
    </p>
    <div class="flex gap-3 flex-wrap">
      <span class="px-4 py-2 rounded-full bg-cyan-500/15 text-cyan-200">Expo Mobile</span>
      <span class="px-4 py-2 rounded-full bg-emerald-500/15 text-emerald-200">Go Core</span>
      <span class="px-4 py-2 rounded-full bg-amber-500/15 text-amber-200">CRDT + Sync</span>
      <span class="px-4 py-2 rounded-full bg-fuchsia-500/15 text-fuchsia-200">ML Routing</span>
    </div>
  </div>
  <div class="flex flex-col justify-center">
    <div class="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
      <p class="text-sm uppercase tracking-[0.18em] text-slate-400 !mb-3">Challenge</p>
      <p class="text-3xl font-bold !mb-4">Digital Delta</p>
      <p class="text-base leading-7 text-slate-300">
        Resilient logistics and mesh triage for disaster response in flood conditions across Bangladesh.
      </p>
    </div>
  </div>
</div>

<!--
Open with the problem and the one-line value proposition. Keep this under 20 seconds.
-->

---
layout: two-cols
---

# Problem

When flood conditions hit:

<v-clicks>

- cellular connectivity becomes unreliable or unavailable
- roads and waterways change faster than static plans
- deliveries still need identity, trust, and handoff proof
- central-server assumptions slow down field response

</v-clicks>

::right::

<div class="rounded-3xl border border-white/10 bg-slate-900/70 p-6 mt-10">
  <p class="text-sm uppercase tracking-[0.16em] text-slate-400 !mb-3">Mission</p>
  <p class="text-xl leading-8 text-slate-200">
    Coordinate relief across volunteers, boats, drones, and field camps even when the internet is unavailable for most of the operation timeline.
  </p>
</div>

<!--
Emphasize that this is not only a routing problem. It is sync, trust, and prioritization under partition.
-->

---
layout: section
---

# Solution

Huntrix Delta keeps field operations moving with local-first logic, delayed convergence, cryptographic handoff proof, and live rerouting under disaster conditions.

<!--
Short bridge slide. Move fast to architecture.
-->

---

# Architecture

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
    end

    subgraph Shared["Contracts + Data"]
        S1["Proto Contracts"]
        S2["Scenario Data"]
        S3["ML Artifacts"]
    end

    subgraph Dashboard["Route Deck"]
        D1["Vite + Leaflet"]
    end

    M4 <-- "protobuf RPC frames over Wi-Fi Direct sockets" --> M4
    M2 --> G1
    G1 --> G3
    G1 --> G4
    G1 --> G5
    G1 --> G6
    G2 --> G3
    S1 --> M4
    S1 --> G2
    S2 --> G3
    S3 --> G4
    G1 --> D1
```

<div class="mt-4 grid grid-cols-3 gap-4 text-sm">
  <div class="rounded-2xl bg-cyan-500/10 p-3">Mobile: offline auth, CRDT state, PoD, peer sync</div>
  <div class="rounded-2xl bg-emerald-500/10 p-3">Go: routing, triage, orchestration, predictive penalties</div>
  <div class="rounded-2xl bg-amber-500/10 p-3">Proto: shared contract boundary across app and services</div>
</div>

<!--
Call out the contract-first architecture and the practical transport honesty.
-->

---
layout: two-cols-header
---

# Key Engineering Decisions

::left::

<v-clicks>

- **AP over strict consistency**
  field devices continue operating while partitioned, then converge later
- **CRDT + vector clocks**
  inventory state merges deterministically and conflicts stay visible
- **Ed25519 + SHA-256 + AES-256-GCM**
  identity, delivery proof, and encrypted mesh payloads

</v-clicks>

::right::

<v-clicks>

- **Protobuf-first contracts**
  shared schema boundary across mobile, backend, and sync packets
- **Wi-Fi Direct peer transport**
  real phone-to-phone transport carrying protobuf RPC frames
- **Simple interpretable ML**
  logistic regression for explainable route-risk scoring

</v-clicks>

<!--
Say clearly: strongest caveat is transport semantics, not schema semantics.
-->

---

# Live Demo Path

<div class="grid grid-cols-2 gap-6 mt-6">
  <div class="rounded-3xl border border-white/10 bg-white/5 p-6">
    <p class="uppercase tracking-[0.18em] text-sm text-slate-400 !mb-4">Offline Path</p>
    <ol class="leading-8 text-slate-100">
      <li>1. Offline auth and audit integrity</li>
      <li>2. CRDT merge and conflict resolution</li>
      <li>3. Proof-of-delivery QR handshake</li>
      <li>4. Two-device peer sync</li>
    </ol>
  </div>
  <div class="rounded-3xl border border-white/10 bg-white/5 p-6">
    <p class="uppercase tracking-[0.18em] text-sm text-slate-400 !mb-4">Decision Layer</p>
    <ol class="leading-8 text-slate-100">
      <li>5. Route failure injection</li>
      <li>6. Triage preemption</li>
      <li>7. Predictive reroute</li>
      <li>8. Hybrid fleet handoff</li>
    </ol>
  </div>
</div>

<div class="mt-8 text-lg text-slate-300">
  Built to fit the judge slot in <span class="text-cyan-300 font-bold">10 minutes</span>.
</div>

<!--
This slide anchors the narrative before the actual demo.
-->

---

# Module Coverage

<div class="grid grid-cols-4 gap-4 mt-6 text-sm">
  <div class="rounded-2xl bg-emerald-500/12 p-4"><strong>M1</strong><br>Offline OTP, keys, RBAC, audit log</div>
  <div class="rounded-2xl bg-amber-500/12 p-4"><strong>M2</strong><br>CRDT, vector clocks, peer sync proof</div>
  <div class="rounded-2xl bg-cyan-500/12 p-4"><strong>M3</strong><br>Store-and-forward relay + encrypted mesh proof</div>
  <div class="rounded-2xl bg-orange-500/12 p-4"><strong>M4</strong><br>Multimodal routing + live route deck</div>
  <div class="rounded-2xl bg-fuchsia-500/12 p-4"><strong>M5</strong><br>Signed QR PoD + replay rejection</div>
  <div class="rounded-2xl bg-rose-500/12 p-4"><strong>M6</strong><br>SLA breach prediction + preemption</div>
  <div class="rounded-2xl bg-sky-500/12 p-4"><strong>M7</strong><br>Route decay ML + reroute penalties</div>
  <div class="rounded-2xl bg-lime-500/12 p-4"><strong>M8</strong><br>Drone-required zones + rendezvous logic</div>
</div>

<div class="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">
  Strategy: prioritize <strong>6–7 strong modules</strong> with end-to-end proof over shallow coverage everywhere.
</div>

<!--
Keep it honest. Say M2.4 is strongest with two-device proof but still has a transport caveat.
-->

---
layout: two-cols
---

# ML And Intelligence

<v-clicks>

- model: logistic regression
- features:
  - cumulative rainfall
  - rainfall rate change
  - elevation
  - soil saturation proxy
- train/test split: `80 / 20`
- threshold: `0.7`
- current metrics:
  - precision `1.0`
  - recall `0.8333`
  - F1 `0.9091`

</v-clicks>

::right::

<div class="rounded-3xl border border-white/10 bg-white/5 p-6 mt-6">
  <p class="uppercase tracking-[0.16em] text-sm text-slate-400 !mb-4">Integration</p>
  <ul class="leading-8 text-slate-200">
    <li>risk scores feed routing penalties</li>
    <li>dashboard overlays show confidence</li>
    <li>mobile app runs on-device inference from exported coefficients</li>
  </ul>
</div>

<!--
One honest sentence: this is a hackathon-quality synthetic dataset, but the model is integrated and visible.
-->

---

# Demo Result Summary

<div class="grid grid-cols-2 gap-5 mt-4">
  <div class="rounded-2xl bg-white/5 p-5 border border-white/10">
    <p class="text-cyan-300 font-bold !mb-2">Peer Sync</p>
    <p class="text-slate-200">Two-device Wi-Fi Direct transport carrying protobuf SyncService RPC frames.</p>
  </div>
  <div class="rounded-2xl bg-white/5 p-5 border border-white/10">
    <p class="text-amber-300 font-bold !mb-2">Route Response</p>
    <p class="text-slate-200">Failure injection triggers recomputation and updated active routes.</p>
  </div>
  <div class="rounded-2xl bg-white/5 p-5 border border-white/10">
    <p class="text-fuchsia-300 font-bold !mb-2">Proof of Delivery</p>
    <p class="text-slate-200">Signed challenge, countersigned receipt, replay rejection, receipt chain.</p>
  </div>
  <div class="rounded-2xl bg-white/5 p-5 border border-white/10">
    <p class="text-emerald-300 font-bold !mb-2">Priority Logic</p>
    <p class="text-slate-200">Triage engine preempts lower-priority cargo when critical SLA breach risk appears.</p>
  </div>
</div>

<!--
This is your “what the judges just saw” slide.
-->

---
layout: end
---

# Roadmap

<div class="grid grid-cols-2 gap-8 mt-6">
  <div>
    <p class="uppercase tracking-[0.16em] text-sm text-slate-400 !mb-4">Near Term</p>
    <ul class="leading-8 text-slate-200">
      <li>full on-device HTTP/2 gRPC transport</li>
      <li>more robust two-phone sync hardening</li>
      <li>final exported architecture and model-card PDFs</li>
    </ul>
  </div>
  <div>
    <p class="uppercase tracking-[0.16em] text-sm text-slate-400 !mb-4">Future</p>
    <ul class="leading-8 text-slate-200">
      <li>real field datasets and calibration</li>
      <li>hardware-backed storage hardening</li>
      <li>larger mesh stress testing and delivery drills</li>
    </ul>
  </div>
</div>

<div class="mt-10 text-xl text-slate-100">
  Huntrix Delta is built to keep relief operations moving when connectivity is the first thing to fail.
</div>

<!--
Close with confidence but keep the transport caveat honest if judges ask.
-->
