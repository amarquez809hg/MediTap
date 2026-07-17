import { describe, expect, it } from 'vitest';
import {
  annotateOcrSparseWarnings,
  assessDemographicRawValue,
  buildChronicConditionWarnings,
  clearChronicConditionWarning,
  FIELD_WARNING_MESSAGES,
  removeIndexedWarningRow,
  sanitizePatientFieldsWithWarnings,
  stripLeadingLabelBleed,
  warningsForWinningPatientFields,
  withSanitizedPatientFieldWarnings,
} from './intakeFieldWarnings';
import { isHardToReadExtractedText } from './documentTextExtraction';

describe('stripLeadingLabelBleed', () => {
  it('strips repeated leading name label from OCR bleed', () => {
    const r = stripLeadingLabelBleed('name MARIA GARCIA');
    expect(r.stripped).toBe(true);
    expect(r.value).toBe('MARIA GARCIA');
  });

  it('leaves clean names alone', () => {
    const r = stripLeadingLabelBleed('Maria Garcia');
    expect(r.stripped).toBe(false);
    expect(r.value).toBe('Maria Garcia');
  });
});

describe('assessDemographicRawValue', () => {
  it('normalizes label bleed and returns a verify warning', () => {
    const r = assessDemographicRawValue('fullName', 'name MARIA GARCIA');
    expect(r.value).toBe('MARIA GARCIA');
    expect(r.warning?.reason).toBe('label_bleed');
    expect(r.warning?.message).toBe(FIELD_WARNING_MESSAGES.VERIFY_LABEL_BLEED);
  });

  it('flags neighboring field labels inside a value', () => {
    const r = assessDemographicRawValue('givenName', 'Maria DOB 01/02/1990');
    expect(r.warning?.reason).toBe('contains_other_label');
  });

  it('flags digit bleed into names even without an explicit label token', () => {
    const r = assessDemographicRawValue('givenName', 'MARIA GARCIA 04/12/1985');
    expect(r.warning?.reason).toBe('contains_other_label');
  });
});

describe('sanitizePatientFieldsWithWarnings', () => {
  it('adds warnings for specialized-parser values with residual label bleed', () => {
    const sanitized = sanitizePatientFieldsWithWarnings({
      givenName: 'name MARIA',
      familyName: 'GARCIA',
    });
    expect(sanitized.fields.givenName).toBe('MARIA');
    expect(sanitized.warnings?.givenName?.reason).toBe('label_bleed');
  });

  it('wraps a full parse result for specialized parsers', () => {
    const wrapped = withSanitizedPatientFieldWarnings({
      patientFields: { givenName: 'name MARIA', familyName: 'GARCIA' },
      noKnownDrugAllergies: false,
      insurances: [],
      allergies: [],
      medications: [],
      chronicConditions: [],
      hospitalVisit: {},
    });
    expect(wrapped.fieldWarnings?.givenName?.reason).toBe('label_bleed');
  });
});

describe('warningsForWinningPatientFields', () => {
  it('keeps the warning for the winning field value', () => {
    const final = { givenName: 'Maria', familyName: 'Garcia' };
    const warnings = warningsForWinningPatientFields(final, [
      {
        fields: { givenName: 'name Maria', familyName: 'Garcia' },
        warnings: {
          givenName: {
            message: FIELD_WARNING_MESSAGES.VERIFY_LABEL_BLEED,
            reason: 'label_bleed',
          },
        },
      },
      {
        fields: { givenName: 'Maria', familyName: 'Garcia' },
        warnings: {
          givenName: {
            message: FIELD_WARNING_MESSAGES.VERIFY_LABEL_BLEED,
            reason: 'label_bleed',
          },
        },
      },
    ]);
    expect(warnings?.givenName?.reason).toBe('label_bleed');
    expect(warnings?.familyName).toBeUndefined();
  });

  it('does not attach a warning from a losing value to a clean winner', () => {
    const warnings = warningsForWinningPatientFields(
      { givenName: 'Maria' },
      [
        {
          fields: { givenName: 'Maria Garcia DOB 01/02/1990' },
          warnings: {
            givenName: {
              message: FIELD_WARNING_MESSAGES.VERIFY_OTHER_LABEL,
              reason: 'contains_other_label',
            },
          },
        },
        { fields: { givenName: 'Maria' } },
      ]
    );

    expect(warnings?.givenName).toBeUndefined();
  });
});

