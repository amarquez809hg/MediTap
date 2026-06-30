import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { extractTextFromPdfContentItems } from './documentTextExtraction';
import { parseTab14IntakeDocument } from './tab14DocumentParse';
import { parseMeditapDemoRecordDocument } from './meditapDemoRecordParse';

describe('Jordan PDF browser-style extraction', () => {
  it('parses allergies and medications from pdfjs items', async () => {
    const data = new Uint8Array(readFileSync('test-fixtures/Jordan_Parker_MediTap_Demo_Record.pdf'));
    const pdf = await getDocument({ data }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += `${extractTextFromPdfContentItems(content.items)}\n`;
    }
    const demo = parseMeditapDemoRecordDocument(fullText);
    const full = parseTab14IntakeDocument(fullText);
    console.log('EXTRACT SAMPLE:', fullText.slice(0, 400));
    console.log('DEMO', { allergies: demo.allergies.length, meds: demo.medications.length, chronic: demo.chronicConditions.length });
    console.log('FULL', { allergies: full.allergies.length, meds: full.medications.length, chronic: full.chronicConditions.length });
    expect(demo.allergies.length, JSON.stringify(demo.allergies)).toBe(2);
    expect(demo.medications.length, JSON.stringify(demo.medications)).toBeGreaterThanOrEqual(3);
    expect(full.allergies.length, JSON.stringify(full.allergies)).toBe(2);
    expect(full.medications.length, JSON.stringify(full.medications)).toBeGreaterThanOrEqual(3);
  });
});
