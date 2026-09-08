import { describe, expect, it } from 'vitest';
import { parseAthenaDataPortabilityResults } from './athenaResultsParse';

const SAMPLE = `
Results Created Observation Name Description Value Unit Range Abnormal Specimen Result Note LastModifiedBy Organization LastModifiedTime
Date Date Flag Type Status Detail
08/23/2025 08/23/2025 sureswab(R) sureswab(R) adv negative negative normal completed Jennifer Marie Quest 08/25/2025 advanced bacterial Orr, MD Diagnostics - 15:25:28 vaginitis plus
08/23/2025 08/23/2025 sureswab(R) candida species detected not detected abnormal completed Jennifer Marie Quest 08/25/2025
08/23/2025 08/23/2025 sureswab(R) candida glabrata not detected not detected normal completed
08/23/2025 08/23/2025 sureswab(R) trichomonas not detected not detected normal completed
08/23/2025 08/23/2025 sureswab(R) chlamydia not detected not detected normal completed
08/23/2025 08/23/2025 sureswab(R) neisseria not detected not detected normal completed
01/12/2026 01/12/2026 urinalysis, Color: Yellow completed Jennifer Marie ELP_ACWHP 01/12/2026 dipstick Orr, MD - Mesa
01/12/2026 01/12/2026 urinalysis, Clarity: Clear completed Jennifer Marie ELP_ACWHP
01/12/2026 01/12/2026 urinalysis, Leukocytes: Negative completed Jennifer Marie ELP_ACWHP
01/12/2026 01/12/2026 urinalysis, Nitrites: negative completed Jennifer Marie ELP_ACWHP
01/12/2026 01/12/2026 urinalysis, pH: 6.0 completed Jennifer Marie ELP_ACWHP
04/06/2026 04/07/2026 UA/M w/rflx specific gravity 1.017 1.005-1.030 normal completed Jazmin Quiroz Cny Diagnostic
04/06/2026 04/07/2026 UA/M w/rflx WBC esterase trace negative abnormal completed Jazmin Quiroz
Results Imaging Name Status LastModifiedBy Organization Detail LastModifiedTime
Date
08/21/2025 US, pelvis, transabdominal + completedNot Available Akumin Osborne , 4930 Osbourne,Ste H , El Paso , TX , 79922, US , (915) 544- transvaginal 7300 02:31:14
01/11/2026 US, pelvis, transabdominal + completedJennifer Marie Orr, Akumin Osborne , 4930 Osbourne,Ste H , El Paso , TX , 79922, US , (915) transvaginal MD 7300 19:24:42
Medical Equipment None Reported.
Allergies
`;

describe('parseAthenaDataPortabilityResults', () => {
  it('groups SureSwab, Urinalysis, UA/M, and imaging panels', () => {
    const panels = parseAthenaDataPortabilityResults(SAMPLE);
    expect(panels.length).toBeGreaterThanOrEqual(4);

    const swab = panels.find((p) => /sureswab/i.test(p.testName));
    expect(swab).toBeTruthy();
    expect(swab!.date).toBe('2025-08-23');
    expect(swab!.category).toBe('lab');
    expect(swab!.components.length).toBeGreaterThanOrEqual(5);
    expect(swab!.components.some((c) => /candida species/i.test(c.name))).toBe(true);
    expect(swab!.components.some((c) => /negative|detected/i.test(String(c.textValue)))).toBe(
      true
    );

    const ua = panels.find((p) => p.testName === 'Urinalysis' && p.date === '2026-01-12');
    expect(ua).toBeTruthy();
    expect(ua!.components.some((c) => /color/i.test(c.name) && /yellow/i.test(String(c.textValue)))).toBe(
      true
    );
    expect(ua!.components.some((c) => /leukocytes/i.test(c.name))).toBe(true);

    const uam = panels.find((p) => /UA\/M/i.test(p.testName));
    expect(uam).toBeTruthy();
    expect(uam!.components.some((c) => /specific gravity/i.test(c.name))).toBe(true);

    const imaging = panels.filter((p) => p.category === 'imaging');
    expect(imaging.length).toBeGreaterThanOrEqual(2);
    expect(imaging.some((p) => /pelvis|transvaginal/i.test(p.testName))).toBe(true);
  });
});
