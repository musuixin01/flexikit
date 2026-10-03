export const ADMIN_READ_PERMISSIONS = [
  'admin.overview.read',
  'admin.users.read',
  'admin.ai-usage.read',
  'admin.audit.read',
] as const;

export const ADMIN_WRITE_PERMISSIONS = [
  'admin.users.status.write',
  'admin.users.delete.write',
] as const;

export const ADMIN_BOOTSTRAP_PERMISSIONS = [
  'admin.users.role.write',
] as const;

export const ADMIN_PERMISSIONS = [
  ...ADMIN_READ_PERMISSIONS,
  ...ADMIN_WRITE_PERMISSIONS,
  ...ADMIN_BOOTSTRAP_PERMISSIONS,
] as const;

export type AdminPermission = typeof ADMIN_PERMISSIONS[number];
export type AdminAccessMode = 'persistent-admin' | 'bootstrap-admin';

export function parseAdminUserIds(raw: string | undefined): ReadonlySet<number> {
  if (!raw?.trim()) return new Set<number>();

  const userIds = new Set<number>();
  for (const value of raw.split(',')) {
    const normalized = value.trim();
    if (!/^\d+$/.test(normalized)) continue;

    const userId = Number(normalized);
    if (Number.isSafeInteger(userId) && userId > 0) {
      userIds.add(userId);
    }
  }
  return userIds;
}
