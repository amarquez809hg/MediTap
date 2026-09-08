import { describe, expect, it } from 'vitest';
import { pathnameOf, resolveGoBackTarget, resolvePortalHref } from './portalGoBack';

describe('resolveGoBackTarget', () => {
  it('returns fallback when stack only has current page', () => {
    expect(
      resolveGoBackTarget(
        ['/app/labs'],
        '/app/labs',
        '/app/labs',
        '/app/dashboard'
      )
    ).toBe('/app/dashboard');
  });

  it('returns previous distinct path', () => {
    expect(
      resolveGoBackTarget(
        ['/app/dashboard', '/app/status', '/app/labs'],
        '/app/labs',
        '/app/labs',
        '/app/dashboard'
      )
    ).toBe('/app/status');
  });

  it('skips duplicate current pathname entries (query variants)', () => {
    expect(
      resolveGoBackTarget(
        ['/app/dashboard', '/app/intake', '/app/intake?section=vitals'],
        '/app/intake',
        '/app/intake?section=vitals',
        '/app/dashboard'
      )
    ).toBe('/app/dashboard');
  });

  it('pathnameOf strips query and hash', () => {
    expect(pathnameOf('/app/intake?section=vitals#x')).toBe('/app/intake');
  });
});

describe('resolvePortalHref', () => {
  it('maps legacy tab paths to /app routes', () => {
    expect(resolvePortalHref('/tab7')).toBe('/app/labs');
    expect(resolvePortalHref('/tab14?section=vitals')).toBe(
      '/app/intake?section=vitals'
    );
  });

  it('passes through already-clean /app paths', () => {
    expect(resolvePortalHref('/app/appointments')).toBe('/app/appointments');
  });
});