describe('annotateOcrSparseWarnings', () => {
  it('adds OCR warnings only for populated fields without existing warnings', () => {
    const annotated = annotateOcrSparseWarnings(
      { givenName: 'Maria', familyName: 'Garcia', email: '' },
      {
        givenName: {
          message: FIELD_WARNING_MESSAGES.VERIFY_LABEL_BLEED,
          reason: 'label_bleed',
        },
      }
    );
    expect(annotated?.givenName?.reason).toBe('label_bleed');
    expect(annotated?.familyName?.reason).toBe('ocr_sparse');
    expect(annotated?.email).toBeUndefined();
  });
});

describe('isHardToReadExtractedText', () => {
  it('flags glued label dumps that are not sparse', () => {
    const text =
      'NameMARIA GARCIA DOB01/02/1990 Phone5551234567 Emailmaria@example.com Address123 Main Street';
    expect(isHardToReadExtractedText(text)).toBe(true);
  });

  it('leaves clean multi-line intake text alone', () => {
    const text = [
      'Patient Demographics',
      'Given Name: Maria',
      'Family Name: Garcia',
      'Date of Birth: 01/02/1990',
      'Phone: 555-123-4567',
      'Email: maria@example.com',
      'Address: 123 Main Street, Austin, TX 78701',
      'Preferred Language: English',
      'Marital Status: Married',
      'Blood Type: O+',
      'Sex at Birth: Female',
      'Race: White',
      'Ethnicity: Not Hispanic or Latino',
    ].join('\n');
    expect(isHardToReadExtractedText(text)).toBe(false);
  });
});

describe('chronic condition warnings', () => {
  const row = {
    conditionName: 'Objective: Vitals reviewed',
    icdCode: '',
    diagnosisDate: '',
    severity: '',
    prexisting: '',
    notesChronicConditions: '',
  };

  it('flags visit-note fragments that look like chronic conditions', () => {
    const warnings = buildChronicConditionWarnings([row]);
    expect(warnings?.[0]?.conditionName?.reason).toBe('other');
  });

  it('flags all populated OCR-derived chronic fields except severity', () => {
    const warnings = buildChronicConditionWarnings(
      [{ ...row, conditionName: 'Dementia', icdCode: 'F03.90', severity: 'Mild' }],
      true
    );
    expect(warnings?.[0]?.conditionName?.reason).toBe('ocr_sparse');
    expect(warnings?.[0]?.icdCode?.reason).toBe('ocr_sparse');
    expect(warnings?.[0]?.severity).toBeUndefined();
  });

  it('clears a warning after staff edits that field', () => {
    const warnings = buildChronicConditionWarnings([row]);
    expect(
      clearChronicConditionWarning(warnings, 0, 'conditionName')
    ).toBeUndefined();
  });

  it('reindexes warnings after a row is removed', () => {
    const warnings = {
      0: {
        conditionName: {
          message: FIELD_WARNING_MESSAGES.VERIFY_OCR,
          reason: 'ocr_sparse' as const,
        },
      },
      1: {
        conditionName: {
          message: FIELD_WARNING_MESSAGES.VERIFY_VISIT_NOTE,
          reason: 'other' as const,
        },
      },
    };
    const next = removeIndexedWarningRow(warnings, 0);
    expect(next?.[0]?.conditionName?.reason).toBe('other');
    expect(next?.[1]).toBeUndefined();
  });
});
