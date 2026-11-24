import { readFileSync } from 'fs';
import { extractTextFromPdfContentItems } from '../src/intake/documentTextExtraction';
import {
  collectEpicMayoSectionBodies,
  parseEpicMayoAllergies,
  parseEpicMayoMedications,
  parseEpicMayoActiveProblems,
  parseEpicMayoEncounters,
} from '../src/intake/epicMayoMyHealthSummaryParse';
import {
  collectEpicSectionBodies,
  countEpicTocSectionHits,
  findEpicSectionHits,
} from '../src/intake/epicMyHealthSummaryToc';
import { parseTab14IntakeDocument } from '../src/intake/tab14DocumentParse';

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

  const allergyHits = findEpicSectionHits(full, 'Allergies');
  const counts = countEpicTocSectionHits(full);
  const allergies = parseEpicMayoAllergies(full);
  const meds = parseEpicMayoMedications(full);
  const problems = parseEpicMayoActiveProblems(full);
  const visits = parseEpicMayoEncounters(full).visits;
  const tab14 = parseTab14IntakeDocument(full, 'epic_jane_doe.pdf');

  console.log(
    JSON.stringify(
      {
        allergyHits: allergyHits.length,
        allergyKinds: allergyHits.reduce((a, h) => {
          a[h.kind] = (a[h.kind] || 0) + 1;
          return a;
        }, {} as Record<string, number>),
        bodies: collectEpicSectionBodies(full, 'Allergies').length,
        mayoBodies: collectEpicMayoSectionBodies(full, 'Allergies').length,
        allergies: allergies.map((a) => a.allergyName),
        meds: meds.length,
        problems: problems.length,
        visits: visits.length,
        countsPick: {
          Allergies: counts['Allergies'],
          Medications: counts['Medications'],
          'Active Problems': counts['Active Problems'],
          'Encounter Details': counts['Encounter Details'],
          Results: counts['Results'],
        },
        tab14Allergies: tab14.allergies?.map((a) => a.allergyName),
        tab14Meds: tab14.medications?.length,
        tab14Problems: tab14.chronicConditions?.length,
        tab14Visits: tab14.hospitalVisits?.length,
      },
      null,
      2
    )
  );
}
main();
