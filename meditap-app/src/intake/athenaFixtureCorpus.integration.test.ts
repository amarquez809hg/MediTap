import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ATHENA_PORTABILITY_FIXTURE_CORPUS } from './athenaFixtureCorpus';
import {
  ATHENA_SIDEBAR_SECTION_KEYS,
  athenaCompletenessFromParseResult,
  computeAthenaPortabilityCompleteness,
  formatAthenaPortabilityCompletenessSummary,
  shouldScoreAthenaPortability,
} from './athenaPortabilityCompleteness';
import { extractTextFromPdfContentItems } from './documentTextExtraction';
import { parseTab14IntakeDocument } from './tab14DocumentParse';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

async function extractPdfText(pdfPath: string): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += `${extractTextFromPdfContentItems(content.items)}\n`;
  }
  return text;
}

describe('athenaPortabilityCompleteness', () => {
  it('scores empty parse as mostly missing', () => {
    const result = computeAthenaPortabilityCompleteness({
      patientFields: {},
      allergies: [],
      medications: [],
      chronicConditions: [],
      insurances: [],
      labPanels: [],
    });
    expect(result.scorePercent).toBeLessThan(40);
    expect(result.gapLabels.length).toBeGreaterThan(5);
    expect(formatAthenaPortabilityCompletenessSummary(result)).toMatch(/gaps:/i);
  });

  it('scores every left-menu section in sidebar order', () => {
    const result = computeAthenaPortabilityCompleteness({
      patientFields: {},
      allergies: [],
      medications: [],
      chronicConditions: [],
      insurances: [],
      labPanels: [],
    });
    expect(result.sections.map((s) => s.id)).toEqual(ATHENA_SIDEBAR_SECTION_KEYS);
    expect(result.total).toBe(ATHENA_SIDEBAR_SECTION_KEYS.length);
    expect(result.sections.some((s) => s.label === 'Care Team Members')).toBe(true);
    expect(result.sections.some((s) => s.label === 'Care Team')).toBe(true);
    expect(result.sections.some((s) => s.label === 'Mental Status')).toBe(true);
    expect(result.sections.some((s) => s.label === 'Obstetrics History')).toBe(true);
    expect(result.sections.some((s) => s.label === 'Past Encounters')).toBe(true);
    expect(result.sections.some((s) => s.label === 'Notes')).toBe(true);
  });
});

describe('Athena portability fixture corpus (training registry)', () => {
  it('lists Diana and Harold fixtures', () => {
    expect(ATHENA_PORTABILITY_FIXTURE_CORPUS.map((f) => f.id)).toEqual(
      expect.arrayContaining(['diana-smith', 'harold-jennings'])
    );
  });

  for (const fixture of ATHENA_PORTABILITY_FIXTURE_CORPUS) {
    it(`locks ${fixture.id} section completeness`, async () => {
      const text = await extractPdfText(join(root, fixture.pdfPath));
      const parsed = parseTab14IntakeDocument(text);
      expect(shouldScoreAthenaPortability(parsed)).toBe(true);
      expect(parsed.patientFields.givenName).toBe(fixture.patient.givenName);
      expect(parsed.patientFields.familyName).toBe(fixture.patient.familyName);

      const score = athenaCompletenessFromParseResult(parsed);
      expect(
        score.scorePercent,
        `${fixture.id} score ${score.scorePercent}; gaps: ${score.gapLabels.join(', ')}`
      ).toBeGreaterThanOrEqual(fixture.minScorePercent);

      for (const id of fixture.mustBeFilled) {
        const section = score.sections.find((s) => s.id === id);
        expect(section, `${fixture.id} missing section id ${id}`).toBeTruthy();
        expect(
          section!.status,
          `${fixture.id} ${id} status=${section!.status} (${section!.detail})`
        ).toBe('filled');
      }

      for (const gap of fixture.knownGaps ?? []) {
        const section = score.sections.find((s) => s.id === gap);
        expect(section, `${fixture.id} known gap ${gap} not scored`).toBeTruthy();
        expect(['missing', 'thin', 'none_recorded']).toContain(section!.status);
      }
    }, 30_000);
  }
});
