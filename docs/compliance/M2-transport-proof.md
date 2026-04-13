# M2 Transport Proof

## Goal

Provide the strongest honest proof for `M2.4` using the current Wi-Fi Direct socket-RPC design.

This document is intentionally precise:
- peer radio transport: yes
- protobuf service message contract: yes
- full native HTTP/2 gRPC stack on both phones: not yet

## What The Current Design Proves

Two Android phones can:
- discover each other over Wi-Fi Direct
- create a peer group with one device acting as group owner
- form a peer group with no internet
- exchange protobuf packets over the native peer socket path
- carry `SyncService` request/response message shapes
- apply CRDT inventory deltas and sync PoD receipts
- surface accepted and rejected operation counts
- request pending envelopes through a `PullPending` frame

## Payload Contract

The Wi-Fi Direct channel now carries these protobuf RPC-aligned frames:
- mesh handshake frame for replica identity and vector clock exchange
- `ExchangeBundleRequest`
- `ExchangeBundleResponse`
- `PullPendingRequest`
- `PullPendingResponse`

Relevant files:
- [sync.proto](/C:/Users/user/Desktop/hackfusion_huntrix/proto/sync.proto:67)
- [sync-protobuf-wire.ts](/C:/Users/user/Desktop/hackfusion_huntrix/apps/mobile/src/features/sync-demo/sync-protobuf-wire.ts:1)
- [use-wifi-direct.ts](/C:/Users/user/Desktop/hackfusion_huntrix/apps/mobile/src/features/wifi-direct/use-wifi-direct.ts:1)

## Two-Phone Proof Flow

### Before Judges Arrive

1. Install the Expo dev build on both Android phones.
2. Start the local backend once.
3. Open the app on both devices.
4. Confirm the `Network` tab loads and `Init Wi-Fi Direct` works.

### During The Demo

1. On both phones, open `Network`.
2. Tap `Init Wi-Fi Direct`.
3. On one phone, tap `Create Group`.
4. On the other phone, tap `Discover Peers`.
5. Connect to the discovered peer.
6. Mutate local inventory differently on each phone.
7. Tap `Send Handshake`.
8. Tap `Send Delta Bundle`.
9. Tap `Pull Pending`.

## Judge-Facing Evidence On Screen

Use the `Judge Proof` card first.

It should show:
- `Wi-Fi Direct Ready`
- `Peer Group Formed`
- `Handshake Sent`
- `Handshake Seen`
- `Exchange Ack Seen`
- `PullPending Seen`

Also point at:
- transport channel: `Wi-Fi Direct native socket messaging`
- group details: `Group name` and `Group owner`
- payload contract: `Protobuf SyncService request/response frames`
- last RPC method
- last RPC direction
- last correlation id

Then use `Session Summary`:
- accepted ops
- rejected ops
- pending envelopes
- records in bundle
- merged records
- receipts synced
- payload bytes

## Capture Checklist

Capture these for submission backup:
- photo or screen recording of both phones in the `Network` tab
- peer discovery visible on both devices
- connected peer group visible
- `Judge Proof` card showing all success pills
- `Session Summary` values after `ExchangeBundle`
- `Session Log` showing:
- handshake
- `ExchangeBundle request`
- `ExchangeBundle response`
- `PullPending request`
- `PullPending response`

## Exact Honest Wording

If judges ask whether this is “gRPC”:

Use this answer:

`The peer radio path is real Wi-Fi Direct between two phones. The payloads are protobuf RPC frames aligned with the SyncService contract, including request and response message types. The remaining gap is that this channel is still carried over native socket messaging rather than a full on-device HTTP/2 gRPC runtime on both phones.`

## Why This Still Matters

This proof is still strong because it demonstrates:
- real disconnected peer-to-peer transport
- contract fidelity with the checked-in protobuf service schema
- deterministic CRDT merge behavior
- operation-level sync evidence
- no central server dependency during the critical exchange
