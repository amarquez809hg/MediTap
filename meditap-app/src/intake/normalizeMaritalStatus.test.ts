import { describe, expect, it } from 'vitest';
import { normalizeMaritalStatus } from './intakeFieldLabels';

describe('normalizeMaritalStatus', () => {
  it('maps Athena / Epic never-married variants onto the select option', () => {
    expect(normalizeMaritalStatus('Never married')).toBe('Never Married');
    expect(normalizeMaritalStatus('Never Married')).toBe('Never Married');
    expect(normalizeMaritalStatus('single')).toBe('Single');
    expect(normalizeMaritalStatus('Separated')).toBe('Separated');
    expect(normalizeMaritalStatus('soltero')).toBe('Single');
  });
});
