/** Maps API / DB role descriptions to UI slugs used in admin selects. */
export type UiRoleSlug = 'admin' | 'rh' | 'team_leader' | 'candidate';

export function normalizeRoleKey(desc: string): string {
  return desc.toLowerCase().trim().replace(/\s+|_/g, '');
}

/**
 * Resolves a role label from a user payload, handling camelCase and PascalCase.
 */
export function getRoleDescriptionFromUser(u: any): string {
  if (!u) return '';
  const roleObj = u.role ?? u.Role;
  if (roleObj != null && typeof roleObj === 'object') {
    return String(roleObj.description ?? roleObj.Description ?? '');
  }
  if (typeof roleObj === 'string' && roleObj) return roleObj;
  return '';
}

export function descriptionToUiRoleSlug(desc: string | undefined | null): UiRoleSlug {
  const k = normalizeRoleKey(desc || '');
  if (k === 'admin' || k.includes('administr')) return 'admin';
  if (k === 'rh' || k === 'hr') return 'rh';
  if (k === 'teamleader' || (k.includes('team') && k.includes('leader'))) return 'team_leader';
  if (k.includes('candid')) return 'candidate';
  return 'candidate';
}

type RoleRow = {
  roleId?: number;
  RoleId?: number;
  description?: string;
  Description?: string;
};

/**
 * UI slug for a user row: prefer roleId + roles list, else nested role object.
 */
export function getUiRoleSlugForUser(u: any, rolesList: RoleRow[]): UiRoleSlug {
  const rid = u?.roleId ?? u?.RoleId;
  if (rid != null && rolesList.length) {
    const match = rolesList.find((r) => (r.roleId ?? r.RoleId) === rid);
    const d = match?.description ?? match?.Description ?? '';
    if (d) return descriptionToUiRoleSlug(d);
  }
  const desc = getRoleDescriptionFromUser(u);
  if (desc && !/^\d+$/.test(desc)) return descriptionToUiRoleSlug(desc);
  return 'candidate';
}

export function findRoleIdForSlug(
  slug: UiRoleSlug,
  rolesList: RoleRow[],
): number | undefined {
  for (const r of rolesList) {
    const desc = r.description ?? r.Description ?? '';
    if (descriptionToUiRoleSlug(desc) === slug) {
      return r.roleId ?? r.RoleId;
    }
  }
  return undefined;
}
