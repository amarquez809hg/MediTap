import { describe, expect, it } from 'vitest';
import {
  buildEpicNoteFromClinicOccurrenceList,
  estimateEpicNoteFromClinicOccurrenceCount,
  inventoryEpicNoteFromClinic,
  parseEpicNoteFromClinic,
} from './epicNoteFromClinic';

const SAMPLE = `
Mrs. Jane A. Smith-Doe
Patient Health Summary, generated on Aug. 07, 2026
Patient Demographics Female; born Mar. 15, 1976
Note from Mayo Clinic This document contains information that was shared with Jane A. Smith-Doe. It may not contain the entire record from Mayo Clinic.
Encounters - as of 08/07/2026
08/06/2026 Hospital Encounter Lab
08/05/2026 Office Visit Neurology
08/04/2026 Comprehensive Visit Ophthalmology
07/23/2026 Telemedicine Neurology
05/12/2026 Appointment Neurology
`;

describe('Epic Note from Mayo Clinic multi-hit', () => {
  it('parses clinic name, shared-with, and disclaimer body', () => {
    const note = parseEpicNoteFromClinic(SAMPLE);
    expect(note.clinicName).toMatch(/Mayo Clinic/i);
    expect(note.sharedWith).toMatch(/Jane A\. Smith-Doe/i);
    expect(note.body).toMatch(/may not contain the entire record/i);
  });

  it('estimates cover + encounters proxy like PDF Find multi-hit', () => {
    const count = estimateEpicNoteFromClinicOccurrenceCount(SAMPLE);
    expect(count).toBeGreaterThanOrEqual(6);
  });

  it('dates cover from generated-on and reprints from encounters', () => {
    const list = buildEpicNoteFromClinicOccurrenceList(SAMPLE);
    expect(list.length).toBeGreaterThanOrEqual(6);
    expect(list[0]!.intakeDateIso).toBe('2026-08-07');
    expect(list[0]!.intakeDateKind).toBe('generated');
    expect(list[0]!.fields.clinicName).toMatch(/Mayo/i);
    expect(list[1]!.intakeDateIso).toBe('2026-08-06');
    expect(list[1]!.intakeDateKind).toBe('encounter');
    expect(list.every((row) => row.total === list.length)).toBe(true);
  });

  it('inventory maps occurrences to clinical entries', () => {
    const inv = inventoryEpicNoteFromClinic(SAMPLE);
    expect(inv.occurrenceCount).toBe(inv.occurrences.length);
    expect(inv.entries[0]!.title).toMatch(/Note from Mayo/i);
    expect(inv.entries[0]!.detail).toMatch(/shared with/i);
  });
});
