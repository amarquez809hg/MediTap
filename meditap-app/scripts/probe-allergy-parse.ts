import { readFileSync } from 'fs';
import { extractTextFromPdfContentItems } from '../src/intake/documentTextExtraction';
import {
  collectEpicSectionBodies,
  findEpicSectionHits,
} from '../src/intake/epicMyHealthSummaryToc';
import {
  parseEpicMayoAllergies,
  parseEpicMayoMedications,
  parseEpicMayoActiveProblems,
  parseEpicMayoEncounters,
  preprocessEpicMayoMyHealthSummaryText,
  isEpicMayoMyHealthSummaryDocument,
} from '../src/intake/epicMayoMyHealthSummaryParse';
import { parseEpicHealthSummaryDocument } from '../src/intake/epicHealthSummaryParse';

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
  const text = preprocessEpicMayoMyHealthSummaryText(full);
  console.log(
    JSON.stringify(
      {
        pages: pdf.numPages,
        chars: full.length,
        isMayo: isEpicMayoMyHealthSummaryDocument(full),
        allergyHits: findEpicSectionHits(full, 'Allergies').map((h) => ({
          kind: h.kind,
          asOf: h.asOf,
          preview: h.body.slice(0, 120).replace(/\s+/g, ' '),
        })),
        allergyBodies: collectEpicSectionBodies(full, 'Allergies').length,
        allergies: parseEpicMayoAllergies(full).map((a) => a.allergyName),
        meds: parseEpicMayoMedications(full).length,
        problems: parseEpicMayoActiveProblems(full).length,
        visits: parseEpicMayoEncounters(full).visits.length,
        bundleAllergies: parseEpicHealthSummaryDocument(full).allergies?.length,
        bundleMeds: parseEpicHealthSummaryDocument(full).medications?.length,
        bundleProblems: parseEpicHealthSummaryDocument(full).chronicConditions?.length,
        bundleVisits: parseEpicHealthSummaryDocument(full).hospitalVisits?.length,
      },
      null,
      2
    )
  );
  // dump first allergy as-of body sample
  const bodies = collectEpicSectionBodies(full, 'Allergies');
  console.log('--- first allergy body sample ---');
  console.log(bodies[0]?.slice(0, 1500));
  console.log('--- last allergy body sample ---');
  console.log(bodies[bodies.length - 1]?.slice(0, 1500));
}
main();
