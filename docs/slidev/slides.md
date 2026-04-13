---
theme: default
title: Huntrix Delta
titleTemplate: '%s'
info: |
  HackFusion 2026 pitch deck for Digital Delta.
drawings:
  enabled: true
transition: fade-out
mdc: true
colorSchema: light
class: text-left
canvasWidth: 1440
seoMeta:
  title: Huntrix Delta
  description: Offline-first disaster logistics for HackFusion 2026.
---

<style>
.slidev-layout {
  font-size: 1.28rem;
  color: #102033;
  background:
    radial-gradient(circle at top left, rgba(14, 165, 233, 0.14), transparent 22%),
    radial-gradient(circle at top right, rgba(245, 158, 11, 0.12), transparent 22%),
    linear-gradient(180deg, #fcfdff 0%, #f4f8fc 100%);
}

.slidev-layout p,
.slidev-layout li,
.slidev-layout td,
.slidev-layout th {
  font-size: 1.16em;
  line-height: 1.56;
}

.slidev-layout h1 {
  letter-spacing: -0.02em;
  color: #0f172a;
}

.soft-card {
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(8px);
}

.arch-grid {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr 1.1fr;
  gap: 1.1rem;
  align-items: stretch;
}

.arch-box {
  border-radius: 1.5rem;
  border: 1px solid rgba(148, 163, 184, 0.32);
  background: rgba(255, 255, 255, 0.94);
  padding: 1rem 1.1rem;
  min-height: 11rem;
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.08);
}

.arch-box h3 {
  margin: 0 0 0.75rem;
  font-size: 1.18rem;
  font-weight: 800;
  color: #0f172a;
}

.arch-box ul {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #334155;
}

.arch-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: #0ea5e9;
  font-weight: 900;
}

.arch-note {
  border-radius: 1.25rem;
  padding: 0.8rem 1rem;
  font-size: 0.95rem;
  line-height: 1.45;
  background: rgba(14, 165, 233, 0.08);
  color: #0f172a;
}

.metric-chip {
  border-radius: 999px;
  padding: 0.55rem 1rem;
  font-size: 0.95rem;
  font-weight: 700;
}

.light-chip-cyan {
  background: rgba(14, 165, 233, 0.12);
  color: #0369a1;
}

.light-chip-emerald {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}

