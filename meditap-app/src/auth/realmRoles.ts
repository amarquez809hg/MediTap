/**
 * Roles from JWT `realm_access.roles` (Django groups mirrored in MediTap access tokens).
 */
export function parseRealmRoles(
  tokenParsed: Record<string, unknown> | undefined
): string[] {
  if (!tokenParsed) return [];
  const ra = tokenParsed.realm_access as { roles?: unknown } | undefined;
  const roles = ra?.roles;
  if (!Array.isArray(roles)) return [];
  return roles.filter((r): r is string => typeof r === 'string');
}
