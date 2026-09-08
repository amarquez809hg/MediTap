import { describe, expect, it } from 'vitest';
import {
  assessTerminologyHint,
  findSourcePageForValue,
} from './intakeTerminologyHints';

describe('intakeTerminologyHints', () => {
  it('accepts known allergens and flags unknown ones', () => {
    expect(assessTerminologyHint('Penicillin', 'allergen')).toBeUndefined();
    expect(assessTerminologyHint('Zorblax-99', 'allergen')?.reason).toBe(
      'terminology'
    );
  });

  it('finds OCR page markers for provenance', () => {
    const text = '--- page 1 ---\nhello\n--- page 2 ---\nPenicillin allergy\n';
    expect(findSourcePageForValue(text, 'Penicillin')).toBe(2);
  });
});
