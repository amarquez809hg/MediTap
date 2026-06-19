/** Parse many date styles to YYYY-MM-DD when unambiguous. */
export function tryParseDateToIso(raw: string): string | undefined {
  const s = raw.trim();
  if (!s) return undefined;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
  }
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    let mo = +m[1];
    let day = +m[2];
    const y = +m[3];
    if (mo > 12 && day >= 1 && day <= 12) {
      [mo, day] = [day, mo];
    }
    if (mo >= 1 && mo <= 12 && day >= 1 && day <= 31) {
      const d = new Date(y, mo - 1, day);
      return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
    }
  }
  m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) {
    const mo = +m[1];
    const day = +m[2];
    const y = +m[3];
    if (mo >= 1 && mo <= 12 && day >= 1 && day <= 31) {
      const d = new Date(y, mo - 1, day);
      return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
    }
  }
  m = s.match(
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})$/i
  );
  if (m) {
    const months: Record<string, number> = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      sept: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };
    const moKey = m[1].toLowerCase().slice(0, 3) as keyof typeof months;
    const mo = months[moKey];
    if (mo === undefined) return undefined;
    const d = new Date(+m[3], mo, +m[2]);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
  }
  m = s.match(/^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})$/i);
  if (m) {
    const months: Record<string, number> = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      sept: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };
    const moKey = m[2].toLowerCase().slice(0, 3) as keyof typeof months;
    const mo = months[moKey];
    if (mo === undefined) return undefined;
    const d = new Date(+m[3], mo, +m[1]);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
  }
  return undefined;
}
