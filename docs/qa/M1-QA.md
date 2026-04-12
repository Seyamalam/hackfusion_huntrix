# M1 QA

## Goal
Validate `Module 1 - Secure Authentication & Identity Management` against the official problem statement.

Targets:
- `M1.1` offline `TOTP/HOTP`
- `M1.2` per-device keypair provisioning
- `M1.3` named RBAC roles with enforced permissions
- `M1.4` tamper-evident auth logs with corruption detection

## Test Environment
- Expo app running locally or in a development build
- `Auth` tab
- `Deliveries` and `Network` tabs for permission-enforcement checks

## M1.1 Mobile OTP Generation

### Steps
1. Open `Auth`.
2. Observe the `Offline TOTP` card.
3. Wait for the countdown to approach zero.
4. Confirm the TOTP regenerates automatically.
5. Press `Generate HOTP`.

### Pass Criteria
- TOTP is generated offline
- countdown is visible
- expiry/regeneration is visible
- HOTP can be generated locally

## M1.2 Asymmetric Key Pair Provisioning

### Steps
1. Open `Auth`.
2. Inspect the `Per-device Ed25519 identity` card.
3. Confirm a public-key fingerprint is shown.
4. Confirm `Identity ledger entries` is non-zero.

### Pass Criteria
- per-device keypair exists
- public key fingerprint is visible
- public key is recorded into the local identity ledger
- private key is stored through the app’s secure storage path

## M1.3 Role-Based Access Control

### Required Roles
- Field Volunteer
- Supply Manager
- Drone Operator
- Camp Commander
- Sync Admin

### Steps
1. Open `Auth`.
2. Switch between roles.
3. Inspect the `RBAC data-layer policy` section.
4. Go to `Deliveries`:
   - with `Field Volunteer`, try `Run Conflict`
   - with `Supply Manager`, try `Run Conflict`
   - with `Supply Manager`, try `Keep Local`
   - with `Camp Commander`, try `Keep Local`
5. Go to `Network`:
   - with a non-`Sync Admin` role, try `Send Handshake` / `Send Delta Bundle`
   - with `Sync Admin`, try them again

### Pass Criteria
- exact named roles exist
- permissions matrix is visible
- inventory mutation is blocked for unauthorized roles
- conflict resolution is blocked for unauthorized roles
- sync send actions are blocked for unauthorized roles
- allowed roles can perform the action

## M1.4 Audit Trail & Immutable Login Logs

### Steps
1. Open `Auth`.
2. Press `Valid Login`.
3. Press `Invalid Login`.
4. Press `Tamper Log`.
5. Press `Verify Chain`.
6. If current role is `Sync Admin`, press `Rotate Secret`.

### Pass Criteria
- login success event is logged
- login failure event is logged
- tampering is detected
- tamper detection event is logged
- key rotation event is logged when authorized
- unauthorized key rotation attempt is denied and logged

## Evidence to Capture
- TOTP countdown and regenerated code
- HOTP generation
- public-key fingerprint and identity-ledger entry count
- permission matrix screenshot
- denied action in `Deliveries` or `Network`
- tamper detection result
- latest audit-log entries

## Current Honest Status
- `M1.1`: implemented
- `M1.2`: implemented for app-level device provisioning and local identity ledger
- `M1.3`: implemented with named roles and enforced permission checks on protected actions
- `M1.4`: implemented with hash chaining and corruption detection

## Caveat
For judging language, the strongest claim is:
- private key uses secure local storage in the app path
- public key is recorded in the local identity ledger

If judges press specifically on hardware-backed keystore semantics, be precise about what the current Expo/storage path guarantees on the tested device.
