# M5 QA

Module 5 covers:
- `M5.1` signed QR challenge-response handshake
- `M5.2` tamper-evidence and replay protection
- `M5.3` delivery receipt chain propagated through the sync ledger

## Setup

Run the mobile app:

```bash
cd apps/mobile
$env:EXPO_PUBLIC_API_BASE_URL="http://YOUR_COMPUTER_LAN_IP:8080"
bun run start
```

If you want to prove receipt propagation too, also run the Wi-Fi Direct sync flow from Module 2 on two Android dev builds.

## Role Setup

Use the `Auth` tab first:
- set sender role to `field_volunteer` or `supply_manager`
- set recipient role to `camp_commander`

For a single-device demo:
1. generate the driver QR as the sender role
2. switch role in the `Auth` tab
3. return to `Deliveries`
4. countersign as `camp_commander`
5. switch back to sender role
6. finalize the receipt

## M5.1 Signed QR Handshake

In `Deliveries`:

1. set a `Delivery ID`
2. set a `Payload Summary`
3. tap `Generate Driver QR`
4. confirm a QR appears under `Signed sender QR`
5. tap `Simulate Recipient Scan` or use the camera scanner from another device
6. confirm a countersigned QR appears under `Countersigned response QR`
7. tap `Simulate Driver Finalize`

Confirm:
- challenge QR includes delivery metadata and sender signature
- response QR is generated only after sender signature verification
- final status says the receipt was appended to the ledger

## M5.2 Replay And Tamper Protection

Replay:
1. complete one receipt successfully
2. tap `Replay Challenge`
3. confirm the flow is rejected with `POD_ERR_NONCE_USED`

Tamper:
1. generate a fresh driver QR
2. tap `Tamper Challenge`
3. confirm the flow is rejected with a signature-related error code

Confirm:
- replay is rejected locally with no server
- tampered payloads are rejected with a specific code
- used nonce count increases after accepted handshakes

## M5.3 Receipt Chain

1. keep the same `Delivery ID`
2. run the handshake again to create another receipt
3. inspect `Receipt Chain`

Confirm:
- each receipt shows `prev hash` and `receipt hash`
- the chain grows for the same delivery ID
- sender and recipient keys are visible per receipt

For sync propagation:
1. create at least one receipt
2. go to `Network`
3. send a Wi-Fi Direct delta bundle
4. confirm the session summary shows `Receipts synced`
5. on the receiving device, confirm the receipt ledger count increases

## Demo Script

Recommended short flow:

1. Show the sender QR.
2. Switch to the recipient role and countersign it.
3. Switch back to the sender role and finalize it.
4. Replay the same challenge to trigger `POD_ERR_NONCE_USED`.
5. Show the receipt chain and the predecessor hash.
6. Send a sync bundle and point out `Receipts synced`.
