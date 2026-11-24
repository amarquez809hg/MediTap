import { readFileSync } from 'fs';
import { extractTextFromPdfContentItems } from '../src/intake/documentTextExtraction';
import {
  EPIC_MY_HEALTH_SUMMARY_TOC,
  countEpicTocSectionHits,
  findEpicSectionHits,
  pickEpicSectionBodies,
} from '../src/intake/epicMyHealthSummaryToc';
import { preprocessEpicMayoMyHealthSummaryText } from '../src/intake/epicMayoMyHealthSummaryParse';

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
  const pre = preprocessEpicMayoMyHealthSummaryText(full);
  const countsFull = countEpicTocSectionHits(full);
  const countsPre = countEpicTocSectionHits(pre);
  const rows = EPIC_MY_HEALTH_SUMMARY_TOC.map((e) => {
    const fullHits = findEpicSectionHits(full, e.title);
    const asOf = fullHits.filter((h) => h.kind === 'asOf').length;
    const local = fullHits.filter((h) => h.kind === 'encounterLocal').length;
    const plain = fullHits.filter((h) => h.kind === 'plain').length;
    const picked = pickEpicSectionBodies(full, e.title);
    return {
      title: e.title,
      full: countsFull[e.title] ?? 0,
      pre: countsPre[e.title] ?? 0,
      asOf,
      local,
      plain,
      primaryChars: picked.primary.length,
    };
  }).filter((r) => r.full > 0 || r.pre > 0);
  console.log(JSON.stringify({ fullChars: full.length, preChars: pre.length, rows }, null, 2));
}
main();
