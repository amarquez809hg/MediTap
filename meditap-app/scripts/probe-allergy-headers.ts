import { readFileSync } from 'fs';
import { extractTextFromPdfContentItems } from '../src/intake/documentTextExtraction';

async function main() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(
    readFileSync('test-fixtures/dummyPDFs/epic_jane_doe_my_health_summary.pdf')
  );
  const pdf = await pdfjs.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;
  let full = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    full += `\n${extractTextFromPdfContentItems((await page.getTextContent()).items)}`;
  }
  const patterns = [
    /Allergies[^\n]{0,80}/gi,
    /Allergy[^\n]{0,80}/gi,
    /Active Allergy[^\n]{0,80}/gi,
    /documented as of this encounter[^\n]{0,40}/gi,
    /No known[^\n]{0,60}/gi,
    /Penicillin[^\n]{0,60}/gi,
    /Penicillamine[^\n]{0,60}/gi,
  ];
  for (const re of patterns) {
    const hits = [...full.matchAll(re)].slice(0, 15).map((m) => m[0].replace(/\s+/g, ' '));
    console.log('\nPATTERN', re.source, 'count', (full.match(re) || []).length);
    hits.forEach((h, i) => console.log(i, h));
  }
}
main();
