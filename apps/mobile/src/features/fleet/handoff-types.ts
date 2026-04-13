import type { AuthRole } from '@/src/features/auth/auth-types';

export type HandoffStatus =
  | 'boat_arrived'
  | 'challenge_generated'
  | 'countersigned'
  | 'ownership_transferred';

export type HandoffOwnershipRecord = {
  handoff_id: string;
  scenario_id: string;
  delivery_id: string;
  cargo_id: string;
  rendezvous_node_id: string;
  rendezvous_label: string;
  from_owner: string;
  to_owner: string;
  from_role: AuthRole;
  to_role: AuthRole;
  pod_receipt_id: string;
  pod_receipt_hash: string;
  vector_clock: Record<string, number>;
  last_writer: string;
  updated_at: string;
  status: HandoffStatus;
};
