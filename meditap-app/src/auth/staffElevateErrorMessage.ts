/**
 * Parses staff-elevate API errors into text for modals.
 * Shortens the common "invalid credentials" case so the UI is not a wall of hints.
 */
export function staffElevateErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const m = err.message.match(/API\s+\d+:\s*(.*)/s);
    if (m?.[1]) {
      try {
        const j = JSON.parse(m[1].trim()) as {
          detail?: string;
          keycloak_error?: string;
          hint?: string;
        };
        const kc = typeof j.keycloak_error === 'string' ? j.keycloak_error : '';
        const kcLower = kc.toLowerCase();

        if (
          kcLower.includes('invalid user credentials') ||
          kcLower.includes('invalid username or password') ||
          (kcLower.includes('invalid_grant') && kcLower.includes('credential'))
        ) {
          return [
            'Keycloak did not accept this username or password.',
            'Use the password stored in Keycloak for this account (it is not necessarily the same as your Google password).',
            'If you only use “Sign in with Google”, set a password in Keycloak: Admin → realm meditap → Users → pick the user → Credentials → Set password.',
            'If login normally uses an email but staff sign-in fails, try the user’s Keycloak username (Users → user → Details).',
          ].join(' ');
        }

        const parts: string[] = [];
        if (typeof j.detail === 'string') parts.push(j.detail);
        if (kc) parts.push(`Details: ${kc}`);
        if (typeof j.hint === 'string') parts.push(j.hint);
        if (parts.length) return parts.join(' ');
      } catch {
        /* fall through */
      }
    }
    return err.message;
  }
  return 'Something went wrong.';
}
