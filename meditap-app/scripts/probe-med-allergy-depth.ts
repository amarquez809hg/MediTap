import { readFileSync } from 'fs';
import { extractTextFromPdfContentItems } from '../src/intake/documentTextExtraction';
import { collectEpicSectionBodies } from '../src/intake/epicMyHealthSummaryToc';
import {
  parseEpicMayoAllergies,
  parseEpicMayoMedications,
} from '../src/intake/epicMayoMyHealthSummaryParse';

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

  const allergyBody = collectEpicSectionBodies(full, 'Allergies').join('\n');
  console.log('allergy body chars', allergyBody.length);
  console.log(allergyBody.slice(0, 800));

  // unique drug-like tokens near Rash
  const nearRash = [...full.matchAll(/([A-Z][A-Za-z0-9-]{3,40})\s+Rash/g)].map((m) => m[1]);
  console.log('unique * Rash tokens', [...new Set(nearRash)]);

  const medBody = collectEpicSectionBodies(full, 'Medications')
    .filter((b) => /as of/i.test(b) && !/documented as of this encounter/i.test(b.slice(0, 80)))
    .pop();
  console.log('\nlast meds as-of preview\n', medBody?.slice(0, 2000));
  console.log('parsed meds', parseEpicMayoMedications(full).map((m) => m.genericName));
  console.log('parsed allergies', parseEpicMayoAllergies(full));
}
main();
