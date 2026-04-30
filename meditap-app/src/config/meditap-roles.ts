/**
 * Group / role name required to edit patient intake in the SPA (mirrors Django group on JWT).
 * Create this group in Django Admin → Groups and assign staff users.
 */
export function getMeditapRecordEditorRole(): string {
  const raw = (import.meta.env.VITE_MEDITAP_RECORD_EDITOR_ROLE as string | undefined)?.trim();
  return raw || 'meditap-record-editor';
}
