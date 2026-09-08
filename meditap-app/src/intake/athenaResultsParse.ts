/**
 * Athena Data Portability PDF — Results (lab observations + imaging) → Tab14LabPanel[].
 * Text layer is noisy (wrapped columns); heuristics group rows into panels by family + date.
 */

import { tryParseDateToIso } from './intakeDateParse';
import type { Tab14LabComponent, Tab14LabPanel, Tab14LabPanelCategory } from './tab14IntakeTypes';
import {
  normalizePortabilityGluedDates,
  normalizePortabilityGluedSectionHeaders,
} from './tab14PortabilitySections';

function collapseWs(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function titleCasePanel(name: string): string {
  const n = collapseWs(name);
  if (/^sureswab/i.test(n)) return 'SureSwab';
  if (/^urinalysis/i.test(n)) return 'Urinalysis';
  // PDF wrap often splits "UA/M" from "w/rflx …" — keep one panel family name.
  if (/^ua\/m\b/i.test(n)) return 'UA/M w/rflx';
  if (/^(us|ct|xr|mri)\b/i.test(n)) return n.replace(/\s+/g, ' ');
  return n.replace(/\b\w/g, (c) => c.toUpperCase());
}

function cleanAnalyteName(name: string): string {
  return collapseWs(name)
    .replace(/^w\/rflx\s+/i, '')
    .replace(/,\s*semi-?\s*$/i, '')
    .replace(/,semi-?$/i, '')
    .trim();
}

function isImagingTitle(name: string): boolean {
  return /^(?:US|CT|XR|MRI)\b/i.test(collapseWs(name));
}

function makeComponent(
  name: string,
  valueRaw: string,
  range: string,
  flag: string
): Tab14LabComponent {
  const value = collapseWs(valueRaw);
  const num = Number(value.replace(/,/g, ''));
  const critical = /abnormal|high|low|critical|positive/i.test(flag) && !/normal/i.test(flag);
  const base: Tab14LabComponent = {
    name: cleanAnalyteName(name) || 'Result',
    unit: '',
    range: collapseWs(range),
    critical,
    ...(flag && !/^normal$/i.test(flag) ? { interpretation: collapseWs(flag) } : {}),
  };
  if (value && Number.isFinite(num) && /^-?\d+(\.\d+)?$/.test(value.replace(/,/g, ''))) {
    return { ...base, value: num };
  }
  return { ...base, textValue: value || '—' };
}

type ParsedObs = {
  dateIso: string;
  panelName: string;
  component: Tab14LabComponent;
  status: string;
  category: Tab14LabPanelCategory;
  notes?: string;
};

function stripTrailingMeta(body: string): string {
  return collapseWs(body)
    .replace(
      /\s+(?:Jennifer Marie|Jazmin Quiroz|Not Available|Orr,?\s*MD|Quest|ELP_ACWHP|Cny Diagnostic|Akumin|Osborne|Imaging Hill)[\s\S]*$/i,
      ''
    )
    .replace(/\s+\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}.*$/i, '')
    .trim();
}

