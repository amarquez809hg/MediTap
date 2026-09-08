/**
 * EHR document types patients/staff can declare before Tab14 upload.
 * Selection guides specialized parsers; auto-detect remains available.
 */

export type EhrDocumentTypeId =
  | 'athena'
  | 'meditech'
  | 'epic'
  | 'nextgen'
  | 'generic'
  | 'auto';

export type EhrDocumentTypeStatus = 'ready' | 'partial' | 'planned';

export type EhrDocumentTypeOption = {
  id: EhrDocumentTypeId;
  /** Stable English label (UI may i18n separately). */
  label: string;
  shortLabel: string;
  status: EhrDocumentTypeStatus;
  /** One-line hint under the card. */
  hint: string;
};

/** Clinic export families + Generic/Other, plus auto-detect. */
export const EHR_DOCUMENT_TYPE_OPTIONS: EhrDocumentTypeOption[] = [
  {
    id: 'athena',
    label: 'Athena Health',
    shortLabel: 'Athena',
    status: 'ready',
    hint: 'Data Portability / patient portal PDF exports',
  },
  {
    id: 'meditech',
    label: 'MEDITECH',
    shortLabel: 'MEDITECH',
    status: 'ready',
    hint: 'MyHealth CCD / Continuity of Care Document exports',
  },
  {
    id: 'epic',
    label: 'Epic',
    shortLabel: 'Epic',
    status: 'ready',
    hint: 'My Health Summary / MyChart (Mayo -as of dialect + Centralus Summary of Care)',
  },
  {
    id: 'nextgen',
    label: 'NextGen Healthcare',
    shortLabel: 'NextGen',
    status: 'planned',
    hint: 'Parser in progress — general extract until dialects land',
  },
  {
    id: 'generic',
    label: 'Generic / Other',
    shortLabel: 'Generic',
    status: 'ready',
    hint: 'Any other PDF or scan — general extract (not Athena / MEDITECH / Epic / NextGen)',
  },
  {
    id: 'auto',
    label: 'Auto-detect',
    shortLabel: 'Auto',
    status: 'ready',
    hint: 'Try every known format (use when the source EHR is unclear)',
  },
];

export function ehrDocumentTypeById(id: EhrDocumentTypeId): EhrDocumentTypeOption | undefined {
  return EHR_DOCUMENT_TYPE_OPTIONS.find((o) => o.id === id);
}

export function ehrDocumentTypeStatusLabel(status: EhrDocumentTypeStatus): string {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'partial':
      return 'Partial';
    case 'planned':
      return 'Coming soon';
    default:
      return status;
  }
}

/** Left-sidebar badge for the active intake dialect (e.g. "MEDITECH Intake Panel"). */
export function ehrIntakePanelTitle(id: EhrDocumentTypeId | null | undefined): string {
  switch (id) {
    case 'athena':
      return 'Athena Intake Panel';
    case 'meditech':
      return 'MEDITECH Intake Panel';
    case 'epic':
      return 'Epic Intake Panel';
    case 'nextgen':
      return 'NextGen Intake Panel';
    case 'generic':
      return 'Generic Intake Panel';
    case 'auto':
      return 'Auto-detect Intake Panel';
    default:
      return 'Select document format';
  }
}

/** Options shown as the primary vendor panel (excludes Auto). */
export const EHR_VENDOR_PANEL_OPTIONS = EHR_DOCUMENT_TYPE_OPTIONS.filter((o) => o.id !== 'auto');

/** Specialized EHR dialects (Generic uses general extract only). */
export type EhrSpecializedVendorId = Exclude<EhrDocumentTypeId, 'auto' | 'generic'>;

export type ParseTab14DocumentOptions = {
  /**
   * When set (and not `auto`), only that vendor’s specialized parser runs.
   * `generic` skips all specialized EHR dialects (general extract only).
   * Demo / Riverbend / Spanish helpers still run — they are not EHR vendor exports.
   */
  preferredVendor?: EhrDocumentTypeId;
};

export function shouldRunVendorParser(
  vendor: EhrSpecializedVendorId,
  preferred: EhrDocumentTypeId | undefined
): boolean {
  if (!preferred || preferred === 'auto') return true;
  if (preferred === 'generic') return false;
  return preferred === vendor;
}
