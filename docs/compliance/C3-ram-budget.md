# C3 RAM Budget

Actual profiler evidence still requires a connected Android or iOS device.

Current captured evidence:
- Java heap snapshot: `46.36 MB`
- Native remaining size: `7,062,487 bytes` (`~6.74 MB`)
- Screenshot: [native-memory.png](C:\Users\user\Desktop\hackfusion_huntrix\docs\compliance\c3_profiler\native-memory.png)

Use this checklist for proof capture:

1. Launch the Expo dev build on a physical Android device.
2. Connect Android Studio Profiler.
3. Exercise:
   - CRDT merge in `Deliveries`
   - Wi-Fi Direct sync in `Network`
   - route/triage/predictive panels in `Command`
4. Capture peak memory.
5. Export screenshots showing peak below `150 MB`.

Optional command-line snapshot:

```bash
adb shell dumpsys meminfo com.seyamalam.huntrixdelta
```

Store screenshots or dumps in:

```text
docs/compliance/c3_profiler/
```