function parseObservationRow(row: string): ParsedObs | null {
  const m = collapseWs(row).match(
    /^(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+)$/
  );
  if (!m) return null;
  const dateIso = tryParseDateToIso(m[2]) || tryParseDateToIso(m[1]) || m[2];
  // Athena PDF often glues flag+status: "normalcompleted", "npcancelled"
  let body = m[3]
    .replace(/(normal|abnormal|high|low|positive|negative)(completed|cancelled|preliminary|final)\b/gi, '$1 $2')
    .replace(/(np|trace|few|many|clear|yellow)(completed|cancelled)\b/gi, '$1 $2')
    .replace(/(mg\/dL)(\d)/gi, '$1 $2');
  const statusM = body.match(/\b(completed|preliminary|final|corrected|cancelled)\b/i);
  const status = statusM?.[1] ? statusM[1].replace(/^./, (c) => c.toUpperCase()) : 'Completed';

  // Imaging rows that leaked into observation table
  if (isImagingTitle(body)) {
    const titleBits = body.match(
      /^((?:US|CT|XR|MRI)[\s,]*(?:pelvis|abdomen|chest|head|spine)?[^]*?(?:transabdominal|transvaginal|\+)?)/i
    );
    let title = titleBits
      ? collapseWs(
          titleBits[1]
            .replace(/\s*,\s*(This document|No observation).*$/i, '')
            .replace(/\s+/g, ' ')
        )
      : 'Imaging study';
    if (/transabdominal/i.test(body) && /transvaginal/i.test(body) && !/transvaginal/i.test(title)) {
      title = collapseWs(`${title.replace(/\+\s*$/, '')} + transvaginal`);
    }
    if (!/US|CT|XR|MRI/i.test(title)) title = 'US, pelvis';
    const note =
      /No observation recorded/i.test(body)
        ? 'No observation recorded.'
        : /This document/i.test(body)
          ? 'Document received (see imaging Results).'
          : undefined;
    return {
      dateIso,
      panelName: titleCasePanel(title),
      component: makeComponent('Status', status, '', ''),
      status,
      category: 'imaging',
      notes: note,
    };
  }

  // Urinalysis / panel, Analyte: Value
  const colon = body.match(
    /^([^,]+),\s*([^:]+):\s*(.+?)(?:\s+completed|\s+cancelled|\s+Jennifer|\s+Jazmin|\s+\d{1,2}\/\d)/i
  );
  if (colon) {
    const panelName = titleCasePanel(colon[1]);
    const valuePart = stripTrailingMeta(colon[3]);
    return {
      dateIso,
      panelName,
      component: makeComponent(colon[2], valuePart, '', ''),
      status,
      category: 'lab',
    };
  }

  // SureSwab(R) … value range flag completed
  const swab = body.match(
    /^sureswab\(R\)\s+(?:sureswab\(R\)\s+)?(.+?)\s+(not\s+detected|detected|negative|positive)\s+(not\s+detected|negative|positive|normal)\s+(normal|abnormal)\s*completed/i
  );
  if (swab) {
    let analyte = collapseWs(swab[1])
      .replace(/^adv\b/i, 'advanced bacterial vaginitis plus')
      .replace(/\b(chlamydia|neisseria|trichomonas)\b/i, (s) => {
        if (/chlamydia/i.test(s)) return 'chlamydia trachomatis RNA';
        if (/neisseria/i.test(s)) return 'neisseria gonorrhoeae';
        if (/trichomonas/i.test(s)) return 'trichomonas vaginalis (TV)';
        return s;
      });
    if (/^advanced bacterial/i.test(analyte) && analyte.length < 40) {
      analyte = 'advanced bacterial vaginitis plus';
    }
    return {
      dateIso,
      panelName: 'SureSwab',
      component: makeComponent(analyte, swab[2], swab[3], swab[4]),
      status,
      category: 'lab',
    };
  }

  // UA/M w/rflx analyte value [range] [flag] completed|cancelled
  // Allow glued status: "...normalcompleted" / "...npcancelled"
  const uam = body.match(
    /^UA\/M\s+w\/rflx\s+(.+?)(?:\s+|\b)(completed|cancelled)\b/i
  );
  if (uam) {
    const mid = collapseWs(uam[1]);
    const cancelled = /cancelled/i.test(uam[2]);
    // value-centric: "specific gravity 1.017 1.005-1.030 normal"
    const dense = mid.match(
      /^(.+?)\s+((?:none\s+seen|see\s+below:|np|trace|few|clear|yellow|negative|positive|-?[\d.]+(?:\s*-\s*[\d.]+)?|(?:>=?|<=?)[\d.]+))\s*(.*?)$/i
    );
    if (dense) {
      const analyte = dense[1].replace(/,\s*semi-?$/i, '').trim();
      let value = dense[2];
      let rest = dense[3].trim();
      // glued "0.2 mg/dL0.2-1.0" / "urobilinogen,semi-0.2 mg/dL0.2-1.0 normal"
      const glued = mid.match(
        /^(.+?),\s*semi-?\s*(-?[\d.]+)\s*mg\/dL\s*(-?[\d.]+(?:\s*-\s*[\d.]+)?)\s*(normal|abnormal)?/i
      );
      if (glued) {
        return {
          dateIso,
          panelName: 'UA/M w/rflx',
          component: makeComponent(glued[1], `${glued[2]} mg/dL`, glued[3], glued[4] || ''),
          status: cancelled ? 'Cancelled' : status,
          category: 'lab',
        };
      }
      let range = '';
      let flag = '';
      const flagM = rest.match(/\b(normal|abnormal|high|low)\b/i);
      if (flagM) flag = flagM[1];
      const rangeM = rest.match(/([\d.<>=]+\s*-\s*[\d.]+|none\s+seen|negative(?:\/trace)?|\/hpf|\/lpf)/i);
      if (rangeM) range = rangeM[1];
      else if (/\/hpf|\/lpf/i.test(value)) {
        // "none seen /hpf 0 - 5"
        const unitSplit = mid.match(
          /^(.+?)\s+(none\s+seen|[\d.-]+)\s+(\/hpf|\/lpf)\s+(.+)$/i
        );
        if (unitSplit) {
          return {
            dateIso,
            panelName: 'UA/M w/rflx',
            component: makeComponent(
              unitSplit[1],
              `${unitSplit[2]} ${unitSplit[3]}`,
              unitSplit[4].replace(/\b(normal|abnormal)\b/i, '').trim(),
              flag
            ),
            status: cancelled ? 'Cancelled' : status,
            category: 'lab',
          };
        }
      }
      if (/urine culture|result\s+1\s+comment|microscopic|comment|reflex/i.test(analyte) || /see below/i.test(value)) {
        const note = /Culture shows|This specimen has reflexed/i.test(body)
          ? (body.match(/(?:Culture shows|This specimen has reflexed)[\s\S]{0,160}/i)?.[0] ?? value)
          : value;
        return {
          dateIso,
          panelName: 'UA/M w/rflx',
          component: makeComponent(analyte || 'Comment', note.slice(0, 160), '', flag),
          status: cancelled ? 'Cancelled' : status,
          category: 'lab',
        };
      }
      return {
        dateIso,
        panelName: 'UA/M w/rflx',
        component: makeComponent(analyte, value, range, flag),
        status: cancelled ? 'Cancelled' : status,
        category: 'lab',
      };
    }
    return {
      dateIso,
      panelName: 'UA/M w/rflx',
      component: makeComponent(mid.slice(0, 80), cancelled ? 'cancelled' : status, '', ''),
      status: cancelled ? 'Cancelled' : status,
      category: 'lab',
    };
  }

  // UA/M without spaced "w/rflx" (wrapped PDF): "UA/M w/rflx microscopic…" already handled;
  // bare "UA/M …" still belongs to the same panel family.
  if (/^UA\/M\b/i.test(body)) {
    const mid = collapseWs(body.replace(/^UA\/M(?:\s+w\/rflx)?\s*/i, ''));
    const cancelled = /\bcancelled\b/i.test(body);
    const analyte = mid
      .replace(/\s*(?:completed|cancelled)\b[\s\S]*$/i, '')
      .replace(/\s+(?:Jennifer|Jazmin|Not Available|Cny Diagnostic).*$/i, '')
      .trim();
    return {
      dateIso,
      panelName: 'UA/M w/rflx',
      component: makeComponent(
        analyte.slice(0, 80) || 'Result',
        cancelled ? 'cancelled' : status,
        '',
        ''
      ),
      status: cancelled ? 'Cancelled' : status,
      category: 'lab',
    };
  }

  // Dense urinalysis without colon: urinalysis, pH 5.5 5.0-7.5 normal completed
  const denseUa = body.match(
    /^urinalysis,\s*(.+?)\s+(completed|cancelled)\b/i
  );
  if (denseUa) {
    const mid = collapseWs(denseUa[1]);
    const parts = mid.match(
      /^(.+?)\s+(-?[\d.]+(?:\s*-\s*[\d.]+)?|(?:>=?|<=?)[\d.]+|[A-Za-z][\w/-]*)\s*(.*?)$/
    );
    if (parts) {
      const flagM = parts[3].match(/\b(normal|abnormal)\b/i);
      const rangeM = parts[3].match(/([\d.<>=]+\s*-\s*[\d.]+|negative(?:\/trace)?)/i);
      return {
        dateIso,
        panelName: 'Urinalysis',
        component: makeComponent(
          parts[1],
          parts[2],
          rangeM?.[1] ?? '',
          flagM?.[1] ?? ''
        ),
        status,
        category: 'lab',
      };
    }
  }

  // Meditech CCD observation rows (panel may wrap: "comprehensive … Ri metabolic panel"):
  // `lipid panel LDL Cholesterol 128 mg/dL <130 normal completed`
  const meditechLab = body.match(
    /^(comprehensive(?:\s+metabolic\s+panel)?|lipid\s+panel|basic(?:\s+metabolic\s+panel)?)\s+(.+?)\s+(-?[\d.]+)\s+(mg\/dL|g\/dL|mmol\/L|%|U\/L|mmol\/mol)\s+([<>]?[\d.]+(?:\s*-\s*[\d.]+)?)\s+(normal|abnormal|high|low)\s+(completed|cancelled)\b/i
  );
  if (meditechLab) {
    let panelName = collapseWs(meditechLab[1]);
    if (/^comprehensive$/i.test(panelName) && /metabolic\s+panel/i.test(body)) {
      panelName = 'comprehensive metabolic panel';
    }
    return {
      dateIso,
      panelName: titleCasePanel(panelName),
      component: makeComponent(
        meditechLab[2],
        `${meditechLab[3]} ${meditechLab[4]}`,
        meditechLab[5],
        meditechLab[6]
      ),
      status: /cancelled/i.test(meditechLab[7]) ? 'Cancelled' : 'Completed',
      category: 'lab',
    };
  }

  // Meditech imaging row mixed into Results observations — skip duplicate here.
  if (/^chest\s+x-?ray\b/i.test(body) || /^imaging\b/i.test(body)) {
    return {
      dateIso,
      panelName: titleCasePanel(body.slice(0, 40)),
      component: makeComponent('Status', status, '', ''),
      status,
      category: 'imaging',
    };
  }

  // Fallback: first token as panel, rest as component name with status as value
  const fb = body.match(/^([A-Za-z0-9()/.+-]+)\s+(.+)$/);
  if (!fb) return null;
  const clipped = stripTrailingMeta(fb[2]).slice(0, 80);
  return {
    dateIso,
    panelName: titleCasePanel(fb[1]),
    component: makeComponent(clipped || 'Result', status, '', ''),
    status,
    category: isImagingTitle(fb[1]) ? 'imaging' : 'lab',
  };
}