.light-chip-amber {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.light-chip-fuchsia {
  background: rgba(217, 70, 239, 0.12);
  color: #a21caf;
}

.big-grid {
  font-size: 1.05rem;
}

.big-grid strong {
  font-size: 1.08rem;
}
</style>

<div class="grid grid-cols-[1.35fr_0.9fr] gap-8 h-full">
  <div class="flex flex-col justify-center">
    <p class="uppercase tracking-[0.25em] text-sm text-sky-700 mb-4">HackFusion 2026</p>
    <h1 class="text-6xl font-black leading-tight !mb-6">Huntrix Delta</h1>
    <p class="text-3xl leading-relaxed text-slate-700 !mb-8">
      Offline-first disaster logistics for flood response when internet, roads, and trust channels fail at the same time.
    </p>
    <div class="flex gap-3 flex-wrap">
      <span class="metric-chip light-chip-cyan">Expo Mobile</span>
      <span class="metric-chip light-chip-emerald">Go Core</span>
      <span class="metric-chip light-chip-amber">CRDT + Sync</span>
      <span class="metric-chip light-chip-fuchsia">ML Routing</span>
    </div>
  </div>
  <div class="flex flex-col justify-center">
    <div class="soft-card rounded-3xl p-6">
      <p class="text-sm uppercase tracking-[0.18em] text-slate-500 !mb-3">Challenge</p>
      <p class="text-3xl font-bold !mb-4">Digital Delta</p>
      <p class="text-xl leading-9 text-slate-600">
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

<div class="text-2xl leading-10 text-slate-700">

When flood conditions hit:

<v-clicks>

- cellular connectivity becomes unreliable or unavailable
- roads and waterways change faster than static plans
- deliveries still need identity, trust, and handoff proof
- central-server assumptions slow down field response

</v-clicks>

</div>

::right::

<div class="soft-card rounded-3xl p-6 mt-10">
  <p class="text-sm uppercase tracking-[0.16em] text-slate-500 !mb-3">Mission</p>
  <p class="text-2xl leading-10 text-slate-700">
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

<div class="text-3xl leading-[1.55] max-w-5xl text-slate-700">
Huntrix Delta keeps field operations moving with local-first logic, delayed convergence, cryptographic handoff proof, and live rerouting under disaster conditions.
</div>

<!--
Short bridge slide. Move fast to architecture.
-->

---

# Architecture

<div class="arch-grid mt-5">
  <div class="arch-box">
    <h3>Expo Mobile Node</h3>
    <ul>
      <li>offline auth + OTP</li>
      <li>CRDT inventory store</li>
      <li>PoD QR flow</li>
      <li>Wi-Fi Direct peer sync</li>
      <li>on-device risk inference</li>
    </ul>
  </div>
  <div class="arch-arrow">→</div>
  <div class="arch-box">
    <h3>Go Core</h3>
    <ul>
      <li>HTTP API + gRPC API</li>
      <li>routing engine</li>
      <li>predictive penalty engine</li>
      <li>triage engine</li>
      <li>fleet / handoff engine</li>
    </ul>
  </div>
</div>

<div class="grid grid-cols-[1fr_0.9fr_1fr] gap-4 mt-4 items-stretch">
  <div class="arch-box !min-h-[8.2rem]">
    <h3>Shared Contracts + Data</h3>
    <ul>
      <li>proto contracts</li>
      <li>Sylhet scenario data</li>
      <li>ML artifacts</li>
    </ul>
  </div>
  <div class="arch-arrow">↔</div>
  <div class="arch-box !min-h-[8.2rem]">
    <h3>Route Deck</h3>
    <ul>
      <li>Vite + React + Leaflet</li>
      <li>live routes and risk overlays</li>
      <li>judge-facing operations view</li>
    </ul>
  </div>
</div>

<div class="arch-note mt-4">
  <strong>Protocols:</strong> dashboard uses HTTP + JSON, backend contract surface uses gRPC + Protobuf, and the current peer radio path uses protobuf RPC frames over Wi-Fi Direct native sockets.
</div>

<div class="mt-4 grid grid-cols-3 gap-4 text-lg">
  <div class="rounded-2xl bg-sky-500/10 p-4 text-sky-800">Mobile: offline auth, CRDT state, PoD, peer sync</div>
  <div class="rounded-2xl bg-emerald-500/10 p-4 text-emerald-800">Go: routing, triage, orchestration, predictive penalties</div>
  <div class="rounded-2xl bg-amber-500/12 p-4 text-amber-800">Proto: shared contract boundary across app and services</div>
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

<div class="grid grid-cols-2 gap-6 mt-6 text-xl">
  <div class="soft-card rounded-3xl p-6">
    <p class="uppercase tracking-[0.18em] text-sm text-slate-500 !mb-4">Offline Path</p>
    <ol class="leading-10 text-slate-700">
      <li>1. Offline auth and audit integrity</li>
      <li>2. CRDT merge and conflict resolution</li>
      <li>3. Proof-of-delivery QR handshake</li>
      <li>4. Two-device peer sync</li>
    </ol>
  </div>
  <div class="soft-card rounded-3xl p-6">
    <p class="uppercase tracking-[0.18em] text-sm text-slate-500 !mb-4">Decision Layer</p>
    <ol class="leading-10 text-slate-700">
      <li>5. Route failure injection</li>
      <li>6. Triage preemption</li>
      <li>7. Predictive reroute</li>
      <li>8. Hybrid fleet handoff</li>
    </ol>
  </div>
</div>

<div class="mt-8 text-2xl text-slate-700">
  Built to fit the judge slot in <span class="text-sky-700 font-bold">10 minutes</span>.
</div>

<!--
This slide anchors the narrative before the actual demo.
-->

---

# Module Coverage

<div class="grid grid-cols-4 gap-4 mt-6 big-grid">
  <div class="soft-card rounded-2xl p-4"><strong>M1</strong><br>Offline OTP, keys, RBAC, audit log</div>
  <div class="soft-card rounded-2xl p-4"><strong>M2</strong><br>CRDT, vector clocks, peer sync proof</div>
  <div class="soft-card rounded-2xl p-4"><strong>M3</strong><br>Store-and-forward relay + encrypted mesh proof</div>
  <div class="soft-card rounded-2xl p-4"><strong>M4</strong><br>Multimodal routing + live route deck</div>
  <div class="soft-card rounded-2xl p-4"><strong>M5</strong><br>Signed QR PoD + replay rejection</div>
  <div class="soft-card rounded-2xl p-4"><strong>M6</strong><br>SLA breach prediction + preemption</div>
  <div class="soft-card rounded-2xl p-4"><strong>M7</strong><br>Route decay ML + reroute penalties</div>
  <div class="soft-card rounded-2xl p-4"><strong>M8</strong><br>Drone-required zones + rendezvous logic</div>
</div>

<div class="mt-8 soft-card rounded-2xl p-4 text-xl text-slate-700">
  Strategy: prioritize <strong>6–7 strong modules</strong> with end-to-end proof over shallow coverage everywhere.
</div>

<!--
Keep it honest. Say M2.4 is strongest with two-device proof but still has a transport caveat.
-->

---
layout: two-cols
---

# ML And Intelligence

<div class="text-2xl text-slate-700 leading-10">

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

</div>

::right::

<div class="soft-card rounded-3xl p-6 mt-6">
  <p class="uppercase tracking-[0.16em] text-sm text-slate-500 !mb-4">Integration</p>
  <ul class="leading-10 text-xl text-slate-700">
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

<div class="grid grid-cols-2 gap-5 mt-4 text-lg">
  <div class="soft-card rounded-2xl p-5">
    <p class="text-sky-700 font-bold !mb-2">Peer Sync</p>
    <p class="text-slate-700">Two-device Wi-Fi Direct transport carrying protobuf SyncService RPC frames.</p>
  </div>
  <div class="soft-card rounded-2xl p-5">
    <p class="text-amber-700 font-bold !mb-2">Route Response</p>
    <p class="text-slate-700">Failure injection triggers recomputation and updated active routes.</p>
  </div>
  <div class="soft-card rounded-2xl p-5">
    <p class="text-fuchsia-700 font-bold !mb-2">Proof of Delivery</p>
    <p class="text-slate-700">Signed challenge, countersigned receipt, replay rejection, receipt chain.</p>
  </div>
  <div class="soft-card rounded-2xl p-5">
    <p class="text-emerald-700 font-bold !mb-2">Priority Logic</p>
    <p class="text-slate-700">Triage engine preempts lower-priority cargo when critical SLA breach risk appears.</p>
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

<div class="mt-10 text-2xl text-slate-700">
  Huntrix Delta is built to keep relief operations moving when connectivity is the first thing to fail.
</div>

<!--
Close with confidence but keep the transport caveat honest if judges ask.
-->
