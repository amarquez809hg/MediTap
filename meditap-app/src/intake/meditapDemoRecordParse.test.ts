import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  parseMeditapDemoRecordDocument,
  preprocessGluedLabelText,
} from './meditapDemoRecordParse';

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../tmp-meditap3-extract.txt'
);

describe('parseMeditapDemoRecordDocument', () => {
  it('parses all four chronic conditions from Meditap-3 extract', () => {
    const raw = readFileSync(fixturePath, 'utf8');
    const r = parseMeditapDemoRecordDocument(raw);
    expect(r.chronicConditions).toHaveLength(4);
    expect(r.medications.length).toBeGreaterThanOrEqual(4);
    expect(r.patientFields.bloodType).toBe('O+');
  });

  it('does not split Blood Type label during preprocess', () => {
    const t = preprocessGluedLabelText('Sex at Birth: Male Blood Type: O+ Email: a@b.com');
    expect(t).toContain('Blood Type: O+');
    expect(t).not.toMatch(/Blood\nType:/);
  });
});