function groupObservations(rows: ParsedObs[]): Tab14LabPanel[] {
  const map = new Map<string, Tab14LabPanel>();
  for (const row of rows) {
    const key = `${row.category}|${row.panelName.toLowerCase()}|${row.dateIso}`;
    let panel = map.get(key);
    if (!panel) {
      panel = {
        testName: row.panelName,
        date: row.dateIso,
        status: row.status === 'Completed' ? 'Final' : row.status,
        isNew: true,
        category: row.category,
        components: [],
        ...(row.notes ? { notes: row.notes } : {}),
      };
      map.set(key, panel);
    }
    const nameKey = row.component.name.toLowerCase();
    const existing = panel.components.findIndex((c) => c.name.toLowerCase() === nameKey);
    if (existing >= 0) {
      const prev = panel.components[existing];
      const prevLen =
        String(prev.textValue ?? prev.value ?? '').length + (prev.range?.length ?? 0);
      const nextLen =
        String(row.component.textValue ?? row.component.value ?? '').length +
        (row.component.range?.length ?? 0);
      if (nextLen > prevLen) panel.components[existing] = row.component;
    } else {
      panel.components.push(row.component);
    }
    if (row.notes && !panel.notes) panel.notes = row.notes;
  }
  return [...map.values()].filter((p) => p.components.length > 0);
}

