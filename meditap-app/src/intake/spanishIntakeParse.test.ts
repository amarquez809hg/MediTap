import { describe, expect, it } from 'vitest';
import { parseSpanishMediTapRegistroDocument, preprocessSpanishGluedText } from './spanishIntakeParse';

describe('spanishIntakeParse', () => {
  it('preserves Masculino and Soltero when glued to ALERGIAS', () => {
    const raw =
      'DATOS DEMOGRÁFICOS Nombre: Riley Apellido: Moore Sexo al nacer: Masculino Estado civil: Soltero ALERGIAS1. Penicilina';
    const text = preprocessSpanishGluedText(raw);
    const r = parseSpanishMediTapRegistroDocument(text);
    expect(r.patientFields.sexAtBirth).toBe('Masculino');
    expect(r.patientFields.maritalStatus).toBe('Soltero');
  });
});
