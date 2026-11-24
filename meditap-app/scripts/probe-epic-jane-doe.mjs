/**
 * Probe Epic Jane Doe My Health Summary — TOC + section header map.
 * Usage: node scripts/probe-epic-jane-doe.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pdfPath = join(root, 'test-fixtures/dummyPDFs/epic_jane_doe_my_health_summary.pdf');
const outDir = join(root, 'test-fixtures/probes');
mkdirSync(outDir, { recursive: true });

const require = createRequire(import.meta.url);
// Use same pdfjs as vitest tests via dynamic import of built path
const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

// Inline minimal text extraction (avoid TS import)
function extractTextFromItems(items) {
  const lines = [];
  let line = '';
  let lastY = null;
  for (const item of items) {
    if (!item || typeof item.str !== 'string') continue;
    const y = item.transform?.[5];
    if (lastY != null && y != null && Math.abs(y - lastY) > 2) {
      if (line.trim()) lines.push(line.trim());
      line = '';
    }
    line += (line && !line.endsWith(' ') && item.str && !item.str.startsWith(' ') ? ' ' : '') + item.str;
    if (y != null) lastY = y;
  }
  if (line.trim()) lines.push(line.trim());
  return lines.join('\n');
}

const data = new Uint8Array(readFileSync(pdfPath));
const pdf = await pdfjsLib.getDocument({
  data,
  useWorkerFetch: false,
  isEvalSupported: false,
  useSystemFonts: true,
}).promise;

const numPages = pdf.numPages;
console.log(`pages=${numPages}`);

const SECTION_HINTS = [
  'Table of Contents',
  'Patient Information',
  'Patient Demographics',
  'Patient Name',
  'Communication',
  'Emergency Contacts',
  'Related Persons',
  'Care Team',
  'Allergies',
  'Medications',
  'Problems',
  'Active Problems',
  'Past Medical History',
  'Medical History',
  'Surgical History',
  'Procedures',
  'Family History',
  'Social History',
  'Alcohol Use',
  'Tobacco Use',
  'Immunizations',
  'Plan of Treatment',
  'Orders',
  'Results',
  'Lab Results',
  'Imaging',
  'Radiology',
  'Vitals',
  'Vital Signs',
  'Encounters',
  'Encounter Details',
  'Visit Diagnoses',
  'Hospitalizations',
  'Past Encounters',
  'Insurance',
  'Coverages',
  'Payers',
  'Advance Directives',
  'Functional Status',
  'Mental Status',
  'Notes',
  'Clinical Notes',
  'Patient Instructions',
  'Goals',
  'Health Concerns',
  'Implants',
  'Devices',
  'Assessment',
  'Plan',
  'Reason for Visit',
  'Chief Complaint',
  'History of Present Illness',
  'Review of Systems',
  'Physical Exam',
  'Discharge',
  'Summary of Care',
  'Copyright',
  'Epic Systems',
  'MyChart',
];

const headerHits = [];
const firstPages = [];

for (let i = 1; i <= numPages; i++) {
  const page = await pdf.getPage(i);
  const content = await page.getTextContent();
  const text = extractTextFromItems(content.items);
  if (i <= 20) firstPages.push(`\n===== PAGE ${i} =====\n${text}`);

  const flat = text.replace(/\s+/g, ' ');
  for (const hint of SECTION_HINTS) {
    if (new RegExp(`\\b${hint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(flat)) {
      // Capture a short context line containing the hint
      const line = text
        .split('\n')
        .map((l) => l.trim())
        .find((l) => new RegExp(hint, 'i').test(l));
      headerHits.push({ page: i, hint, line: (line || '').slice(0, 160) });
    }
  }
  if (i % 50 === 0) console.log(`scanned ${i}/${numPages}`);
}

// Deduplicate: first page per hint
const firstByHint = new Map();
for (const h of headerHits) {
  if (!firstByHint.has(h.hint)) firstByHint.set(h.hint, h);
}

const summary = {
  pages: numPages,
  firstPageHits: [...firstByHint.values()].sort((a, b) => a.page - b.page),
  hitCount: headerHits.length,
};

writeFileSync(join(outDir, 'epic_jane_doe_section_map.json'), JSON.stringify(summary, null, 2));
writeFileSync(join(outDir, 'epic_jane_doe_pages_1_20.txt'), firstPages.join('\n'));

// Also dump pages around key first hits (demographics, allergies, meds, etc.)
const keyPages = new Set(
  [...firstByHint.values()].flatMap((h) => [h.page, h.page + 1]).filter((p) => p >= 1 && p <= numPages)
);
const keySnippets = [];
for (const p of [...keyPages].sort((a, b) => a - b).slice(0, 80)) {
  const page = await pdf.getPage(p);
  const content = await page.getTextContent();
  const text = extractTextFromItems(content.items);
  keySnippets.push(`\n===== PAGE ${p} =====\n${text.slice(0, 4000)}`);
}
writeFileSync(join(outDir, 'epic_jane_doe_key_section_pages.txt'), keySnippets.join('\n'));

console.log('wrote probes to', outDir);
console.log(JSON.stringify(summary.firstPageHits.slice(0, 40), null, 2));
