import { readFileSync } from 'fs';
import { extractTextFromPdfContentItems } from '../src/intake/documentTextExtraction';
import { parseTab14IntakeDocument } from '../src/intake/tab14DocumentParse';
import { applyTab14ParseBundle, emptyMergeSnapshot } from '../src/intake/applyTab14ParseBundle';

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
    full += `\n${extractTextFromPdfContentItems((await (await pdf.getPage(i)).getTextContent()).items)}`;
  }
  const bundle = parseTab14IntakeDocument(full);
  console.log('vendor?', (bundle as any).detectedVendor ?? (bundle as any).source);
  console.log('allergies', bundle.allergies);
  const { snapshot } = applyTab14ParseBundle(emptyMergeSnapshot(), bundle);
  console.log('merged', snapshot.allergies);
  console.log('meds', snapshot.medications.length, snapshot.medications.map((m) => m.genericName));
  console.log('problems', snapshot.chronicConditions.length);
  console.log('visits', snapshot.hospitalVisits.length);
}
main();
