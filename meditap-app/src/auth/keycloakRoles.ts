/**
 * Realm roles from a Keycloak access token (`realm_access.roles`).
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
