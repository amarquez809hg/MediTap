import { describe, expect, it, vi } from 'vitest';

vi.mock('./auth/accessTokenClaims', () => ({
  getAccessTokenPayload: vi.fn(),
}));

import { getAccessTokenPayload } from './auth/accessTokenClaims';
import { resolvePortalPatientEmail } from './api';

describe('resolvePortalPatientEmail', () => {
  it('uses valid form email when present', () => {
    vi.mocked(getAccessTokenPayload).mockReturnValue(undefined);
    expect(
      resolvePortalPatientEmail('rafael.santos@example.com', 'patient1')
    ).toBe('rafael.santos@example.com');
  });

  it('ignores invalid form email and uses JWT email', () => {
    vi.mocked(getAccessTokenPayload).mockReturnValue({
      email: 'portal.user@gmail.com',
    });
    expect(resolvePortalPatientEmail('not-an-email', 'patient1')).toBe(
      'portal.user@gmail.com'
    );
  });

  it('never returns bare @local domain (Django rejects it)', () => {
    vi.mocked(getAccessTokenPayload).mockReturnValue({
      sub: 'abc-123',
      preferred_username: 'patient1',
    });
    const email = resolvePortalPatientEmail('', 'patient1');
    expect(email).not.toMatch(/@local$/);
    expect(email).toMatch(/@meditap\.local$/);
  });
});
