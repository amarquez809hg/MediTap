import { readFileSync } from 'fs';
import { parseTab14IntakeDocument } from '../src/intake/tab14DocumentParse';
const snap = readFileSync('test-fixtures/dummyPDFs/epic_jane_doe_my_health_summary.snapshot.txt','utf8');
const r = parseTab14IntakeDocument(snap, { preferredVendor: 'epic' });
console.log(JSON.stringify({
  address: r.patientFields.address,
  patientFullName: (r.patientFields as any).patientFullName,
  givenName: r.patientFields.givenName,
  familyName: r.patientFields.familyName,
  communication: (r.patientFields as any).communication,
  maritalStatus: r.patientFields.maritalStatus,
  counts: (r as any).epicSectionOccurrenceCounts,
  keys: Object.keys(r.patientFields),
}, null, 2));
