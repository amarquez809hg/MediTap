/**
 * Realm role required to edit patient intake (Tab14) in the SPA.
 * Create this role in Keycloak (Realm → Roles) and assign it to staff users.
 */
export function getMeditapRecordEditorRole(): string {
  const raw = (import.meta.env.VITE_KEYCLOAK_ROLE_RECORD_EDITOR as string | undefined)?.trim();
  return raw || 'meditap-record-editor';
}
