import { describe, expect, it } from 'vitest';
import {
  annotateOcrSparseWarnings,
  assessDemographicRawValue,
  buildChronicConditionWarnings,
  clearChronicConditionWarning,
  FIELD_WARNING_MESSAGES,
  stripLeadingLabelBleed,
  warningsForWinningPatientFields,
} from './intakeFieldWarnings';

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

  it('flags all populated OCR-derived chronic fields', () => {
    const warnings = buildChronicConditionWarnings(
      [{ ...row, conditionName: 'Dementia', icdCode: 'F03.90' }],
      true
    );
    expect(warnings?.[0]?.conditionName?.reason).toBe('ocr_sparse');
    expect(warnings?.[0]?.icdCode?.reason).toBe('ocr_sparse');
  });

  it('clears a warning after staff edits that field', () => {
    const warnings = buildChronicConditionWarnings([row]);
    expect(
      clearChronicConditionWarning(warnings, 0, 'conditionName')
    ).toBeUndefined();
  });
});
