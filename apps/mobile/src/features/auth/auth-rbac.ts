import type { AuthRole } from '@/src/features/auth/auth-types';

export type AuthAction =
  | 'mutate_inventory'
  | 'resolve_conflict'
  | 'rotate_secret'
  | 'send_sync'
  | 'generate_pod'
  | 'countersign_pod'
  | 'verify_pod'
  | 'view_audit_log';

const ROLE_PERMISSIONS: Record<AuthRole, AuthAction[]> = {
  field_volunteer: ['generate_pod', 'verify_pod'],
  supply_manager: ['mutate_inventory', 'generate_pod', 'verify_pod'],
  drone_operator: ['countersign_pod'],
  camp_commander: ['mutate_inventory', 'resolve_conflict', 'countersign_pod'],
  sync_admin: ['mutate_inventory', 'resolve_conflict', 'rotate_secret', 'send_sync', 'generate_pod', 'countersign_pod', 'verify_pod', 'view_audit_log'],
};

export function canPerform(role: AuthRole, action: AuthAction) {
  return ROLE_PERMISSIONS[role].includes(action);
}

export function permissionMatrix() {
  return ROLE_PERMISSIONS;
}
