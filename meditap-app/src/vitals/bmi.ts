/** Height/weight conversions and BMI helpers (stored metric; UI often US customary). */

const CM_PER_INCH = 2.54;
const LB_PER_KG = 2.2046226218;

export function inchesToCm(inches: number): number {
  return inches * CM_PER_INCH;
}

export function cmToInches(cm: number): number {
  return cm / CM_PER_INCH;
}

export function lbsToKg(lbs: number): number {
  return lbs / LB_PER_KG;
}

export function kgToLbs(kg: number): number {
  return kg * LB_PER_KG;
}

export function parseOptionalPositiveNumber(raw: string | undefined | null): number | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function parseOptionalPositiveInt(raw: string | undefined | null): number | null {
  const n = parseOptionalPositiveNumber(raw);
  if (n == null) return null;
  const i = Math.round(n);
  return i > 0 ? i : null;
}

/** BMI from metric height (cm) and weight (kg). Returns null when inputs invalid. */
export function computeBmiFromMetric(
  heightCm: number | null | undefined,
  weightKg: number | null | undefined
): number | null {
  if (heightCm == null || weightKg == null) return null;
  if (heightCm <= 0 || weightKg <= 0) return null;
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  if (!Number.isFinite(bmi) || bmi <= 0 || bmi > 200) return null;
  return Math.round(bmi * 10) / 10;
}

export function formatBmiDisplay(bmi: number | null | undefined): string {
  if (bmi == null || !Number.isFinite(bmi)) return 'N/A';
  return bmi.toFixed(1);
}

export function bmiCategoryLabel(bmi: number | null | undefined): string {
  if (bmi == null || !Number.isFinite(bmi)) return 'Not recorded';
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

export function formatHeightFromInches(totalInches: number): string {
  const inches = Math.round(totalInches);
  if (inches <= 0) return '—';
  const ft = Math.floor(inches / 12);
  const rem = inches % 12;
  return `${ft}'${rem}"`;
}

export function formatWeightLbs(lbs: number): string {
  if (!Number.isFinite(lbs) || lbs <= 0) return '—';
  return `${Math.round(lbs * 10) / 10} lb`;
}

export function formatBloodPressure(
  systolic: number | null | undefined,
  diastolic: number | null | undefined
): string {
  if (systolic == null || diastolic == null) return '—';
  if (systolic <= 0 || diastolic <= 0) return '—';
  return `${systolic}/${diastolic}`;
}
