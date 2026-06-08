import { describe, expect, it } from 'vitest';
import {
  bmiCategoryLabel,
  cmToInches,
  computeBmiFromMetric,
  formatBmiDisplay,
  formatHeightFromInches,
  inchesToCm,
  kgToLbs,
  lbsToKg,
} from './bmi';

describe('vitals bmi helpers', () => {
  it('computes BMI from metric vitals', () => {
    // 70 in ≈ 177.8 cm, 180 lb ≈ 81.65 kg → BMI ≈ 25.8
    const heightCm = inchesToCm(70);
    const weightKg = lbsToKg(180);
    const bmi = computeBmiFromMetric(heightCm, weightKg);
    expect(bmi).not.toBeNull();
    expect(bmi!).toBeGreaterThan(25);
    expect(bmi!).toBeLessThan(27);
  });

  it('returns N/A display when BMI cannot be computed', () => {
    expect(formatBmiDisplay(null)).toBe('N/A');
    expect(computeBmiFromMetric(null, 80)).toBeNull();
  });

  it('labels BMI categories', () => {
    expect(bmiCategoryLabel(22)).toBe('Normal');
    expect(bmiCategoryLabel(31)).toBe('Obese');
  });

  it('formats US height and converts units', () => {
    expect(formatHeightFromInches(70)).toBe(`5'10"`);
    expect(Math.round(cmToInches(inchesToCm(68)))).toBe(68);
    expect(Math.round(kgToLbs(lbsToKg(200)))).toBe(200);
  });
});