function parseObservationBlock(text: string): Tab14LabPanel[] {
  const m = text.match(
    /Results\s+Created(?:\s+Date)?\s+Observation(?:\s+Date)?([\s\S]*?)(?=Results\s+Imaging\b|Imaging\s+Results\b|Medical\s+Equipment\b|\bProblems\b|\bAllergies\b)/i
  );
  if (!m) return [];
  const flat = collapseWs(m[1]);
  const chunks = flat
    .split(/(?=\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}\/\d{1,2}\/\d{4}\s+)/)
    .map((c) => c.trim())
    .filter((c) => /^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}\/\d{1,2}\/\d{4}\s+/.test(c));

  const parsed: ParsedObs[] = [];
  for (const chunk of chunks) {
    const row = parseObservationRow(chunk);
    // Imaging studies appear again under "Results Imaging" — skip duplicates here.
    if (row && row.category !== 'imaging') parsed.push(row);
  }
  return groupObservations(parsed);
}

/**
 * Harold-style named panels:
 * `Results Diabetes Initial Diagnostic Panel — 02/11/2025 …`
 * `02/11/2025 Diabetes Initial Diagnostic Panel Hemoglobin A1c serum, completed 9.4 % 4.0-5.6 % High`
 */
function parseNamedPanelResultsBlock(text: string): Tab14LabPanel[] {
  // Prefer the last Results body that introduces a named panel (skip TOC "Results").
  const starts = [
    ...text.matchAll(/Results\s+(?=[A-Za-z][\s\S]{0,120}?Panel\s*[—\-])/gi),
  ];
  const start = starts.length ? starts[starts.length - 1] : null;
  if (!start || start.index == null) return [];
  const rest = text.slice(start.index);
  const endRel = rest.search(
    /\bProblems\s+Problem\s+ICD|\bProblems\s+Condition\s+Status\b|\bAllergies\s+Allergen\b|\bProcedures\s+None\b/i
  );
  let flat = collapseWs(endRel >= 0 ? rest.slice(0, endRel) : rest.slice(0, 20000))
    .replace(/Panel(?=[A-Za-z])/g, 'Panel ')
    .replace(/completed(?=\d)/gi, 'completed ');

  const parsed: ParsedObs[] = [];
  const re =
    /(\d{1,2}\/\d{1,2}\/\d{4})\s+((?:[A-Za-z][A-Za-z0-9 /+&'-]{2,80}?)\s+Panel)\s+([A-Za-z][A-Za-z0-9 ,/+&'%.-]{1,80}?)\s*(?:serum|blood|urine)?\s*,?\s*completed\s*([<>]?\d+(?:\.\d+)?|Negative|Positive|None)\s*([A-Za-zµ/%]+(?:\/[A-Za-z]+)?|uIU\/mL|mg\/dL|ng\/mL|pg\/mL|mmol\/L|IU\/mL)?\s*([\d.<]+(?:\s*-\s*[\d.]+)?|Negative|none)?\s*(?:[A-Za-zµ/%]+(?:\/[A-Za-z]+)?|uIU\/mL|mg\/dL|ng\/mL|pg\/mL|mmol\/L)?\s*(High|Low|Normal|Negative|Positive|Abnormal)?\s*completed/gi;

  for (const hit of flat.matchAll(re)) {
    const dateIso = tryParseDateToIso(hit[1]) || hit[1];
    const panelName = titleCasePanel(
      collapseWs(hit[2])
        .replace(/\s+Panel$/i, '')
        .replace(/\s*[—\-].*$/, '')
    );
    const analyte = collapseWs(hit[3]).replace(/,\s*$/, '');
    if (!analyte || analyte.length < 2) continue;
    if (/^(date|observation|value|range|flag|reported)$/i.test(analyte)) continue;
    const value = collapseWs([hit[4], hit[5]].filter(Boolean).join(' '));
    const range = collapseWs(hit[6] ?? '');
    const flag = hit[7] ?? '';
    parsed.push({
      dateIso,
      panelName: panelName || 'Lab Panel',
      component: makeComponent(analyte, value, range, flag),
      status: 'Final',
      category: 'lab',
    });
  }
  return groupObservations(parsed);
}

function parseImagingBlock(text: string): Tab14LabPanel[] {
  const m = text.match(
    /Results\s+Imaging([\s\S]*?)(?=Procedure\s+Notes\b|Medical\s+Equipment\b|\bAllergies\b|\bProblems\b)/i
  );
  const panels: Tab14LabPanel[] = [];
  const seen = new Set<string>();
  const flat = m ? collapseWs(m[1]) : '';

  if (flat) {
    for (const hit of flat.matchAll(
      /(\d{1,2}\/\d{1,2}\/\d{4})\s+((?:US|CT|XR|MRI)[\s,][^]*?)(?=\d{1,2}\/\d{1,2}\/\d{4}\s+(?:US|CT|XR|MRI)\b|$)/gi
    )) {
      const dateIso = tryParseDateToIso(hit[1]) || hit[1];
      let chunk = hit[2];
      const completed = /completed/i.test(chunk);
      let title = collapseWs(
        chunk
          .replace(/\s*completed[\s\S]*$/i, '')
          .replace(/\s+/g, ' ')
      );
      // Reattach "transvaginal" when it appears after status metadata
      if (/transabdominal/i.test(chunk) && /transvaginal/i.test(chunk) && !/transvaginal/i.test(title)) {
        title = collapseWs(`${title.replace(/\+\s*$/, '')} + transvaginal`);
      }
      title = title
        .replace(/,?\s*Not Available.*$/i, '')
        .replace(/,?\s*Jennifer Marie.*$/i, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!title || title.length < 3) continue;
      const key = `${title.toLowerCase()}|${dateIso}`;
      if (seen.has(key)) continue;
      seen.add(key);
      panels.push({
        testName: title,
        date: dateIso,
        status: completed ? 'Final' : 'Unknown',
        isNew: true,
        category: 'imaging',
        modality: title.match(/^(US|CT|XR|MRI)\b/i)?.[1]?.toUpperCase(),
        components: [makeComponent('Status', completed ? 'completed' : 'unknown', '', '')],
      });
    }

    // Fallback simpler matches if regex above missed
    if (!panels.length) {
      for (const hit of flat.matchAll(
        /(\d{1,2}\/\d{1,2}\/\d{4})\s+((?:US|CT|XR|MRI)[^]*?)(?:completed|$)/gi
      )) {
        const dateIso = tryParseDateToIso(hit[1]) || hit[1];
        let title = collapseWs(hit[2]).slice(0, 80);
        if (/transvaginal/i.test(flat) && /transabdominal/i.test(title) && !/transvaginal/i.test(title)) {
          title = `${title.replace(/\+\s*$/, '')} + transvaginal`;
        }
        const key = `${title.toLowerCase()}|${dateIso}`;
        if (seen.has(key)) continue;
        seen.add(key);
        panels.push({
          testName: title,
          date: dateIso,
          status: 'Final',
          isNew: true,
          category: 'imaging',
          modality: title.match(/^(US|CT|XR|MRI)\b/i)?.[1]?.toUpperCase(),
          components: [makeComponent('Status', 'completed', '', '')],
        });
      }
    }
  }

  // Meditech: "Imaging Results Imaging Date Name Status Organization Details"
  const meditech = text.match(
    /Imaging\s+Results\s+Imaging\s+Date\s+Name\s+Status([\s\S]*?)(?=Medical\s+Equipment\b|\bAllergies\b|$)/i
  );
  if (meditech) {
    const block = collapseWs(meditech[1]);
    for (const hit of block.matchAll(
      /(\d{1,2}\/\d{1,2}\/\d{4})\s+([A-Za-z][A-Za-z0-9 ,/-]{2,80}?)\s+(completed|preliminary|final)\s+([A-Za-z][\s\S]*?)(?=\d{1,2}\/\d{1,2}\/\d{4}\s+[A-Za-z]|$)/gi
    )) {
      const dateIso = tryParseDateToIso(hit[1]) || hit[1];
      const title = collapseWs(hit[2]);
      if (!title || /^(name|status|organization)$/i.test(title)) continue;
      const key = `${title.toLowerCase()}|${dateIso}`;
      if (seen.has(key)) continue;
      seen.add(key);
      panels.push({
        testName: title,
        date: dateIso,
        status: /completed|final/i.test(hit[3]) ? 'Final' : hit[3],
        isNew: true,
        category: 'imaging',
        components: [
          makeComponent('Status', hit[3], '', ''),
          ...(hit[4]?.trim()
            ? [makeComponent('Facility', collapseWs(hit[4]).slice(0, 120), '', '')]
            : []),
        ],
      });
    }
  }

  return panels;
}

/** Parse Athena Results lab + imaging tables into Tab14 lab panels. */
export function parseAthenaDataPortabilityResults(text: string): Tab14LabPanel[] {
  const normalized = normalizePortabilityGluedSectionHeaders(
    normalizePortabilityGluedDates(text)
  );
  const labs = parseObservationBlock(normalized);
  const named = labs.length ? [] : parseNamedPanelResultsBlock(normalized);
  const imaging = parseImagingBlock(normalized);

  const seen = new Set<string>();
  const out: Tab14LabPanel[] = [];
  for (const panel of [...labs, ...named, ...imaging]) {
    const key = `${panel.category}|${panel.testName.toLowerCase()}|${panel.date}`;
    if (seen.has(key)) {
      // Prefer panel with more components
      const idx = out.findIndex(
        (p) => `${p.category}|${p.testName.toLowerCase()}|${p.date}` === key
      );
      if (idx >= 0 && panel.components.length > out[idx].components.length) {
        out[idx] = panel;
      }
      continue;
    }
    seen.add(key);
    out.push(panel);
  }
  return out;
}
