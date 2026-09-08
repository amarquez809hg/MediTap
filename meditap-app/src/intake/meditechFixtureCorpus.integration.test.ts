import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { athenaCompletenessFromParseResult } from './athenaPortabilityCompleteness';
import { extractTextFromPdfContentItems } from './documentTextExtraction';
import { isMeditechCcdDocument } from './meditechCcdParse';
import { MEDITECH_CCD_FIXTURE_CORPUS } from './meditechFixtureCorpus';
import { isAthenaPortabilityDocument, parseTab14IntakeDocument } from './tab14DocumentParse';

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

describe('MEDITECH CCD fixture corpus (training registry)', () => {
  it('lists Jordan Meditech fixture', () => {
    expect(MEDITECH_CCD_FIXTURE_CORPUS.map((f) => f.id)).toEqual(
      expect.arrayContaining(['jordan-rivera-meditech'])
    );
  });

  for (const fixture of MEDITECH_CCD_FIXTURE_CORPUS) {
    it(`locks ${fixture.id} section completeness`, async () => {
      const text = await extractPdfText(join(root, fixture.pdfPath));
      expect(isMeditechCcdDocument(text)).toBe(true);
      expect(isAthenaPortabilityDocument(text)).toBe(false);

      const parsed = parseTab14IntakeDocument(text);
      expect(parsed.patientFields.givenName).toMatch(new RegExp(fixture.patient.givenName, 'i'));
      expect(parsed.patientFields.familyName).toBe(fixture.patient.familyName);

      const score = athenaCompletenessFromParseResult(parsed);
      const unexpectedGaps = score.gapLabels.filter(
        (g) => !(fixture.knownGaps ?? []).some((k) => new RegExp(k, 'i').test(g))
      );
      expect(
        score.scorePercent,
        `${fixture.id} score ${score.scorePercent}; gaps: ${score.gapLabels.join(', ')}`
      ).toBeGreaterThanOrEqual(fixture.minScorePercent);
      expect(unexpectedGaps, `${fixture.id} unexpected gaps`).toEqual([]);

      for (const id of fixture.mustBeFilled) {
        const section = score.sections.find((s) => s.id === id);
        expect(section, `${fixture.id} missing section id ${id}`).toBeTruthy();
        expect(
          section!.status,
          `${fixture.id} ${id} status=${section!.status} (${section!.detail})`
        ).toBe('filled');
      }
    });
  }
});
