function messageFromStatusAndBody(status: number, bodyText: string): string {
  if (status === 401 || status === 403) {
    try {
      const j = JSON.parse(bodyText) as {
        detail?: string;
        hint?: string;
      };
      const detail = typeof j.detail === 'string' ? j.detail : '';
      const hint = typeof j.hint === 'string' ? j.hint : '';
      if (detail || hint) {
        return [detail, hint].filter(Boolean).join('\n\n');
      }
    } catch {
      /* not JSON */
    }
    if (status === 401) {
      return [
        'Staff sign-in was rejected.',
        'Check the username and password for a Django user in the record-editor group (or a superuser).',
      ].join('\n\n');
    }
    return 'This staff account is not allowed to edit patient intake for this session.';
  }
  if (status === 502 || status === 503) {
    return 'The server could not complete staff sign-in. Try again in a moment.';
  }
  return bodyText.trim() || `Request failed (${status}).`;
}

/**
 * Parses errors thrown by `requestJson` for staff-elevate (`API <status>: <body>`).
 */
export function staffElevateErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const m = /^API (\d+):\s*(.*)$/s.exec(msg);
  if (m) {
    const status = Number(m[1]);
    const bodyText = m[2] || '';
    return messageFromStatusAndBody(status, bodyText);
  }
  return msg.trim() || 'Request failed.';
}
