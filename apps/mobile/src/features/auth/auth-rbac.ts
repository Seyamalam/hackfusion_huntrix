import type { AuthRole } from '@/src/features/auth/auth-types';

export type AuthAction =
  | 'mutate_inventory'
  | 'resolve_conflict'
  | 'rotate_secret'
  | 'send_sync'
  | 'view_audit_log';

const ROLE_PERMISSIONS: Record<AuthRole, AuthAction[]> = {
  field_volunteer: [],
  supply_manager: ['mutate_inventory'],
  drone_operator: [],
  camp_commander: ['mutate_inventory', 'resolve_conflict'],
  sync_admin: ['mutate_inventory', 'resolve_conflict', 'rotate_secret', 'send_sync', 'view_audit_log'],
};

export function canPerform(role: AuthRole, action: AuthAction) {
  return ROLE_PERMISSIONS[role].includes(action);
}

export function permissionMatrix() {
  return ROLE_PERMISSIONS;
}
