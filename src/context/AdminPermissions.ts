export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'VIEWER';

export interface AdminPermissionSet {
  canViewConfig: boolean;
  canEditConfig: boolean;
  canTestIntegration: boolean;
  canRotateCredentials: boolean;
  canManageFeatureFlags: boolean;
  canDeleteProvider: boolean;
  canSetPrimary: boolean;
  canViewAuditLog: boolean;
  canEnableDisable: boolean;
  canRefreshCache: boolean;
}

const ROLE_DEFAULTS: Record<AdminRole, AdminPermissionSet> = {
  SUPER_ADMIN: {
    canViewConfig:          true,
    canEditConfig:          true,
    canTestIntegration:     true,
    canRotateCredentials:   true,
    canManageFeatureFlags:  true,
    canDeleteProvider:      true,
    canSetPrimary:          true,
    canViewAuditLog:        true,
    canEnableDisable:       true,
    canRefreshCache:        true,
  },
  ADMIN: {
    canViewConfig:          true,
    canEditConfig:          true,
    canTestIntegration:     true,
    canRotateCredentials:   false,
    canManageFeatureFlags:  true,
    canDeleteProvider:      false,
    canSetPrimary:          true,
    canViewAuditLog:        true,
    canEnableDisable:       true,
    canRefreshCache:        false,
  },
  VIEWER: {
    canViewConfig:          true,
    canEditConfig:          false,
    canTestIntegration:     false,
    canRotateCredentials:   false,
    canManageFeatureFlags:  false,
    canDeleteProvider:      false,
    canSetPrimary:          false,
    canViewAuditLog:        true,
    canEnableDisable:       false,
    canRefreshCache:        false,
  },
};

export function getPermissions(
  role: string,
  overrides: Record<string, boolean> = {},
): AdminPermissionSet {
  const base = ROLE_DEFAULTS[(role as AdminRole)] ?? ROLE_DEFAULTS.VIEWER;
  return { ...base, ...overrides } as AdminPermissionSet;
}

export function roleLabel(role: string): string {
  if (role === 'SUPER_ADMIN') return 'Super Admin';
  if (role === 'ADMIN') return 'Admin';
  return 'Viewer';
}
