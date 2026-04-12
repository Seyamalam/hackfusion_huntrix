# C4 Offline Compliance Checklist

Goal: at least `80%` of the demo runs with no internet access.

## Allowed online moments
- initial dashboard load
- initial sync if explicitly needed before the demo sequence

## Offline-safe modules
- `M1` auth and audit
- `M2` local CRDT merge demo
- `M3` mesh relay demo
- `M4` local route/mission interpretation once data is loaded
- `M5` PoD QR signing and countersigning
- `M6` triage interpretation once data is loaded
- `M7` on-device predictor panel
- `M8` orchestration interpretation once data is loaded

## Demo phases

1. Load dashboard once while online.
2. Load mobile app once while online.
3. Disable Wi-Fi and mobile data.
4. Run:
   - Auth tab flow
   - Deliveries CRDT flow
   - PoD flow
   - Network mesh flow
   - Command route / triage / predictive / orchestration panels
5. Re-enable connectivity only after the critical judging phase.

## Capture
- record a short video showing Wi-Fi disabled during the critical phases
- capture screenshots of the device quick settings with Wi-Fi off
- note any feature that still depends on remote API refresh and avoid triggering it mid-demo
