import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { athenaCompletenessFromParseResult } from './athenaPortabilityCompleteness';
import { extractTextFromPdfContentItems } from './documentTextExtraction';
import { isEpicHealthSummaryDocument, isEpicMayoMyHealthSummaryDocument } from './epicHealthSummaryParse';
import { EPIC_HEALTH_SUMMARY_FIXTURE_CORPUS } from './epicFixtureCorpus';
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

describe('Epic My Health Summary fixture corpus', () => {
  it('lists Jane Doe Mayo fixture', () => {
    expect(EPIC_HEALTH_SUMMARY_FIXTURE_CORPUS.map((f) => f.id)).toEqual(
      expect.arrayContaining(['jane-doe-mayo-my-health-summary'])
    );
  });

  for (const fixture of EPIC_HEALTH_SUMMARY_FIXTURE_CORPUS) {
    it(`locks ${fixture.id} section completeness`, async () => {
      const path = join(root, fixture.sourcePath);
      expect(existsSync(path), `missing fixture ${fixture.sourcePath}`).toBe(true);
      const text = fixture.textFixture
        ? readFileSync(path, 'utf8')
        : await extractPdfText(path);

      expect(isEpicHealthSummaryDocument(text)).toBe(true);
      expect(isEpicMayoMyHealthSummaryDocument(text)).toBe(true);

      const parsed = parseTab14IntakeDocument(text, { preferredVendor: 'epic' });
      if (fixture.requireSexAtBirth) {
        expect(parsed.patientFields.sexAtBirth).toBe(fixture.requireSexAtBirth);
      }
      if (fixture.patient?.givenName) {
        expect(parsed.patientFields.givenName).toMatch(new RegExp(fixture.patient.givenName, 'i'));
      }
      if (fixture.patient?.familyName) {
        expect(parsed.patientFields.familyName).toMatch(new RegExp(fixture.patient.familyName, 'i'));
      }

      // Clinical fingerprint for Jane Doe Mayo export
      if (fixture.id === 'jane-doe-mayo-my-health-summary') {
        expect(parsed.allergies.some((a) => /Penicill/i.test(a.allergyName))).toBe(true);
        expect(parsed.medications.some((m) => /alendronate|rosuvastatin|LORazepam|lorazepam/i.test(m.genericName))).toBe(
          true
        );
        expect(
          parsed.chronicConditions.some((c) => /Neuromyelitis|Multiple Sclerosis|Myelopathy/i.test(c.conditionName))
        ).toBe(true);
        expect(Number(parsed.patientFields.systolicBp)).toBe(126);
        expect(parsed.labPanels?.length ?? 0).toBeGreaterThanOrEqual(2);
        expect((parsed.hospitalVisits?.length ?? 0) + (parsed.hospitalVisit?.visitDate ? 1 : 0)).toBeGreaterThanOrEqual(
          1
        );
      }

      const score = athenaCompletenessFromParseResult(parsed);
      const unexpectedGaps = score.gapLabels.filter(
        (g) => !(fixture.knownGaps ?? []).some((k) => new RegExp(k, 'i').test(g))
      );
      expect(
        score.scorePercent,
        `${fixture.id} score ${score.scorePercent}; gaps: ${score.gapLabels.join(', ')}`
      ).toBeGreaterThanOrEqual(fixture.minScorePercent);
      expect(unexpectedGaps, `${fixture.id} unexpected gaps: ${unexpectedGaps.join(', ')}`).toEqual([]);

      for (const id of fixture.mustBeFilled) {
        const section = score.sections.find((s) => s.id === id);
        expect(section, `${fixture.id} missing section id ${id}`).toBeTruthy();
        expect(
          ['filled', 'none_recorded'].includes(section!.status),
          `${fixture.id} ${id} status=${section!.status} (${section!.detail})`
        ).toBe(true);
      }
    });
  }
});
