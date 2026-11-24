import { readFileSync } from 'fs';
import { extractTextFromPdfContentItems } from '../src/intake/documentTextExtraction';
import { sliceEpicEncounterDetailSessions } from '../src/intake/epicMyHealthSummaryToc';
import {
  parseEpicMayoEncounters,
  parseEpicEncountersAsOfTable,
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
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    full += `\n${extractTextFromPdfContentItems(content.items)}`;
  }
  const literal = (full.match(/Encounter Details/gi) || []).length;
  const sessions = sliceEpicEncounterDetailSessions(full);
  const table = parseEpicEncountersAsOfTable(full);
  const merged = parseEpicMayoEncounters(full);
  console.log(
    JSON.stringify(
      {
        pages: pdf.numPages,
        textChars: full.length,
        literalEncounterDetails: literal,
        detailSessions: sessions.length,
        tableVisits: table.visits.length,
        mergedVisits: merged.visits.length,
        sampleTypes: merged.visits.slice(0, 8).map((v) => `${v.visitDate} ${v.visitType}`),
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
