import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './Tab14.css';
import './Tab5.css';
import { useLocation } from 'react-router-dom';
import { GlassDateInput } from '../components/GlassDatePicker';
import { chartPageGoBackFallback } from '../navigation/portalGoBack';
import { usePortalHistory } from '../navigation/PortalHistoryContext';
import { useAuth } from '../contexts/AuthContext';
import { markOnboardingStep } from '../onboarding/onboardingStorage';
import { getMeditapRecordEditorRole } from '../config/meditap-roles';
import { clearTab14DraftKeysOnly } from '../auth/clearWorkflowLocalState';
import {
    loadTab14FromBackend,
    saveTab14ToBackend,
    createPatientLabPanel,
    updatePatientLabPanel,
    deletePatientLabPanel,
    fetchPatientLabPanels,
    ensurePatientForCurrentSession,
    listPatientDocuments,
    uploadPatientDocument,
    updatePatientDocumentStatus,
    fetchPatientDocumentBlobUrl,
    type PatientLabPanelWriteBody,
    type Tab14LoadResult,
} from '../api';
import { parseTab14IntakeDocument } from '../intake/tab14DocumentParse';
import {
    EHR_VENDOR_PANEL_OPTIONS,
    ehrDocumentTypeStatusLabel,
    ehrIntakePanelTitle,
    type EhrDocumentTypeId,
} from '../intake/ehrDocumentTypes';
import { EpicDemographicsOccurrencesPanel } from './EpicDemographicsOccurrencesPanel';
import { EpicNoteFromClinicOccurrencesPanel } from './EpicNoteFromClinicOccurrencesPanel';
import { EpicSectionOccurrencesPanel } from './EpicSectionOccurrencesPanel';
import {
    computeIntakeCompleteness,
    formatIntakeCompletenessSummary,
} from '../intake/intakeCompleteness';
import type {
  AthenaPortabilityCompletenessResult,
} from '../intake/athenaPortabilityCompleteness';
import {
    computeAthenaPortabilityCompleteness,
    formatAthenaPortabilityCompletenessSummary,
    shouldScoreAthenaPortability,
} from '../intake/athenaPortabilityCompleteness';
import {
    acceptAllPatientFieldWarnings,
    acceptHospitalFieldWarning,
    acceptIndexedFieldWarning,
    acceptPatientFieldWarning,
    evaluatePatientFieldReviewGate,
    rejectHospitalFieldWarning,
    rejectIndexedFieldWarning,
    rejectPatientFieldWarning,
    type FieldReviewState,
    type IndexedFieldReviewState,
} from '../intake/intakeFieldReview';
import { mergeAllergiesFromPdf } from '../intake/mergeTab14Allergies';
import {
    mergeChronicConditionsFromPdf,
    mergeInsurancesFromPdf,
    mergeMedicationsFromPdf,
} from '../intake/mergeTab14IntakeUpload';
import {
    applyTab14ParseBundle,
    bundleHasPatientIdentity,
    clearPatientFieldWarning,
    emptyMergeSnapshot,
    formatTab14MergeStatsNotes,
    mergePdfPatientFieldWarnings,
    mergePdfPatientFields,
    type Tab14MergeSnapshot,
} from '../intake/applyTab14ParseBundle';
import type {
    Tab14AllergyFieldKey,
    Tab14AllergyRowWarnings,
    Tab14ChronicConditionWarnings,
    Tab14ChronicFieldKey,
    Tab14HospitalFieldKey,
    Tab14HospitalFieldWarnings,
    Tab14InsuranceFieldKey,
    Tab14InsuranceRowWarnings,
    Tab14IntakeParseResult,
    Tab14LabPanel,
    Tab14LabPanelCategory,
    Tab14MedicationFieldKey,
    Tab14MedicationRowWarnings,
    Tab14PatientFieldKey,
    Tab14PatientFieldWarnings,
    Tab14PatientFields,
    Tab14VitalReading,
} from '../intake/tab14IntakeTypes';
import { emptyInsuranceRow } from '../intake/tab14IntakeTypes';
import { vitalReadingToPatientFields } from '../intake/tab14DocumentParse';
import {
    emptyExtendedSections,
    mergeExtendedSections,
    type Tab14ExtendedSectionKey,
    type Tab14ExtendedSections,
} from '../intake/tab14PortabilitySections';
import { buildTab14SidebarNavForEhr, ehrSidebarNavLabel } from '../intake/ehrSidebarNav';
import Tab14ExtendedSectionPanel from './Tab14ExtendedSectionPanel';
import {
    loadTab14LegacyFromLocalStorage,
    tab14LegacyToSaveInput,
} from '../intake/tab14LegacyStorage';
import {
    extractTab14UploadFileText,
    isTab14UploadFileType,
} from '../intake/documentTextExtraction';
import {
    annotateOcrSparseWarnings,
    buildAllergyRowWarnings,
    buildChronicConditionWarnings,
    buildHospitalFieldWarnings,
    buildInsuranceRowWarnings,
    buildMedicationRowWarnings,
    clearChronicConditionWarning,
    clearIndexedFieldWarning,
    FIELD_WARNING_MESSAGES,
    removeIndexedWarningRow,
} from '../intake/intakeFieldWarnings';
import {
    bmiCategoryLabel,
    computeBmiFromMetric,
    formatBmiDisplay,
    inchesToCm,
    lbsToKg,
} from '../vitals/bmi';
import {
    mapPatientLabPanelToRow,
    mapTab14LabPanelToRow,
    type LabResultLineItem,
    type LabResultRow,
} from '../labResults/labResultModel';
import { LAB_STATUS_OPTIONS } from '../labResults/labResultFieldCatalog';
import {
    IonPage,
    IonContent,
    IonIcon
} from '@ionic/react';
import { warningOutline } from 'ionicons/icons';

interface PatientInfo {
    givenName: string;
    familyName: string;
    /** Epic Patient Demographics full name (optional display aid). */
    patientFullName: string;
    /** Epic Former / Aliases (semicolon-separated). */
    formerAliases: string;
    dateOfBirth: string;
    bloodType: string;
    email: string;
    additionalEmails: string[];
    phoneNumber: string;
    homePhone: string;
    /** Epic Communication column (phones + email). */
    communication: string;
    address: string;
    race: string;
    ethnicity: string;
    preferredLanguage: string;
    maritalStatus: string;
    sexAtBirth: string;
    legalSex: string;
    genderIdentity: string;
    sexualOrientation: string;
    sexAtBirthRecordedOn: string;
    otherNotes: string;
    heightInches: string;
    weightLbs: string;
    systolicBp: string;
    diastolicBp: string;
    heartRate: string;
    temperatureF: string;
    temperatureC: string;
    respiratoryRate: string;
    oxygenSaturation: string;
    bodyMassIndex: string;
    emergencyContactGivenName: string;
    emergencyContactFamilyName: string;
    emergencyContactRelationship: string;
    emergencyContactPhone: string;
    emergencyContactEmail: string;
};
interface Insurance {
    providerName: string;
    policyNumber: string;
    planName: string;
    memberID: string;
    groupNumber: string;
    startDate: string;
    endDate: string;
    payerId: string;
    guarantor: string;
    memberName: string;
    relationToSubscriber: string;
    subscriberName: string;
    subscriberId: string;
    subscriberDob: string;
    billingAddress: string;
};
interface Allergy {
    allergyName: string;
    allergyType: string;
    /** Shown when `allergyType` is `Other`; saved as `Other (…)` in the API type line. */
    allergyTypeOther: string;
    severity: string;
    reactionNotes: string;
    lastObserved: string;
    allergenId: string;
    category: string;
    criticality: string;
    code: string;
    codeSystem: string;
    recordedBy: string;
    organization: string;
    recordedTime: string;
};
interface Medication {
    genericName: string;
    brandName: string;
    dosage: string;
    route: string;
    frequency: string;
    startDate: string;
    endDate: string;
    purpose: string;
    prescribingPhysician: string;
    notesMedication: string;
    sig: string;
    status: string;
    authoredOn: string;
    fillQuantity: string;
    recordedBy: string;
    organization: string;
    recordedTime: string;
};
interface HospitalVisit {
    facilityName: string;
    visitType: string;
    reason: string;
    visitDate: string;
    dischargeDate: string;
    attendingPhysician: string;
    reportId: string;
    /** Athena Past Encounters columns (optional — older saved rows lack them). */
    encounterId?: string;
    startDateTime?: string;
    closedDateTime?: string;
    location?: string;
    snomed?: string;
    icd10?: string;
    imo?: string;
    diagnosisNote?: string;
};
interface ChronicCondition {
    conditionName: string;
    icdCode: string;
    diagnosisDate: string;
    severity: string;
    prexisting: string;
    notesChronicConditions: string;
    status?: string;
};

// initializing 
const defaultPatientInfo: PatientInfo = { 
    givenName: '',
    familyName: '',
    patientFullName: '',
    formerAliases: '',
    dateOfBirth: '',
    bloodType: '', 
    email: '',
    additionalEmails: [],
    phoneNumber: '',
    homePhone: '',
    communication: '',
    address: '',
    race: '',
    ethnicity: '',
    preferredLanguage: '',
    maritalStatus: '',
    sexAtBirth:'',
    legalSex: '',
    genderIdentity: '',
    sexualOrientation: '',
    sexAtBirthRecordedOn: '',
    otherNotes: '',
    heightInches: '',
    weightLbs: '',
    systolicBp: '',
    diastolicBp: '',
    heartRate: '',
    temperatureF: '',
    temperatureC: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    bodyMassIndex: '',
    emergencyContactGivenName: '',
    emergencyContactFamilyName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
    emergencyContactEmail: '',
};
const defaultInsurance: Insurance = emptyInsuranceRow();
const defaultAllergy: Allergy = {
    allergyName: '',
    allergyType: '',
    allergyTypeOther: '',
    severity: '',
    reactionNotes: '',
    lastObserved: '',
    allergenId: '',
    category: '',
    criticality: '',
    code: '',
    codeSystem: '',
    recordedBy: '',
    organization: '',
    recordedTime: '',
};

function mapStoredAllergies(raw: unknown): Allergy[] {
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
        return [defaultAllergy];
    }
    return raw.map((row: unknown) => {
        const r = row as Partial<Allergy>;
        return {
            ...defaultAllergy,
            ...r,
            allergyTypeOther:
                typeof r.allergyTypeOther === 'string' ? r.allergyTypeOther : '',
        };
    });
}
const defaultMedication: Medication = {
    genericName: '',
    brandName: '',
    dosage: '',
    route: '',
    frequency: '',
    startDate: '',
    endDate: '',
    purpose: '',
    prescribingPhysician: '',
    notesMedication: '',
    sig: '',
    status: '',
    authoredOn: '',
    fillQuantity: '',
    recordedBy: '',
    organization: '',
    recordedTime: '',
};
const defaultHospitalVisit: HospitalVisit = {
    facilityName: '',
    visitType: '',
    reason: '',
    visitDate: '',
    dischargeDate: '',
    attendingPhysician: '',
    reportId: '',
    encounterId: '',
    startDateTime: '',
    closedDateTime: '',
    location: '',
    snomed: '',
    icd10: '',
    imo: '',
    diagnosisNote: '',
};

function mapStoredHospitalVisits(raw: unknown): HospitalVisit[] {
    if (!raw) return [defaultHospitalVisit];
    if (Array.isArray(raw)) {
        if (raw.length === 0) return [defaultHospitalVisit];
        return raw.map((row: unknown) => ({
            ...defaultHospitalVisit,
            ...(row as Partial<HospitalVisit>),
        }));
    }
    if (typeof raw === 'object') {
        const row = raw as Partial<HospitalVisit>;
        if (Object.values(row).some((v) => String(v ?? '').trim())) {
            return [{ ...defaultHospitalVisit, ...row }];
        }
    }
    return [defaultHospitalVisit];
}
const defaultChronicCondition: ChronicCondition = {
    conditionName: '', 
    icdCode: '', 
    diagnosisDate: '', 
    severity: '', 
    prexisting: '',
    notesChronicConditions: '', 
    status: '',
};

/** Demo / QA: fills every Tab14 field without overwriting empty defaults used by Clear. */
const samplePatientInfo: PatientInfo = {
    givenName: 'Jordan',
    familyName: 'Rivera',
    patientFullName: 'Jordan Rivera',
    formerAliases: '',
    dateOfBirth: '1990-03-15',
    bloodType: 'O+',
    email: 'jordan.rivera@example.com',
    additionalEmails: ['jordan.alt@example.com'],
    phoneNumber: '555-201-8844',
    homePhone: '',
    communication: '555-201-8844 (Mobile)\njordan.rivera@example.com',
    address: '1200 Market St, San Francisco, CA 94103',
    race: 'Asian',
    ethnicity: 'Not Hispanic or Latino',
    preferredLanguage: 'English',
    maritalStatus: 'Married',
    sexAtBirth: 'Female',
    legalSex: 'Female',
    genderIdentity: 'Woman',
    sexualOrientation: 'Straight',
    sexAtBirthRecordedOn: '2020-01-15',
    otherNotes: 'Prefers afternoon appointments.',
    heightInches: '65',
    weightLbs: '148',
    systolicBp: '118',
    diastolicBp: '76',
    heartRate: '72',
    temperatureF: '98.6',
    temperatureC: '37.0',
    respiratoryRate: '16',
    oxygenSaturation: '98',
    bodyMassIndex: '24.6',
    emergencyContactGivenName: 'Alex',
    emergencyContactFamilyName: 'Rivera',
    emergencyContactRelationship: 'Spouse, Emergency Contact',
    emergencyContactPhone: '555-201-9900',
    emergencyContactEmail: 'alex.rivera.ec@example.com',
};

const sampleInsurance: Insurance = {
    ...emptyInsuranceRow(),
    providerName: 'Blue Cross Blue Shield',
    policyNumber: 'POL-778821',
    planName: 'PPO Select Gold',
    memberID: 'MEM-009921',
    groupNumber: 'GRP-4400',
    startDate: '2024-01-01',
    endDate: '2025-12-31',
    payerId: 'BCBS-001',
    memberName: 'Jordan Rivera',
    relationToSubscriber: 'Self',
    subscriberName: 'Jordan Rivera',
    subscriberId: 'SUB-009921',
};

const sampleAllergy: Allergy = {
    ...defaultAllergy,
    allergyName: 'Penicillin',
    allergyType: 'Drug',
    allergyTypeOther: '',
    severity: 'High',
    reactionNotes: 'Hives, localized swelling, and shortness of breath within 30 minutes.',
    lastObserved: '2022-06-10',
};

const sampleMedication: Medication = {
    ...defaultMedication,
    genericName: 'Metformin',
    brandName: 'Glucophage',
    dosage: '500 mg',
    route: 'Oral',
    frequency: 'Twice daily with meals',
    startDate: '2023-11-01',
    endDate: '',
    purpose: 'Type 2 diabetes management',
    prescribingPhysician: 'Dr. A. Patel',
    notesMedication: 'Take with food. Report persistent GI upset.',
};

const sampleChronicCondition: ChronicCondition = {
    conditionName: 'Type 2 Diabetes Mellitus',
    icdCode: 'E11.9',
    diagnosisDate: '2018-05-10',
    severity: 'Moderate',
    prexisting: 'Yes',
    notesChronicConditions: 'Diet and exercise counseling; A1c checked every 6 months.',
};

const sampleHospitalVisit: HospitalVisit = {
    facilityName: 'St. Jude Medical Center',
    visitType: 'Recent admission',
    reason: 'Routine cardiac stress test and follow-up',
    visitDate: '2024-09-15',
    dischargeDate: '2024-09-17',
    attendingPhysician: 'Dr. L. Sharma',
    reportId: 'HPT-49202',
};

const TAB14_SECTIONS_DEFAULT = buildTab14SidebarNavForEhr(null);

function labResultRowToTab14Panel(row: LabResultRow): Tab14LabPanel {
    return {
        testName: row.testName,
        date: row.date,
        status: row.status,
        isNew: row.isNew,
        category: row.category || 'lab',
        displayCode: row.displayCode || undefined,
        notes: row.notes,
        clinicalIndication: row.clinicalIndication,
        impression: row.impression,
        accessionNumber: row.accessionNumber,
        modality: row.modality,
        signedBy: row.signedBy,
        components: row.results.map((c) => ({
            name: c.name,
            value: c.value,
            textValue: c.textValue,
            unit: c.unit,
            range: c.range,
            critical: c.critical,
            interpretation: c.interpretation,
        })),
    };
}

const TAB14_LAB_CATEGORIES: Tab14LabPanelCategory[] = [
    'lab',
    'imaging',
    'vitals',
    'clinical',
    'social',
    'contact',
];

function emptyLabComponent(): LabResultLineItem {
    return {
        name: '',
        unit: '',
        range: '',
        critical: false,
    };
}

function createEmptyLabPanel(): LabResultRow {
    return {
        id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        testName: '',
        date: '',
        status: 'Final',
        isNew: true,
        category: 'lab',
        results: [emptyLabComponent()],
    };
}

function labPanelToWriteBody(
    patientId: string,
    row: LabResultRow
): PatientLabPanelWriteBody {
    return {
        patient: patientId,
        display_code: row.displayCode?.trim() || null,
        test_name: row.testName.trim(),
        collected_on: row.date || new Date().toISOString().slice(0, 10),
        status: row.status || 'Final',
        is_new: row.isNew,
        category: row.category || 'lab',
        notes: row.notes?.trim() || null,
        clinical_indication: row.clinicalIndication?.trim() || null,
        impression: row.impression?.trim() || null,
        accession_number: row.accessionNumber?.trim() || null,
        modality: row.modality?.trim() || null,
        signed_by: row.signedBy?.trim() || null,
        components: row.results
            .map((c) => ({
                name: c.name.trim(),
                value: c.value,
                textValue: c.textValue?.trim() || undefined,
                unit: c.unit || '',
                range: c.range || '',
                critical: !!c.critical,
                interpretation: c.interpretation?.trim() || undefined,
            }))
            .filter((c) => c.name && (c.value != null || c.textValue)),
    };
}

function isInsuranceRowEmpty(row: Insurance): boolean {
    return !Object.values(row).some((v) => String(v ?? '').trim());
}

function isInsuranceAccordionOpen(
    openMap: Record<number, boolean>,
    index: number
) {
    if (index in openMap) return openMap[index];
    return index === 0;
}

function summarizeTab14ParseResult(b: ReturnType<typeof parseTab14IntakeDocument>): string {
    const chips: string[] = [];
    const demoHits = b.epicSectionOccurrenceCounts?.['Patient Demographics'];
    if (demoHits && demoHits > 0) {
        chips.push(`Patient Demographics × ${demoHits}`);
    } else if (Object.keys(b.patientFields).length) {
        chips.push('Patient info');
    }
    if (b.noKnownDrugAllergies) chips.push('NKDA (no known drug allergies)');
    else if (b.allergies.length) chips.push(`Allergies (${b.allergies.length})`);
    if (b.medications.length) chips.push(`Medications (${b.medications.length})`);
    if (b.insurances.length) chips.push('Insurance');
    if (b.noKnownProblems) chips.push('No Known Problems');
    else if (b.chronicConditions.length) chips.push(`Chronic (${b.chronicConditions.length})`);
    if (b.hospitalVisits?.length) chips.push(`Encounters (${b.hospitalVisits.length})`);
    else if (Object.keys(b.hospitalVisit).length) chips.push('Hospital visit');
    if (b.labPanels.length) chips.push(`Lab Results (${b.labPanels.length})`);
    if (!chips.length) {
        return 'No labeled fields matched. Use a text-based PDF or a clear photo; scanned PDFs may take longer (first page OCR).';
    }
    return `Imported: ${chips.join(' · ')} — open each sidebar section to verify, then Save.`;
}

/**
 * Common + clinically recognizable allergy severity options.
 * - Mild/Moderate/Severe are broadly used in clinical charting.
 * - Anaphylaxis captures life-threatening systemic reactions.
 */
const ALLERGY_SEVERITY_OPTIONS = [
    { value: '', label: 'Select severity' },
    { value: 'Mild', label: 'Mild (localized symptoms)' },
    { value: 'Moderate', label: 'Moderate (multi-system, stable)' },
    { value: 'Severe', label: 'Severe (significant systemic symptoms)' },
    { value: 'Anaphylaxis', label: 'Anaphylaxis (life-threatening)' },
    { value: 'Unknown', label: 'Unknown / not documented' },
] as const;


type Tab14RepeaterSection =
    | 'allergy'
    | 'medication'
    | 'chronic'
    | 'hospitalVisit'
    | 'labResult';

function repeaterAccordionKey(section: Tab14RepeaterSection, index: number) {
    return `${section}:${index}`;
}

function isRepeaterAccordionOpen(
    openMap: Record<string, boolean>,
    section: Tab14RepeaterSection,
    index: number
) {
    const key = repeaterAccordionKey(section, index);
    if (key in openMap) return openMap[key];
    return index === 0;
}

const REPEATER_SECTION_LABELS: Record<Tab14RepeaterSection, string> = {
    allergy: 'Allergies',
    medication: 'Medications',
    chronic: 'Problems',
    hospitalVisit: 'Past Encounters',
    labResult: 'Results',
};

function repeaterRowTitle(section: Tab14RepeaterSection, index: number, detail?: string) {
    const label = detail?.trim() || REPEATER_SECTION_LABELS[section];
    return `${index + 1}# ${label}`;
}

/** Collapsed Results rows should show panel name, date, and component count — not generic "Results". */
function labResultAccordionTitle(panel: LabResultRow, index: number): string {
    const name = panel.testName.trim() || panel.displayCode?.trim() || 'Results';
    const parts = [name];
    if (panel.date.trim()) parts.push(panel.date.trim());
    if (panel.results.length > 0) {
        parts.push(
            `${panel.results.length} component${panel.results.length === 1 ? '' : 's'}`
        );
    }
    return repeaterRowTitle('labResult', index, parts.join(' · '));
}

function repeaterToggleKeyDown(onActivate: () => void) {
    return (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onActivate();
        }
    };
}

function Tab14RepeaterToolbar({
    onExpandAll,
    onCollapseAll,
}: {
    onExpandAll: () => void;
    onCollapseAll: () => void;
}) {
    return (
        <div className="tab14-repeater-toolbar">
            <div
                role="button"
                tabIndex={0}
                className="tab14-repeater-toolbar__action"
                onClick={onExpandAll}
                onKeyDown={repeaterToggleKeyDown(onExpandAll)}
            >
                Expand all
            </div>
            <div
                role="button"
                tabIndex={0}
                className="tab14-repeater-toolbar__action"
                onClick={onCollapseAll}
                onKeyDown={repeaterToggleKeyDown(onCollapseAll)}
            >
                Collapse all
            </div>
        </div>
    );
}

function Tab14RepeaterAccordion({
    sectionKey,
    index,
    title,
    isOpen,
    onToggle,
    headerWarning,
    children,
}: {
    sectionKey: Tab14RepeaterSection;
    index: number;
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    headerWarning?: string | null;
    children: React.ReactNode;
}) {
    const panelId = `tab14-accordion-${sectionKey}-${index}`;
    return (
        <div className="tab14-repeater-accordion section-block">
            <div
                role="button"
                tabIndex={0}
                className={`accordion-header tab14-repeater-accordion__header${
                    isOpen ? ' tab14-repeater-accordion__header--open' : ''
                }`}
                onClick={onToggle}
                onKeyDown={repeaterToggleKeyDown(onToggle)}
                aria-expanded={isOpen}
                aria-controls={panelId}
            >
                <span className="tab14-repeater-accordion__title-wrap">
                    <span className="tab14-repeater-accordion__title">{title}</span>
                    {headerWarning ? (
                        <span
                            className="tab14-pdf-field-warning tab14-pdf-field-warning--accordion"
                            title={headerWarning}
                            aria-label={headerWarning}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                        >
                            <IonIcon icon={warningOutline} aria-hidden />
                        </span>
                    ) : null}
                </span>
                <span className="tab14-repeater-accordion__chevron" aria-hidden="true">
                    {isOpen ? '▾' : '▸'}
                </span>
            </div>
            {isOpen ? (
                <div id={panelId} className="accordion-content tab14-repeater-accordion__content">
                    {children}
                </div>
            ) : null}
        </div>
    );
}

type UploadedFileMeta = {
    name: string;
    size: number;
    type: string;
};

type UploadedFileEntry = {
    id: string;
    file: File | UploadedFileMeta;
    previewUrl: string;
    uploadedAt: string;
    parseStatus?: string;
    documentId?: string;
};

const Tab14: React.FC = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const { username, authReady, isStaff, isSuperuser, hasRealmRole } = useAuth();
    const { goBack } = usePortalHistory();
    const hasEditorRealmRole = hasRealmRole(getMeditapRecordEditorRole());
    // Chart edits are admin/staff only; patients may upload documents for clinic review.
    const canEditPatientRecords = isStaff || isSuperuser || hasEditorRealmRole;

    const goBackFallback = chartPageGoBackFallback();

    // useStates // 

    //file handling 
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFileEntry[]>([]); 
    /** EHR export family selected before upload — guides specialized parsers. */
    const [ehrDocumentType, setEhrDocumentType] = useState<EhrDocumentTypeId | null>(null);
    /** Epic multi-hit section counts from the last upload (e.g. Patient Demographics × 33). */
    const [epicSectionOccurrenceCounts, setEpicSectionOccurrenceCounts] = useState<
        Partial<Record<string, number>>
    >({});
    /** Every Patient Demographics hit (Epic) — one accordion row per PDF-Find result. */
    const [epicDemographicsOccurrences, setEpicDemographicsOccurrences] = useState<
        import('../intake/epicPatientDemographics').EpicDemographicsOccurrence[]
    >([]);
    const [epicDemographicsOpen, setEpicDemographicsOpen] = useState<Record<number, boolean>>({
        0: true,
    });
    const [epicNoteFromClinicOccurrences, setEpicNoteFromClinicOccurrences] = useState<
        import('../intake/epicNoteFromClinic').EpicNoteFromClinicOccurrence[]
    >([]);
    const [epicNoteFromClinicOpen, setEpicNoteFromClinicOpen] = useState<Record<number, boolean>>({
        0: true,
    });
    /** Shared multi-hit inventories for remaining Epic sidebar sections. */
    const [epicSectionOccurrencesByKey, setEpicSectionOccurrencesByKey] = useState<
        Partial<
            Record<
                import('../intake/tab14PortabilitySections').Tab14SectionKey,
                import('../intake/epicSectionOccurrences').EpicSectionOccurrence[]
            >
        >
    >({});
    const [epicSectionOpenMaps, setEpicSectionOpenMaps] = useState<
        Record<string, Record<number, boolean>>
    >({});
    /** Left menu follows the selected document source (per-vendor lists come later). */
    const tab14Sections = useMemo(
        () => buildTab14SidebarNavForEhr(ehrDocumentType),
        [ehrDocumentType]
    );
    // error handling 
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [activeSection, setActiveSection] = useState(0);

    useEffect(() => {
        const section = new URLSearchParams(location.search).get('section');
        if (section === 'vitals') {
            const vitals = tab14Sections.find((s) => s.key === 'vitals');
            setActiveSection(vitals?.id ?? TAB14_SECTIONS_DEFAULT.find((s) => s.key === 'vitals')?.id ?? 6);
        }
    }, [location.search, tab14Sections]);

    useEffect(() => {
        if (!tab14Sections.some((s) => s.id === activeSection)) {
            setActiveSection(tab14Sections[0]?.id ?? 0);
        }
    }, [tab14Sections, activeSection]);

    // message handling 
    const [saveMessage, setSaveMessage] = useState(false); 
    const [saveErrorMessage, setSaveErrorMessage] = useState(false); 
    const [backendError, setBackendError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    // no-known handling 
    const [noAllergies, setNoAllergies] = useState(false);
    const [noMedications, setNoMedications] = useState(false);
    const [noChronicConditions, setNoChronicConditions] = useState(false);
    const [repeaterAccordionOpen, setRepeaterAccordionOpen] = useState<Record<string, boolean>>({});
    const [uploadParseMessage, setUploadParseMessage] = useState<string | null>(null);
    const [uploadParsing, setUploadParsing] = useState(false);
    /** Session-only verify hints for PDF/OCR-populated patient fields. */
    const [pdfFieldWarnings, setPdfFieldWarnings] = useState<Tab14PatientFieldWarnings | undefined>(
        undefined
    );
    const [pdfFieldReview, setPdfFieldReview] = useState<FieldReviewState>({});
    const [pdfIndexedReview, setPdfIndexedReview] = useState<IndexedFieldReviewState>(
        {}
    );
    const [intakeCompletenessNotice, setIntakeCompletenessNotice] = useState<string | null>(
        null
    );
    const [athenaPortabilityScore, setAthenaPortabilityScore] =
        useState<AthenaPortabilityCompletenessResult | null>(null);
    const [pdfChronicWarnings, setPdfChronicWarnings] =
        useState<Tab14ChronicConditionWarnings | undefined>(undefined);
    const [pdfInsuranceWarnings, setPdfInsuranceWarnings] =
        useState<Tab14InsuranceRowWarnings | undefined>(undefined);
    const [pdfAllergyWarnings, setPdfAllergyWarnings] =
        useState<Tab14AllergyRowWarnings | undefined>(undefined);
    const [pdfMedicationWarnings, setPdfMedicationWarnings] =
        useState<Tab14MedicationRowWarnings | undefined>(undefined);
    const [pdfHospitalWarnings, setPdfHospitalWarnings] =
        useState<Tab14HospitalFieldWarnings | undefined>(undefined);
    const [loadingIntake, setLoadingIntake] = useState(true);
    const [clearFormHintVisible, setClearFormHintVisible] = useState(false);
    const [savedFormSnapshot, setSavedFormSnapshot] = useState('');
    const [showUnsavedLeavePrompt, setShowUnsavedLeavePrompt] = useState(false);
    const [pendingLeaveUrl, setPendingLeaveUrl] = useState<string | null>(null);
    const suppressUnsavedPromptRef = useRef(false);

    const [patientInfo, setPatientInfo] = useState<PatientInfo>(defaultPatientInfo);
    const [addAnotherEmail, setAddAnotherEmail] = useState(false);
    const [insurances, setInsurances] = useState<Insurance[]>([defaultInsurance]);
    const [addAnotherInsurance, setAddAnotherInsurance] = useState(false);
    const [expandedInsuranceIds, setExpandedInsuranceIds] = useState<Record<number, boolean>>({});
    const [allergies, setAllergies] = useState<Allergy[]>([defaultAllergy]);
    const [medications, setMedications] = useState<Medication[]>([defaultMedication]);
    const [chronicConditions, setChronicConditions] = useState<ChronicCondition[]>([
        defaultChronicCondition,
    ]);
    const [hospitalVisits, setHospitalVisits] = useState<HospitalVisit[]>([defaultHospitalVisit]);
    const [labPanels, setLabPanels] = useState<LabResultRow[]>([]);
    const [extendedSections, setExtendedSections] = useState<Tab14ExtendedSections>(() =>
        emptyExtendedSections()
    );
    /** Dated vitals from PDF (newest first); dropdown switches the displayed reading. */
    const [vitalsHistory, setVitalsHistory] = useState<Tab14VitalReading[]>([]);
    const [selectedVitalsIndex, setSelectedVitalsIndex] = useState(0);
    const [removedLabPanelServerIds, setRemovedLabPanelServerIds] = useState<string[]>([]);
    const [labSaveNotice, setLabSaveNotice] = useState<string | null>(null);

    const formSnapshot = useMemo(
        () =>
            JSON.stringify({
                patientInfo,
                insurances,
                allergies,
                medications,
                chronicConditions,
                hospitalVisits,
                labPanels,
                noAllergies,
                noMedications,
                noChronicConditions,
            }),
        [patientInfo, insurances, allergies, medications, chronicConditions, hospitalVisits, labPanels, noAllergies, noMedications, noChronicConditions]
    );

    const hasUnsavedChanges =
        !loadingIntake && savedFormSnapshot !== '' && formSnapshot !== savedFormSnapshot;

    const navigateAwayFromTab14 = (url: string) => {
        suppressUnsavedPromptRef.current = true;
        // Hard leave — same as shared portal Go back (Ionic soft push sticks).
        window.location.assign(url);
    };

    const leaveIntake = () => {
        if (hasUnsavedChanges && !suppressUnsavedPromptRef.current) {
            setPendingLeaveUrl('__portal_go_back__');
            setShowUnsavedLeavePrompt(true);
            return;
        }
        // Prefer previous page from portal stack; fallback to hub/dashboard.
        goBack(goBackFallback);
    };

    useEffect(() => {
        if (!loadingIntake && savedFormSnapshot === '') {
            setSavedFormSnapshot(formSnapshot);
        }
    }, [formSnapshot, loadingIntake, savedFormSnapshot]);

    useEffect(() => {
        const beforeUnload = (event: BeforeUnloadEvent) => {
            if (!hasUnsavedChanges || suppressUnsavedPromptRef.current) return;
            event.preventDefault();
            event.returnValue = '';
        };

        const clickGuard = (event: MouseEvent) => {
            if (!hasUnsavedChanges || suppressUnsavedPromptRef.current) return;
            if (!(event.target instanceof Element)) return;

            const target = event.target.closest('a[href], ion-item[router-link], ion-router-link[href]');
            if (!target) return;

            const rawUrl = target.getAttribute('href') || target.getAttribute('router-link');
            if (!rawUrl || rawUrl.startsWith('#') || rawUrl.startsWith('mailto:') || rawUrl.startsWith('tel:')) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            setPendingLeaveUrl(rawUrl);
            setShowUnsavedLeavePrompt(true);
        };

        window.addEventListener('beforeunload', beforeUnload);
        document.addEventListener('click', clickGuard, true);
        return () => {
            window.removeEventListener('beforeunload', beforeUnload);
            document.removeEventListener('click', clickGuard, true);
        };
    }, [hasUnsavedChanges]);

    const applyTab14Bundle = (bundle: Tab14LoadResult) => {
        if (!bundle.hasPatient) return;
        setPatientInfo({
            ...defaultPatientInfo,
            ...bundle.patient,
            additionalEmails: bundle.patient.additionalEmails ?? [],
        });
        setAddAnotherEmail((bundle.patient.additionalEmails ?? []).length > 0);
        const loadedInsurances =
            bundle.insurances.length > 0 ? bundle.insurances : [defaultInsurance];
        setInsurances(loadedInsurances);
        setAddAnotherInsurance(loadedInsurances.length > 1);
        setAllergies(
            bundle.allergies.length > 0
                ? bundle.allergies.map((row) => ({
                      ...defaultAllergy,
                      ...row,
                      allergyTypeOther: row.allergyTypeOther ?? '',
                  }))
                : [defaultAllergy]
        );
        setMedications(
            bundle.medications.length > 0
                ? bundle.medications.map((row) => ({ ...defaultMedication, ...row }))
                : [defaultMedication]
        );
        setChronicConditions(
            bundle.chronicConditions.length > 0
                ? bundle.chronicConditions
                : [defaultChronicCondition]
        );
        setHospitalVisits(mapStoredHospitalVisits(bundle.hospitalVisits));
        setNoAllergies(bundle.noAllergies);
        setNoMedications(bundle.medications.length === 0);
        const onlyNoKnownProblems =
            bundle.chronicConditions.length === 1 &&
            /no\s+known\s+problems/i.test(bundle.chronicConditions[0]?.conditionName ?? '');
        setNoChronicConditions(
            bundle.chronicConditions.length === 0 || onlyNoKnownProblems
        );
    };

    useEffect(() => {
        const first = String(patientInfo.givenName ?? '').trim();
        const last = String(patientInfo.familyName ?? '').trim();
        if (first && last) {
            markOnboardingStep(username, 'profile', true);
        }
    }, [patientInfo.givenName, patientInfo.familyName, username]);

    const applySnapshotToForm = (snapshot: Tab14MergeSnapshot) => {
        setNoAllergies(snapshot.noAllergies);
        setAllergies(
            snapshot.allergies.length > 0
                ? snapshot.allergies.map((row) => ({
                      ...defaultAllergy,
                      ...row,
                      allergyTypeOther: row.allergyTypeOther ?? "",
                  }))
                : [defaultAllergy]
        );
        setInsurances(
            snapshot.insurances.length > 0
                ? snapshot.insurances.map((row) => ({
                      ...defaultInsurance,
                      ...row,
                  }))
                : [defaultInsurance]
        );
        setNoMedications(snapshot.noMedications);
        setMedications(
            snapshot.medications.length > 0
                ? snapshot.medications.map((row) => ({
                      ...defaultMedication,
                      ...row,
                  }))
                : [defaultMedication]
        );
        setNoChronicConditions(snapshot.noChronicConditions);
        setChronicConditions(
            snapshot.chronicConditions.length > 0
                ? snapshot.chronicConditions.map((row) => ({
                      ...defaultChronicCondition,
                      ...row,
                  }))
                : snapshot.noChronicConditions
                  ? [
                        {
                            ...defaultChronicCondition,
                            conditionName: 'No Known Problems',
                            notesChronicConditions: 'No Known Problems',
                        },
                      ]
                  : [defaultChronicCondition]
        );
        setHospitalVisits(
            snapshot.hospitalVisits.length > 0
                ? snapshot.hospitalVisits.map((row) => ({
                      ...defaultHospitalVisit,
                      ...row,
                  }))
                : [defaultHospitalVisit]
        );
        setLabPanels(snapshot.labPanels.map(mapTab14LabPanelToRow));
        setRemovedLabPanelServerIds([]);
    };

    const buildMergeSnapshot = (): Tab14MergeSnapshot => ({
        allergies: allergies.map((row) => ({
            ...defaultAllergy,
            ...row,
            allergyTypeOther: row.allergyTypeOther ?? "",
        })),
        noAllergies,
        insurances: insurances.map((row) => ({ ...defaultInsurance, ...row })),
        medications: medications.map((row) => ({ ...defaultMedication, ...row })),
        noMedications,
        chronicConditions: chronicConditions.map((row) => ({
            ...defaultChronicCondition,
            ...row,
        })),
        noChronicConditions,
        hospitalVisits: hospitalVisits.map((row) => ({ ...defaultHospitalVisit, ...row })),
        labPanels: labPanels.map(labResultRowToTab14Panel),
    });

    const removeUploadedFile = (id: string) => {
        setUploadedFiles((prev) => {
            const entry = prev.find((row) => row.id === id);
            if (entry?.previewUrl) URL.revokeObjectURL(entry.previewUrl);
            return prev.filter((row) => row.id !== id);
        });
    };

    const clearAllPdfWarnings = () => {
        setPdfFieldWarnings(undefined);
        setPdfFieldReview({});
        setPdfIndexedReview({});
        setIntakeCompletenessNotice(null);
        setAthenaPortabilityScore(null);
        setPdfChronicWarnings(undefined);
        setPdfInsuranceWarnings(undefined);
        setPdfAllergyWarnings(undefined);
        setPdfMedicationWarnings(undefined);
        setPdfHospitalWarnings(undefined);
    };

    const clearUploadedFiles = () => {
        setUploadedFiles((prev) => {
            prev.forEach((entry) => {
                if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
            });
            return [];
        });
        setUploadParseMessage(null);
        clearAllPdfWarnings();
    };

    const openUploadedPreview = async (entry: UploadedFileEntry) => {
        try {
            if (entry.previewUrl) {
                window.open(entry.previewUrl, '_blank');
                return;
            }
            if (entry.documentId) {
                const url = await fetchPatientDocumentBlobUrl(entry.documentId);
                setUploadedFiles((prev) =>
                    prev.map((row) =>
                        row.id === entry.id ? { ...row, previewUrl: url } : row
                    )
                );
                window.open(url, '_blank');
            }
        } catch {
            setUploadParseMessage('Could not open document preview.');
        }
    };

    const uploadedFilesRef = useRef<UploadedFileEntry[]>([]);
    useEffect(() => {
        uploadedFilesRef.current = uploadedFiles;
    }, [uploadedFiles]);
    useEffect(() => {
        return () => {
            uploadedFilesRef.current.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
        };
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(e.target.files ?? []);
        if (!selected.length) return;

        if (!ehrDocumentType) {
            setUploadParseMessage(t('patientIntake.selectDocumentTypeFirst'));
            e.target.value = '';
            return;
        }

        if (selected.some((file) => !isTab14UploadFileType(file))) {
            setUploadParseMessage(t('patientIntake.uploadFileTypeError'));
            e.target.value = '';
            return;
        }

        // Patients and staff both parse uploads into the form. Manual typing stays staff-only
        // (locked fieldsets); patients Accept/Reject PDF warnings, then Save.
        setUploadParsing(true);
        setUploadParseMessage(null);

        let snapshot = buildMergeSnapshot();
        let patientFromUpload: Tab14PatientFields = {};
        let warningsFromUpload: Tab14PatientFieldWarnings | undefined;
        let anyHardToRead = false;
        const hardToReadByBundle: boolean[] = [];
        const parsedBundles: Tab14IntakeParseResult[] = [];
        const occurrenceCountsFromUpload: Partial<Record<string, number>> = {};
        let demographicsOccurrencesFromUpload: import('../intake/epicPatientDemographics').EpicDemographicsOccurrence[] =
            [];
        let noteFromClinicOccurrencesFromUpload: import('../intake/epicNoteFromClinic').EpicNoteFromClinicOccurrence[] =
            [];
        let sectionOccurrencesFromUpload: Partial<
            Record<
                import('../intake/tab14PortabilitySections').Tab14SectionKey,
                import('../intake/epicSectionOccurrences').EpicSectionOccurrence[]
            >
        > = {};
        const fileMessages: string[] = [];
        const newEntries: UploadedFileEntry[] = [];
        const extractedTexts: string[] = [];
        let vaultPatientId: string | null = null;
        const preferredVendor = ehrDocumentType;

        try {
            const chartPatient = await ensurePatientForCurrentSession(username);
            vaultPatientId = chartPatient?.patient_id ?? null;

            for (let index = 0; index < selected.length; index += 1) {
                const file = selected[index];
                setUploadParseMessage(
                    t('patientIntake.readingDocumentProgress', {
                        current: index + 1,
                        total: selected.length,
                        name: file.name,
                    })
                );

                const extracted = await extractTab14UploadFileText(file);
                extractedTexts.push(extracted.text);
                const hardToRead = extracted.hardToRead;
                if (hardToRead) anyHardToRead = true;
                hardToReadByBundle.push(hardToRead);
                const parsedBundle = parseTab14IntakeDocument(extracted.text, {
                    preferredVendor,
                });
                const bundle: Tab14IntakeParseResult = hardToRead
                    ? {
                          ...parsedBundle,
                          fieldWarnings: annotateOcrSparseWarnings(
                              parsedBundle.patientFields,
                              parsedBundle.fieldWarnings
                          ),
                      }
                    : parsedBundle;
                parsedBundles.push(bundle);
                for (const [title, count] of Object.entries(
                    bundle.epicSectionOccurrenceCounts ?? {}
                )) {
                    occurrenceCountsFromUpload[title] = Math.max(
                        occurrenceCountsFromUpload[title] ?? 0,
                        Number(count) || 0
                    );
                }
                if (
                    (bundle.epicDemographicsOccurrences?.length ?? 0) >
                    demographicsOccurrencesFromUpload.length
                ) {
                    demographicsOccurrencesFromUpload = bundle.epicDemographicsOccurrences ?? [];
                }
                if (
                    (bundle.epicNoteFromClinicOccurrences?.length ?? 0) >
                    noteFromClinicOccurrencesFromUpload.length
                ) {
                    noteFromClinicOccurrencesFromUpload =
                        bundle.epicNoteFromClinicOccurrences ?? [];
                }
                if (bundle.epicSectionOccurrencesByKey) {
                    for (const [key, list] of Object.entries(bundle.epicSectionOccurrencesByKey)) {
                        const k =
                            key as import('../intake/tab14PortabilitySections').Tab14SectionKey;
                        if ((list?.length ?? 0) > (sectionOccurrencesFromUpload[k]?.length ?? 0)) {
                            sectionOccurrencesFromUpload[k] = list;
                        }
                    }
                }
                const fieldsBefore = patientFromUpload;
                patientFromUpload = mergePdfPatientFields(
                    patientFromUpload,
                    bundle.patientFields
                );
                warningsFromUpload = mergePdfPatientFieldWarnings(
                    warningsFromUpload,
                    fieldsBefore,
                    bundle
                );

                let uploadMsg = summarizeTab14ParseResult(bundle);
                if (preferredVendor === 'nextgen') {
                    uploadMsg +=
                        ' · NextGen parser is not ready yet — used general extract. Add a fixture when you have a sample PDF.';
                } else if (preferredVendor === 'generic') {
                    uploadMsg += ' · Parser: generic / other (general extract)';
                } else if (preferredVendor && preferredVendor !== 'auto') {
                    uploadMsg += ` · Parser: ${preferredVendor}`;
                }
                if (hardToRead) {
                    uploadMsg +=
                        ' Document text looked sparse or hard to read — verify imported fields.';
                }
                fileMessages.push(uploadMsg);

                let documentId: string | undefined;
                if (vaultPatientId) {
                    try {
                        const doc = await uploadPatientDocument(vaultPatientId, file);
                        documentId = doc.document_id;
                        await updatePatientDocumentStatus(doc.document_id, {
                            parse_snapshot: {
                                patientFields: bundle.patientFields,
                                allergies: bundle.allergies,
                                medications: bundle.medications,
                                chronicConditions: bundle.chronicConditions,
                                insurances: bundle.insurances,
                                hospitalVisit: bundle.hospitalVisit,
                                labPanels: bundle.labPanels,
                                extendedSections: bundle.extendedSections,
                                vitalsHistory: bundle.vitalsHistory,
                                noKnownDrugAllergies: Boolean(bundle.noKnownDrugAllergies),
                                noKnownProblems: Boolean(bundle.noKnownProblems),
                                source: canEditPatientRecords
                                    ? 'tab14_staff_parse'
                                    : 'tab14_patient_parse',
                            },
                            parsed_given_name: bundle.patientFields.givenName || '',
                            parsed_family_name: bundle.patientFields.familyName || '',
                        });
                    } catch {
                        /* vault attach is best-effort */
                    }
                }

                newEntries.push({
                    id: documentId || `${Date.now()}-${index}-${file.name}`,
                    documentId,
                    file,
                    previewUrl: URL.createObjectURL(file),
                    uploadedAt: new Date().toLocaleString(),
                });
            }

            const replaceChartFromPdf = parsedBundles.some(bundleHasPatientIdentity);
            if (replaceChartFromPdf) {
                const empty = emptyMergeSnapshot();
                const prior = buildMergeSnapshot();
                snapshot = { ...empty, insurances: prior.insurances, labPanels: prior.labPanels };
            } else {
                snapshot = buildMergeSnapshot();
            }

            for (let i = 0; i < parsedBundles.length; i += 1) {
                const bundle = parsedBundles[i];
                const merged = applyTab14ParseBundle(snapshot, bundle);
                snapshot = merged.snapshot;
                const mergeNotes = formatTab14MergeStatsNotes(merged.stats);
                if (mergeNotes.length > 0) {
                    fileMessages[i] += ` ${mergeNotes.join('; ')}.`;
                }
            }

            applySnapshotToForm(snapshot);
            let nextExtended = replaceChartFromPdf
                ? emptyExtendedSections()
                : extendedSections;
            for (const bundle of parsedBundles) {
                if (bundle.extendedSections) {
                    nextExtended = mergeExtendedSections(nextExtended, bundle.extendedSections);
                }
            }
            setExtendedSections(nextExtended);
            const nextVitalsHistory = parsedBundles
                .map((b) => b.vitalsHistory ?? [])
                .reduce<Tab14VitalReading[]>(
                    (best, rows) => (rows.length > best.length ? rows : best),
                    []
                );
            if (nextVitalsHistory.length) {
                setVitalsHistory(nextVitalsHistory);
                setSelectedVitalsIndex(0);
            } else if (replaceChartFromPdf) {
                setVitalsHistory([]);
                setSelectedVitalsIndex(0);
            }
            if (Object.keys(patientFromUpload).length > 0) {
                setPatientInfo({
                    ...defaultPatientInfo,
                    ...patientFromUpload,
                    additionalEmails: patientFromUpload.additionalEmails ?? [],
                    patientFullName:
                        patientFromUpload.patientFullName ||
                        [patientFromUpload.givenName, patientFromUpload.familyName]
                            .filter(Boolean)
                            .join(' '),
                    formerAliases: patientFromUpload.formerAliases || '',
                    homePhone: patientFromUpload.homePhone || '',
                    communication:
                        patientFromUpload.communication ||
                        [
                            patientFromUpload.phoneNumber
                                ? `${patientFromUpload.phoneNumber} (Mobile)`
                                : '',
                            patientFromUpload.homePhone
                                ? `${patientFromUpload.homePhone} (Home)`
                                : '',
                            patientFromUpload.email || '',
                        ]
                            .filter(Boolean)
                            .join('\n'),
                });
                if ((patientFromUpload.additionalEmails ?? []).length > 0) {
                    setAddAnotherEmail(true);
                }
                setActiveSection(0);
            }
            if (demographicsOccurrencesFromUpload.length === 0) {
                const n = occurrenceCountsFromUpload['Patient Demographics'] ?? 0;
                if (n > 0 && Object.keys(patientFromUpload).length > 0) {
                    demographicsOccurrencesFromUpload = Array.from({ length: n }, (_, i) => ({
                        index: i,
                        ordinal: i + 1,
                        total: n,
                        label: `Patient Demographics · Date not on file`,
                        source: (i === 0 ? 'coverWindow' : 'inferredReprint') as
                            | 'coverWindow'
                            | 'inferredReprint',
                        intakeDateIso: '',
                        intakeDateLabel: 'Date not on file',
                        intakeDateKind: 'unknown' as const,
                        visitType: i === 0 ? 'Cover / summary of care' : 'Visit reprint',
                        fields: { ...patientFromUpload },
                    }));
                }
            }
            if (Object.keys(occurrenceCountsFromUpload).length > 0) {
                setEpicSectionOccurrenceCounts(occurrenceCountsFromUpload);
            }
            if (demographicsOccurrencesFromUpload.length > 0) {
                setEpicDemographicsOccurrences(demographicsOccurrencesFromUpload);
                setEpicDemographicsOpen({ 0: true });
                const primary = demographicsOccurrencesFromUpload[0]?.fields;
                if (primary) {
                    setPatientInfo((prev) => ({
                        ...prev,
                        address: prev.address || primary.address || '',
                        patientFullName:
                            prev.patientFullName ||
                            primary.patientFullName ||
                            [primary.givenName, primary.familyName].filter(Boolean).join(' '),
                        givenName: prev.givenName || primary.givenName || '',
                        familyName: prev.familyName || primary.familyName || '',
                        communication:
                            prev.communication ||
                            primary.communication ||
                            [
                                primary.phoneNumber ? `${primary.phoneNumber} (Mobile)` : '',
                                primary.homePhone ? `${primary.homePhone} (Home)` : '',
                                primary.email || '',
                            ]
                                .filter(Boolean)
                                .join('\n'),
                        phoneNumber: prev.phoneNumber || primary.phoneNumber || '',
                        homePhone: prev.homePhone || primary.homePhone || '',
                        email: prev.email || primary.email || '',
                        preferredLanguage:
                            prev.preferredLanguage || primary.preferredLanguage || '',
                        race: prev.race || primary.race || '',
                        ethnicity: prev.ethnicity || primary.ethnicity || '',
                        maritalStatus: prev.maritalStatus || primary.maritalStatus || '',
                    }));
                }
            }
            if (noteFromClinicOccurrencesFromUpload.length > 0) {
                setEpicNoteFromClinicOccurrences(noteFromClinicOccurrencesFromUpload);
                setEpicNoteFromClinicOpen({ 0: true });
                setExtendedSections((prev) => ({
                    ...prev,
                    patientInstructions: noteFromClinicOccurrencesFromUpload.map((occ) => ({
                        title: `Note from ${occ.fields.clinicName || 'Clinic'}`,
                        detail: occ.fields.body || '',
                        date: occ.intakeDateIso || '',
                        recordedBy: occ.fields.sharedWith
                            ? `Shared with ${occ.fields.sharedWith}`
                            : '',
                        place: occ.fields.clinicName || '',
                        time: '',
                        notes: occ.visitType || '',
                        noteType:
                            occ.intakeDateKind === 'generated'
                                ? 'Cover disclaimer'
                                : 'Visit reprint',
                        status: occ.source === 'inferredReprint' ? 'inferred' : 'parsed',
                    })),
                }));
            }
            if (Object.keys(sectionOccurrencesFromUpload).length > 0) {
                setEpicSectionOccurrencesByKey(sectionOccurrencesFromUpload);
                const openMaps: Record<string, Record<number, boolean>> = {};
                for (const key of Object.keys(sectionOccurrencesFromUpload)) {
                    openMaps[key] = { 0: true };
                }
                setEpicSectionOpenMaps(openMaps);
            }

            const combinedText = extractedTexts.join('\n\n');
            setPdfFieldWarnings(warningsFromUpload);
            setPdfFieldReview({});
            setPdfIndexedReview({});
            const identityHardToRead = parsedBundles.some(
                (bundle, i) => bundleHasPatientIdentity(bundle) && hardToReadByBundle[i]
            );
            const sectionHardToRead = identityHardToRead || anyHardToRead;
            const nextChronic = buildChronicConditionWarnings(
                snapshot.chronicConditions,
                sectionHardToRead,
                combinedText
            );
            const nextInsurance = buildInsuranceRowWarnings(
                snapshot.insurances,
                sectionHardToRead,
                combinedText
            );
            const nextAllergy = buildAllergyRowWarnings(
                snapshot.allergies,
                sectionHardToRead,
                combinedText
            );
            const nextMedication = buildMedicationRowWarnings(
                snapshot.medications,
                sectionHardToRead,
                combinedText
            );
            const lastHospital = snapshot.hospitalVisits[snapshot.hospitalVisits.length - 1] ?? {};
            const nextHospital = buildHospitalFieldWarnings(lastHospital, sectionHardToRead);
            setPdfChronicWarnings(nextChronic);
            setPdfInsuranceWarnings(nextInsurance);
            setPdfAllergyWarnings(nextAllergy);
            setPdfMedicationWarnings(nextMedication);
            setPdfHospitalWarnings(nextHospital);
            if (replaceChartFromPdf) {
                setNoAllergies(snapshot.noAllergies);
                setNoMedications(snapshot.noMedications);
                setNoChronicConditions(snapshot.noChronicConditions);
            }
            const entriesWithStatus = newEntries.map((entry, i) => ({
                ...entry,
                parseStatus: fileMessages[i] ?? '',
            }));
            setUploadedFiles((prev) => [...prev, ...entriesWithStatus]);

            const completenessPatient = {
                ...defaultPatientInfo,
                ...patientFromUpload,
                additionalEmails: patientFromUpload.additionalEmails ?? [],
            };
            const completeness = computeIntakeCompleteness({
                patient: completenessPatient,
                insurances: snapshot.insurances,
                allergies: snapshot.allergies,
                noAllergies: snapshot.noAllergies,
                medications: snapshot.medications,
                noMedications: snapshot.noMedications,
                chronicConditions: snapshot.chronicConditions,
                noChronicConditions: snapshot.noChronicConditions,
                hospitalVisits: snapshot.hospitalVisits,
            });
            const reviewGate = evaluatePatientFieldReviewGate(warningsFromUpload, {}, {
                allergies: nextAllergy,
                medications: nextMedication,
                chronic: nextChronic,
                insurances: nextInsurance,
                hospital: nextHospital,
                decisions: {},
            });
            const reviewNote =
                reviewGate.unresolvedCount > 0
                    ? ` Review ${reviewGate.unresolvedCount} flagged field(s) (Accept / Reject) before Save.`
                    : '';
            let notice = `${formatIntakeCompletenessSummary(completeness)}${reviewNote}`;
            // Athena / portability training signal — surfaces sidebar gaps core score hides
            const mergedForAthena: Tab14IntakeParseResult = {
                patientFields: completenessPatient,
                allergies: snapshot.allergies,
                medications: snapshot.medications,
                chronicConditions: snapshot.chronicConditions,
                insurances: snapshot.insurances,
                hospitalVisit: snapshot.hospitalVisits[0] ?? {},
                hospitalVisits: snapshot.hospitalVisits,
                labPanels: snapshot.labPanels,
                vitalsHistory: nextVitalsHistory.length ? nextVitalsHistory : undefined,
                extendedSections: nextExtended,
                noKnownDrugAllergies: snapshot.noAllergies,
                noKnownProblems: snapshot.noChronicConditions,
            };
            if (
                shouldScoreAthenaPortability(mergedForAthena) ||
                parsedBundles.some((b) => shouldScoreAthenaPortability(b))
            ) {
                const athenaScore = computeAthenaPortabilityCompleteness({
                    patientFields: completenessPatient,
                    allergies: snapshot.allergies,
                    noKnownDrugAllergies: snapshot.noAllergies,
                    medications: snapshot.medications,
                    chronicConditions: snapshot.chronicConditions,
                    noKnownProblems: snapshot.noChronicConditions,
                    insurances: snapshot.insurances,
                    labPanels: snapshot.labPanels,
                    vitalsHistory: nextVitalsHistory,
                    hospitalVisits: snapshot.hospitalVisits,
                    extendedSections: nextExtended,
                });
                setAthenaPortabilityScore(athenaScore);
                notice = `${notice} ${formatAthenaPortabilityCompletenessSummary(athenaScore)}`;
            } else {
                setAthenaPortabilityScore(null);
            }
            setIntakeCompletenessNotice(notice);
            setUploadParseMessage(null);

            markOnboardingStep(username, 'upload', true);
        } catch (err) {
            newEntries.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
            setUploadParseMessage(
                err instanceof Error ? `Could not read file: ${err.message}` : 'Could not read file.'
            );
        } finally {
            setUploadParsing(false);
            e.target.value = '';
        }
    };

    const handleSingleChange = 
    <T,>(field: keyof T, value: string, obj: T, setObj: React.Dispatch<React.SetStateAction<T>>) => {
        setObj({ ...obj, [field]: value });
        if (setObj === setPatientInfo) {
            setPdfFieldWarnings((prev) =>
                clearPatientFieldWarning(prev, field as Tab14PatientFieldKey)
            );
            // Keep the selected vitals-history row in sync when staff edit vitals fields
            const vitalsKeys = new Set([
                'heightInches',
                'weightLbs',
                'systolicBp',
                'diastolicBp',
                'heartRate',
                'temperatureF',
                'temperatureC',
                'respiratoryRate',
                'oxygenSaturation',
                'bodyMassIndex',
            ]);
            if (vitalsKeys.has(String(field)) && vitalsHistory.length > 0) {
                setVitalsHistory((prev) => {
                    if (!prev.length) return prev;
                    const idx = Math.min(selectedVitalsIndex, prev.length - 1);
                    const next = [...prev];
                    next[idx] = { ...next[idx], [field as string]: value };
                    return next;
                });
            }
        }
    };

    const formatVitalsHistoryLabel = (reading: Tab14VitalReading, index: number): string => {
        const raw = reading.recordedDate || '';
        let label = raw;
        if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
            const [y, m, d] = raw.slice(0, 10).split('-');
            label = `${m}/${d}/${y}`;
        }
        if (index === 0) label = `${label} (latest)`;
        if (reading.recordedBy) label = `${label} — ${reading.recordedBy}`;
        return label;
    };

    const selectVitalsReading = (index: number) => {
        if (!vitalsHistory.length) return;
        const idx = Math.max(0, Math.min(index, vitalsHistory.length - 1));
        const reading = vitalsHistory[idx];
        setSelectedVitalsIndex(idx);
        const fields = vitalReadingToPatientFields(reading);
        setPatientInfo((prev) => ({
            ...prev,
            heightInches: fields.heightInches ?? '',
            weightLbs: fields.weightLbs ?? '',
            systolicBp: fields.systolicBp ?? '',
            diastolicBp: fields.diastolicBp ?? '',
            heartRate: fields.heartRate ?? '',
            bodyMassIndex: fields.bodyMassIndex ?? '',
            temperatureF: fields.temperatureF ?? '',
            temperatureC: fields.temperatureC ?? '',
            respiratoryRate: fields.respiratoryRate ?? '',
            oxygenSaturation: fields.oxygenSaturation ?? '',
        }));
    };

    const handleChange = 
    <T,>(index: number, field: keyof T, value: string, array: T[], setArray: React.Dispatch<React.SetStateAction<T[]>>) => {
        const updated = [...array];
        updated[index] = { ...updated[index], [field]: value } as T;
        setArray(updated);
        if (setArray === setChronicConditions) {
            setPdfChronicWarnings((prev) =>
                clearChronicConditionWarning(
                    prev,
                    index,
                    field as Tab14ChronicFieldKey
                )
            );
        } else if (setArray === setInsurances) {
            setPdfInsuranceWarnings((prev) =>
                clearIndexedFieldWarning(prev, index, field as Tab14InsuranceFieldKey)
            );
        } else if (setArray === setAllergies) {
            setPdfAllergyWarnings((prev) =>
                clearIndexedFieldWarning(prev, index, field as Tab14AllergyFieldKey)
            );
        } else if (setArray === setMedications) {
            setPdfMedicationWarnings((prev) =>
                clearIndexedFieldWarning(prev, index, field as Tab14MedicationFieldKey)
            );
        } else if (setArray === setHospitalVisits) {
            setPdfHospitalWarnings((prev) => {
                if (!prev?.[field as Tab14HospitalFieldKey]) return prev;
                const next = { ...prev };
                delete next[field as Tab14HospitalFieldKey];
                return Object.keys(next).length ? next : undefined;
            });
        }
    };

    const handleAddSection = 
    <T,>(array: T[], setArray: React.Dispatch<React.SetStateAction<T[]>>, defaultObj: T) => {
        setArray([...array, defaultObj]);
    };
    const handleRemoveSection = 
    <T,>(index: number, array: T[], setArray: React.Dispatch<React.SetStateAction<T[]>>) => {
        const updated = [...array];
        updated.splice(index, 1);
        setArray(updated);
        if (setArray === setChronicConditions) {
            setPdfChronicWarnings((prev) => removeIndexedWarningRow(prev, index));
        } else if (setArray === setInsurances) {
            setPdfInsuranceWarnings((prev) => removeIndexedWarningRow(prev, index));
        } else if (setArray === setAllergies) {
            setPdfAllergyWarnings((prev) => removeIndexedWarningRow(prev, index));
        } else if (setArray === setMedications) {
            setPdfMedicationWarnings((prev) => removeIndexedWarningRow(prev, index));
        } else if (setArray === setHospitalVisits) {
            // Hospital warnings track the active visit fields, not every row index.
            if (updated.length === 0) setPdfHospitalWarnings(undefined);
        }
    };

    const toggleRepeaterAccordion = (section: Tab14RepeaterSection, index: number) => {
        setRepeaterAccordionOpen((prev) => {
            const key = repeaterAccordionKey(section, index);
            const nextOpen = !isRepeaterAccordionOpen(prev, section, index);
            return { ...prev, [key]: nextOpen };
        });
    };

    const setAllRepeaterAccordion = (
        section: Tab14RepeaterSection,
        count: number,
        open: boolean
    ) => {
        setRepeaterAccordionOpen((prev) => {
            const next = { ...prev };
            for (let i = 0; i < count; i += 1) {
                next[repeaterAccordionKey(section, i)] = open;
            }
            return next;
        });
    };

    const handleAddRepeaterSection = <T,>(
        section: Tab14RepeaterSection,
        array: T[],
        setArray: React.Dispatch<React.SetStateAction<T[]>>,
        defaultObj: T
    ) => {
        if (!canEditPatientRecords) return;
        const newIndex = array.length;
        setArray([...array, defaultObj]);
        setRepeaterAccordionOpen((prev) => ({
            ...prev,
            [repeaterAccordionKey(section, newIndex)]: true,
        }));
    };

    const handleRemoveRepeaterSection = <T,>(
        section: Tab14RepeaterSection,
        index: number,
        array: T[],
        setArray: React.Dispatch<React.SetStateAction<T[]>>
    ) => {
        if (!canEditPatientRecords) return;
        handleRemoveSection(index, array, setArray);
        setRepeaterAccordionOpen((prev) => {
            const next: Record<string, boolean> = {};
            for (const [key, value] of Object.entries(prev)) {
                if (!key.startsWith(`${section}:`)) next[key] = value;
            }
            const remaining = array.length - 1;
            if (remaining > 0) {
                next[repeaterAccordionKey(section, Math.min(index, remaining - 1))] = true;
            }
            return next;
        });
    };

    const updateLabPanelField = (index: number, patch: Partial<LabResultRow>) => {
        setLabPanels((prev) =>
            prev.map((panel, i) => (i === index ? { ...panel, ...patch } : panel))
        );
    };

    const updateLabComponentField = (
        panelIndex: number,
        componentIndex: number,
        patch: Partial<LabResultLineItem>
    ) => {
        setLabPanels((prev) =>
            prev.map((panel, i) => {
                if (i !== panelIndex) return panel;
                const results = panel.results.map((comp, j) =>
                    j === componentIndex ? { ...comp, ...patch } : comp
                );
                return { ...panel, results };
            })
        );
    };

    const addLabComponent = (panelIndex: number) => {
        setLabPanels((prev) =>
            prev.map((panel, i) =>
                i === panelIndex
                    ? { ...panel, results: [...panel.results, emptyLabComponent()] }
                    : panel
            )
        );
    };

    const removeLabComponent = (panelIndex: number, componentIndex: number) => {
        setLabPanels((prev) =>
            prev.map((panel, i) => {
                if (i !== panelIndex) return panel;
                const results = panel.results.filter((_, j) => j !== componentIndex);
                return {
                    ...panel,
                    results: results.length > 0 ? results : [emptyLabComponent()],
                };
            })
        );
    };

    const removeLabPanelAt = (index: number) => {
        const panel = labPanels[index];
        if (panel?.serverId) {
            setRemovedLabPanelServerIds((prev) =>
                prev.includes(panel.serverId!) ? prev : [...prev, panel.serverId!]
            );
        }
        handleRemoveRepeaterSection('labResult', index, labPanels, setLabPanels);
    };

    const addLabPanel = () => {
        handleAddRepeaterSection(
            'labResult',
            labPanels,
            setLabPanels,
            createEmptyLabPanel()
        );
    };


    // required field checks + format checking + others 
    const checkForm = () => {
        const newErrors: Record<string, string> = {};

        // required fields 
        if (!patientInfo.givenName.trim()) newErrors.givenName = "Given Name is required.";
        if (!patientInfo.familyName.trim()) newErrors.familyName = "Family Name is required.";
        // Epic Patient Demographics columns omit DOB (banner-only on the PDF); still require it for other EHRs.
        if (ehrDocumentType !== 'epic' && !patientInfo.dateOfBirth) {
            newErrors.dateOfBirth = "Date of Birth is required.";
        }

        // (not required) checks if email format is correct 
        if (patientInfo.email && !/\S+@\S+\.\S+/.test(patientInfo.email)) {
            newErrors.email = "A valid email format is required.";
        }
        patientInfo.additionalEmails.forEach((extraEmail, index) => {
            if (extraEmail.trim() && !/\S+@\S+\.\S+/.test(extraEmail.trim())) {
                newErrors[`additionalEmail-${index}`] = "A valid email format is required.";
            }
        });

        // dont let insurance dates start after they end 
        insurances.forEach((insurance, index) => {
            if (insurance.startDate && insurance.endDate) {
                const start = new Date(insurance.startDate);
                const end = new Date(insurance.endDate);
                if (start > end) {
                    newErrors[`insurance-${index}`] = "Start Date cannot be after End Date.";
                }
            }
        });

        // dont let medication dates start after they end 
        if (!noMedications) medications.forEach((med, index) => {
            if (med.startDate && med.endDate) {
                const start = new Date(med.startDate);
                const end = new Date(med.endDate);
                if (start > end) {
                    newErrors[`medication-${index}`] = "Start Date cannot be after End Date.";
                }
            }
        });
    
        setErrors(newErrors);
        // console.log("New Errors:", newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // save form
    // checks if form is valid (saves) or not (error message) 
    const saveForm = async (): Promise<boolean> => {
        const isValid = checkForm();

        if (!isValid) {
            setSaveErrorMessage(true);
            if (
                !patientInfo.givenName.trim() ||
                !patientInfo.familyName.trim() ||
                (ehrDocumentType !== 'epic' && !patientInfo.dateOfBirth)
            ) {
                setActiveSection(0);
            }
            return false;
        }

        setSaveErrorMessage(false);
        setBackendError(null);
        setLabSaveNotice(null);

        const reviewGate = evaluatePatientFieldReviewGate(
            pdfFieldWarnings,
            pdfFieldReview,
            {
                allergies: pdfAllergyWarnings,
                medications: pdfMedicationWarnings,
                chronic: pdfChronicWarnings,
                insurances: pdfInsuranceWarnings,
                hospital: pdfHospitalWarnings,
                decisions: pdfIndexedReview,
            }
        );
        if (!reviewGate.canSave) {
            setBackendError(
                `Resolve ${reviewGate.unresolvedCount} PDF-imported field warning(s) before Save (Accept to keep, Reject to clear).`
            );
            setActiveSection(0);
            return false;
        }

        setSaving(true);
        try {
            await saveTab14ToBackend({
                username,
                patient: patientInfo,
                insurances,
                allergies: noAllergies ? [] : allergies,
                medications: noMedications ? [] : medications,
                chronicConditions: noChronicConditions
                    ? [
                          {
                              ...defaultChronicCondition,
                              ...(chronicConditions[0] || {}),
                              conditionName:
                                  chronicConditions[0]?.conditionName?.trim() ||
                                  'No Known Problems',
                              notesChronicConditions:
                                  chronicConditions[0]?.notesChronicConditions?.trim() ||
                                  'No Known Problems',
                          },
                      ]
                    : chronicConditions,
                hospitalVisits,
                noAllergies,
                allowStaffOnlySections: canEditPatientRecords,
            });

            const draftLabPanels = labPanels.filter((row) => !row.serverId);
            const existingLabPanels = labPanels.filter((row) => row.serverId);
            let nextLabPanels = labPanels;
            if (
                canEditPatientRecords &&
                (draftLabPanels.length > 0 ||
                    existingLabPanels.length > 0 ||
                    removedLabPanelServerIds.length > 0)
            ) {
                try {
                    const { patientId } = await fetchPatientLabPanels(username);
                    if (patientId) {
                        for (const labPanelId of removedLabPanelServerIds) {
                            await deletePatientLabPanel(labPanelId);
                        }
                        for (const row of existingLabPanels) {
                            if (!row.testName.trim() || !row.serverId) continue;
                            await updatePatientLabPanel(
                                row.serverId,
                                labPanelToWriteBody(patientId, row)
                            );
                        }
                        for (const row of draftLabPanels) {
                            if (!row.testName.trim()) continue;
                            await createPatientLabPanel(
                                labPanelToWriteBody(patientId, row)
                            );
                        }
                        const { panels } = await fetchPatientLabPanels(username);
                        nextLabPanels = panels.map(mapPatientLabPanelToRow);
                        setLabPanels(nextLabPanels);
                        setRemovedLabPanelServerIds([]);
                    }
                } catch (labErr) {
                    const msg =
                        labErr instanceof Error ? labErr.message : 'Lab save failed.';
                    if (msg.includes('403')) {
                        setLabSaveNotice(
                            'Chart saved. Lab panel changes need a staff session in the admin portal to persist.'
                        );
                    } else {
                        setLabSaveNotice(
                            `Chart saved. Some lab results could not be saved: ${msg}`
                        );
                    }
                }
            }

            clearTab14DraftKeysOnly();
            const refreshed = await loadTab14FromBackend(username);
            if (refreshed.hasPatient) {
                applyTab14Bundle(refreshed);
            }
            const snapshotPatient = refreshed.hasPatient
                ? {
                      ...defaultPatientInfo,
                      ...refreshed.patient,
                      additionalEmails: refreshed.patient.additionalEmails ?? [],
                  }
                : patientInfo;
            const snapshotInsurances =
                refreshed.hasPatient && refreshed.insurances.length > 0
                    ? refreshed.insurances
                    : insurances;
            setSavedFormSnapshot(
                JSON.stringify({
                    patientInfo: snapshotPatient,
                    insurances: snapshotInsurances,
                    allergies: refreshed.hasPatient
                        ? refreshed.allergies.length > 0
                            ? refreshed.allergies.map((row) => ({
                                  ...defaultAllergy,
                                  ...row,
                                  allergyTypeOther: row.allergyTypeOther ?? '',
                              }))
                            : [defaultAllergy]
                        : allergies,
                    medications:
                        refreshed.hasPatient && refreshed.medications.length > 0
                            ? refreshed.medications
                            : medications,
                    chronicConditions:
                        refreshed.hasPatient && refreshed.chronicConditions.length > 0
                            ? refreshed.chronicConditions
                            : chronicConditions,
                    hospitalVisits: refreshed.hasPatient
                        ? mapStoredHospitalVisits(refreshed.hospitalVisits)
                        : hospitalVisits,
                    labPanels: nextLabPanels,
                    noAllergies: refreshed.hasPatient ? refreshed.noAllergies : noAllergies,
                    noMedications: refreshed.hasPatient
                        ? refreshed.medications.length === 0
                        : noMedications,
                    noChronicConditions: refreshed.hasPatient
                        ? refreshed.chronicConditions.length === 0 ||
                          (refreshed.chronicConditions.length === 1 &&
                              /no\s+known\s+problems/i.test(
                                  refreshed.chronicConditions[0]?.conditionName ?? ''
                              ))
                        : noChronicConditions,
                })
            );
            setSaveMessage(true);
            setTimeout(() => setSaveMessage(false), 2000);
            return true;
        } catch (e) {
            setBackendError(
                e instanceof Error ? e.message : 'Could not save to server.'
            );
            return false;
        } finally {
            setSaving(false);
        }
    };

    const saveAndLeavePage = async () => {
        if (!pendingLeaveUrl) return;
        const destination = pendingLeaveUrl;
        const saved = await saveForm();
        if (!saved) {
            setShowUnsavedLeavePrompt(false);
            return;
        }
        setShowUnsavedLeavePrompt(false);
        setPendingLeaveUrl(null);
        if (destination === '__portal_go_back__') {
            goBack(goBackFallback);
        } else {
            navigateAwayFromTab14(destination);
        }
    };

    const leaveWithoutSaving = () => {
        if (!pendingLeaveUrl) return;
        const destination = pendingLeaveUrl;
        setSavedFormSnapshot(formSnapshot);
        setShowUnsavedLeavePrompt(false);
        setPendingLeaveUrl(null);
        if (destination === '__portal_go_back__') {
            goBack(goBackFallback);
        } else {
            navigateAwayFromTab14(destination);
        }
    };

    // clear form 
    const clearForm = () => {
        if (!canEditPatientRecords) return;
        clearTab14DraftKeysOnly();
        setPatientInfo(defaultPatientInfo);
        setAddAnotherEmail(false);
        setInsurances([defaultInsurance]);
        setAddAnotherInsurance(false);
        setExpandedInsuranceIds({});
        setAllergies([defaultAllergy]);
        setMedications([defaultMedication]);
        setChronicConditions([defaultChronicCondition]);
        setHospitalVisits([defaultHospitalVisit]);
        setLabPanels([]);
        setExtendedSections(emptyExtendedSections());
        setVitalsHistory([]);
        setSelectedVitalsIndex(0);
        setRemovedLabPanelServerIds([]);
        setLabSaveNotice(null);
        setNoAllergies(false);
        setNoMedications(false);
        setNoChronicConditions(false);
        setPdfFieldWarnings(undefined);
        setPdfFieldReview({});
        setPdfIndexedReview({});
        setIntakeCompletenessNotice(null);
        setAthenaPortabilityScore(null);
        setPdfChronicWarnings(undefined);
        setPdfInsuranceWarnings(undefined);
        setPdfAllergyWarnings(undefined);
        setPdfMedicationWarnings(undefined);
        setPdfHospitalWarnings(undefined);
        setEpicDemographicsOccurrences([]);
        setEpicDemographicsOpen({ 0: true });
        setEpicNoteFromClinicOccurrences([]);
        setEpicNoteFromClinicOpen({ 0: true });
        setEpicSectionOccurrencesByKey({});
        setEpicSectionOpenMaps({});
        setEpicSectionOccurrenceCounts({});
    };

    const loadSampleData = () => {
        setPatientInfo({ ...samplePatientInfo });
        setAddAnotherEmail(samplePatientInfo.additionalEmails.length > 0);
        setInsurances([{ ...sampleInsurance }]);
        setAddAnotherInsurance(false);
        setExpandedInsuranceIds({});
        setAllergies([{ ...sampleAllergy }]);
        setMedications([{ ...sampleMedication }]);
        setChronicConditions([{ ...sampleChronicCondition }]);
        setHospitalVisits([{ ...sampleHospitalVisit }]);
        setNoAllergies(false);
        setNoMedications(false);
        setNoChronicConditions(false);
        setErrors({});
        setSaveErrorMessage(false);
        setBackendError(null);
        setPdfFieldWarnings(undefined);
        setPdfFieldReview({});
        setPdfIndexedReview({});
        setIntakeCompletenessNotice(null);
        setAthenaPortabilityScore(null);
        setPdfChronicWarnings(undefined);
        setPdfInsuranceWarnings(undefined);
        setPdfAllergyWarnings(undefined);
        setPdfMedicationWarnings(undefined);
        setPdfHospitalWarnings(undefined);
    };

    const renderPdfFieldWarningIcon = (field: Tab14PatientFieldKey) => {
        const warning = pdfFieldWarnings?.[field];
        if (!warning) return null;
        const provenance = [
            warning.sourceLabel,
            warning.sourcePage != null ? `page ${warning.sourcePage}` : null,
        ]
            .filter(Boolean)
            .join(' · ');
        const message =
            (warning.message || FIELD_WARNING_MESSAGES.VERIFY_GENERIC) +
            (provenance ? ` (${provenance})` : '');
        return (
            <span className="tab14-pdf-field-warning-wrap">
                <span
                    className="tab14-pdf-field-warning"
                    title={message}
                    aria-label={message}
                    role="img"
                >
                    <IonIcon icon={warningOutline} aria-hidden />
                </span>
                <button
                    type="button"
                    className="tab14-pdf-review-btn tab14-pdf-review-btn--accept"
                    onClick={() => {
                        const next = acceptPatientFieldWarning(
                            pdfFieldWarnings,
                            pdfFieldReview,
                            field
                        );
                        setPdfFieldWarnings(next.warnings);
                        setPdfFieldReview(next.decisions);
                    }}
                >
                    Accept
                </button>
                <button
                    type="button"
                    className="tab14-pdf-review-btn tab14-pdf-review-btn--reject"
                    onClick={() => {
                        const next = rejectPatientFieldWarning(
                            pdfFieldWarnings,
                            pdfFieldReview,
                            field
                        );
                        setPdfFieldWarnings(next.warnings);
                        setPdfFieldReview(next.decisions);
                        setPatientInfo((prev) => ({ ...prev, [field]: '' }));
                    }}
                >
                    Reject
                </button>
            </span>
        );
    };

    const renderIndexedWarningIcon = (
        warning: { message: string; sourcePage?: number; sourceLabel?: string } | undefined,
        onAccept?: () => void,
        onReject?: () => void
    ) => {
        if (!warning) return null;
        const provenance = [
            warning.sourceLabel,
            warning.sourcePage != null ? `page ${warning.sourcePage}` : null,
        ]
            .filter(Boolean)
            .join(' · ');
        const message =
            (warning.message || FIELD_WARNING_MESSAGES.VERIFY_GENERIC) +
            (provenance ? ` (${provenance})` : '');
        return (
            <span className="tab14-pdf-field-warning-wrap">
                <span
                    className="tab14-pdf-field-warning"
                    title={message}
                    aria-label={message}
                    role="img"
                >
                    <IonIcon icon={warningOutline} aria-hidden />
                </span>
                {onAccept ? (
                    <button
                        type="button"
                        className="tab14-pdf-review-btn tab14-pdf-review-btn--accept"
                        onClick={onAccept}
                    >
                        Accept
                    </button>
                ) : null}
                {onReject ? (
                    <button
                        type="button"
                        className="tab14-pdf-review-btn tab14-pdf-review-btn--reject"
                        onClick={onReject}
                    >
                        Reject
                    </button>
                ) : null}
            </span>
        );
    };

    const renderPdfChronicWarningIcon = (
        index: number,
        field: Tab14ChronicFieldKey
    ) =>
        renderIndexedWarningIcon(pdfChronicWarnings?.[index]?.[field], () => {
            const next = acceptIndexedFieldWarning(
                pdfChronicWarnings,
                pdfIndexedReview,
                index,
                field
            );
            setPdfChronicWarnings(next.warnings);
            setPdfIndexedReview(next.decisions);
        }, () => {
            const next = rejectIndexedFieldWarning(
                pdfChronicWarnings,
                pdfIndexedReview,
                index,
                field
            );
            setPdfChronicWarnings(next.warnings);
            setPdfIndexedReview(next.decisions);
            setChronicConditions((prev) => {
                const rows = [...prev];
                if (!rows[index]) return prev;
                rows[index] = { ...rows[index], [field]: '' };
                return rows;
            });
        });

    const renderPdfInsuranceWarningIcon = (
        index: number,
        field: Tab14InsuranceFieldKey
    ) =>
        renderIndexedWarningIcon(pdfInsuranceWarnings?.[index]?.[field], () => {
            const next = acceptIndexedFieldWarning(
                pdfInsuranceWarnings,
                pdfIndexedReview,
                index,
                field
            );
            setPdfInsuranceWarnings(next.warnings);
            setPdfIndexedReview(next.decisions);
        }, () => {
            const next = rejectIndexedFieldWarning(
                pdfInsuranceWarnings,
                pdfIndexedReview,
                index,
                field
            );
            setPdfInsuranceWarnings(next.warnings);
            setPdfIndexedReview(next.decisions);
            setInsurances((prev) => {
                const rows = [...prev];
                if (!rows[index]) return prev;
                rows[index] = { ...rows[index], [field]: '' };
                return rows;
            });
        });

    const renderPdfAllergyWarningIcon = (
        index: number,
        field: Tab14AllergyFieldKey
    ) =>
        renderIndexedWarningIcon(pdfAllergyWarnings?.[index]?.[field], () => {
            const next = acceptIndexedFieldWarning(
                pdfAllergyWarnings,
                pdfIndexedReview,
                index,
                field
            );
            setPdfAllergyWarnings(next.warnings);
            setPdfIndexedReview(next.decisions);
        }, () => {
            const next = rejectIndexedFieldWarning(
                pdfAllergyWarnings,
                pdfIndexedReview,
                index,
                field
            );
            setPdfAllergyWarnings(next.warnings);
            setPdfIndexedReview(next.decisions);
            setAllergies((prev) => {
                const rows = [...prev];
                if (!rows[index]) return prev;
                rows[index] = { ...rows[index], [field]: '' };
                return rows;
            });
        });

    const renderPdfMedicationWarningIcon = (
        index: number,
        field: Tab14MedicationFieldKey
    ) =>
        renderIndexedWarningIcon(pdfMedicationWarnings?.[index]?.[field], () => {
            const next = acceptIndexedFieldWarning(
                pdfMedicationWarnings,
                pdfIndexedReview,
                index,
                field
            );
            setPdfMedicationWarnings(next.warnings);
            setPdfIndexedReview(next.decisions);
        }, () => {
            const next = rejectIndexedFieldWarning(
                pdfMedicationWarnings,
                pdfIndexedReview,
                index,
                field
            );
            setPdfMedicationWarnings(next.warnings);
            setPdfIndexedReview(next.decisions);
            setMedications((prev) => {
                const rows = [...prev];
                if (!rows[index]) return prev;
                rows[index] = { ...rows[index], [field]: '' };
                return rows;
            });
        });

    const renderPdfHospitalWarningIcon = (field: Tab14HospitalFieldKey) =>
        renderIndexedWarningIcon(pdfHospitalWarnings?.[field], () => {
            const next = acceptHospitalFieldWarning(
                pdfHospitalWarnings,
                pdfIndexedReview,
                field
            );
            setPdfHospitalWarnings(next.warnings);
            setPdfIndexedReview(next.decisions);
        }, () => {
            const next = rejectHospitalFieldWarning(
                pdfHospitalWarnings,
                pdfIndexedReview,
                field
            );
            setPdfHospitalWarnings(next.warnings);
            setPdfIndexedReview(next.decisions);
            setHospitalVisits((prev) => {
                if (!prev.length) return prev;
                const rows = [...prev];
                const last = rows.length - 1;
                rows[last] = { ...rows[last], [field]: '' };
                return rows;
            });
        });

    useEffect(() => {
        if (!authReady) return;
        let cancelled = false;
        (async () => {
            setLoadingIntake(true);
            setBackendError(null);
            try {
                let bundle = await loadTab14FromBackend(username);
                if (cancelled) return;

                if (!bundle.hasPatient) {
                    const legacy = loadTab14LegacyFromLocalStorage();
                    if (legacy) {
                        try {
                            await saveTab14ToBackend({
                                ...tab14LegacyToSaveInput(username, legacy),
                                allowStaffOnlySections: canEditPatientRecords,
                            });
                            clearTab14DraftKeysOnly();
                            bundle = await loadTab14FromBackend(username);
                        } catch (e) {
                            setBackendError(
                                e instanceof Error
                                    ? e.message
                                    : 'Could not sync saved browser intake to your chart.'
                            );
                        }
                    }
                }

                if (cancelled) return;
                if (bundle.hasPatient) {
                    applyTab14Bundle(bundle);
                    try {
                        const { panels } = await fetchPatientLabPanels(username);
                        if (!cancelled && panels.length > 0) {
                            setLabPanels(panels.map(mapPatientLabPanelToRow));
                            setRemovedLabPanelServerIds([]);
                        }
                    } catch {
                        /* lab panels optional on load */
                    }
                    try {
                        const patient = await ensurePatientForCurrentSession(username);
                        if (patient && !cancelled) {
                            const docs = await listPatientDocuments(patient.patient_id);
                            if (!cancelled) {
                                setUploadedFiles(
                                    docs.map((doc) => ({
                                        id: doc.document_id,
                                        documentId: doc.document_id,
                                        file: {
                                            name: doc.original_filename,
                                            size: doc.size_bytes,
                                            type:
                                                doc.content_type ||
                                                'application/octet-stream',
                                        },
                                        previewUrl: '',
                                        uploadedAt: new Date(
                                            doc.created_at
                                        ).toLocaleString(),
                                        parseStatus:
                                            doc.status === 'pending_review'
                                                ? t(
                                                      'patientIntake.uploadReceivedPendingReview'
                                                  )
                                                : doc.status.replace(/_/g, ' '),
                                    }))
                                );
                            }
                        }
                    } catch {
                        /* vault list optional on load */
                    }
                }
            } catch (e) {
                if (!cancelled) {
                    setBackendError(
                        e instanceof Error
                            ? e.message
                            : 'Could not load your saved patient record.'
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoadingIntake(false);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [authReady, username, canEditPatientRecords]);

    const renderPatientVitalsFields = () => (
        <>
            {vitalsHistory.length > 0 && (
                <div className="form-field tab14-vitals-history-picker">
                    <label htmlFor="tab14-vitals-history-select">
                        {t('patientIntake.vitalsHistoryLabel')}
                    </label>
                    <select
                        id="tab14-vitals-history-select"
                        value={Math.min(selectedVitalsIndex, vitalsHistory.length - 1)}
                        onChange={(e) => selectVitalsReading(Number(e.target.value))}
                    >
                        {vitalsHistory.map((reading, index) => (
                            <option key={`${reading.recordedDate}-${index}`} value={index}>
                                {formatVitalsHistoryLabel(reading, index)}
                            </option>
                        ))}
                    </select>
                    <p className="tab14-panel-sub" style={{ marginTop: 6 }}>
                        {t('patientIntake.vitalsHistoryHint')}
                    </p>
                    {(vitalsHistory[selectedVitalsIndex]?.organization ||
                        vitalsHistory[selectedVitalsIndex]?.recordedTime ||
                        vitalsHistory[selectedVitalsIndex]?.bmiPercentile) && (
                        <p className="tab14-vitals-history-meta" role="status">
                            {[
                                vitalsHistory[selectedVitalsIndex]?.organization,
                                vitalsHistory[selectedVitalsIndex]?.recordedTime
                                    ? `Time ${vitalsHistory[selectedVitalsIndex]?.recordedTime}`
                                    : '',
                                vitalsHistory[selectedVitalsIndex]?.bmiPercentile
                                    ? `BMI percentile ${vitalsHistory[selectedVitalsIndex]?.bmiPercentile}%`
                                    : '',
                            ]
                                .filter(Boolean)
                                .join(' · ')}
                        </p>
                    )}
                </div>
            )}

            <div className="form-field">
                <label>Height (inches)</label>
                <input
                    type="number"
                    min={1}
                    max={96}
                    step={0.1}
                    inputMode="decimal"
                    placeholder={'e.g. 70 for 5\'10"'}
                    value={patientInfo.heightInches}
                    onChange={(e) =>
                        handleSingleChange(
                            'heightInches',
                            e.target.value,
                            patientInfo,
                            setPatientInfo
                        )
                    }
                />
            </div>

            <div className="form-field">
                <label>Weight (lb)</label>
                <input
                    type="number"
                    min={1}
                    max={999}
                    step={0.1}
                    inputMode="decimal"
                    placeholder="e.g. 180"
                    value={patientInfo.weightLbs}
                    onChange={(e) =>
                        handleSingleChange(
                            'weightLbs',
                            e.target.value,
                            patientInfo,
                            setPatientInfo
                        )
                    }
                />
            </div>

            <div className="form-field">
                <label>Blood pressure (systolic)</label>
                <input
                    type="number"
                    min={1}
                    max={300}
                    inputMode="numeric"
                    placeholder="e.g. 120"
                    value={patientInfo.systolicBp}
                    onChange={(e) =>
                        handleSingleChange(
                            'systolicBp',
                            e.target.value,
                            patientInfo,
                            setPatientInfo
                        )
                    }
                />
            </div>

            <div className="form-field">
                <label>Blood pressure (diastolic)</label>
                <input
                    type="number"
                    min={1}
                    max={200}
                    inputMode="numeric"
                    placeholder="e.g. 80"
                    value={patientInfo.diastolicBp}
                    onChange={(e) =>
                        handleSingleChange(
                            'diastolicBp',
                            e.target.value,
                            patientInfo,
                            setPatientInfo
                        )
                    }
                />
            </div>

            <div className="form-field">
                <label>Heart rate (bpm)</label>
                <input
                    type="number"
                    min={1}
                    max={250}
                    inputMode="numeric"
                    placeholder="e.g. 72"
                    value={patientInfo.heartRate}
                    onChange={(e) =>
                        handleSingleChange(
                            'heartRate',
                            e.target.value,
                            patientInfo,
                            setPatientInfo
                        )
                    }
                />
            </div>

            <div className="form-field">
                <label>Temperature (°F)</label>
                <input
                    type="number"
                    min={80}
                    max={110}
                    step={0.1}
                    inputMode="decimal"
                    placeholder="e.g. 97.3"
                    value={patientInfo.temperatureF}
                    onChange={(e) =>
                        handleSingleChange(
                            'temperatureF',
                            e.target.value,
                            patientInfo,
                            setPatientInfo
                        )
                    }
                />
            </div>

            <div className="form-field">
                <label>Temperature (°C)</label>
                <input
                    type="number"
                    min={30}
                    max={45}
                    step={0.1}
                    inputMode="decimal"
                    placeholder="e.g. 36.3"
                    value={patientInfo.temperatureC}
                    onChange={(e) =>
                        handleSingleChange(
                            'temperatureC',
                            e.target.value,
                            patientInfo,
                            setPatientInfo
                        )
                    }
                />
            </div>

            <div className="form-field">
                <label>Respiratory rate</label>
                <input
                    type="number"
                    min={1}
                    max={80}
                    inputMode="numeric"
                    placeholder="e.g. 16"
                    value={patientInfo.respiratoryRate}
                    onChange={(e) =>
                        handleSingleChange(
                            'respiratoryRate',
                            e.target.value,
                            patientInfo,
                            setPatientInfo
                        )
                    }
                />
            </div>

            <div className="form-field">
                <label>Oxygen saturation (%)</label>
                <input
                    type="number"
                    min={1}
                    max={100}
                    inputMode="numeric"
                    placeholder="e.g. 100"
                    value={patientInfo.oxygenSaturation}
                    onChange={(e) =>
                        handleSingleChange(
                            'oxygenSaturation',
                            e.target.value,
                            patientInfo,
                            setPatientInfo
                        )
                    }
                />
            </div>

            <div className="form-field">
                <label>Body mass index (BMI)</label>
                <input
                    type="number"
                    min={1}
                    max={100}
                    step={0.01}
                    inputMode="decimal"
                    placeholder="e.g. 21.93"
                    value={patientInfo.bodyMassIndex}
                    onChange={(e) =>
                        handleSingleChange(
                            'bodyMassIndex',
                            e.target.value,
                            patientInfo,
                            setPatientInfo
                        )
                    }
                />
            </div>

            {(() => {
                const hi = Number(patientInfo.heightInches);
                const wl = Number(patientInfo.weightLbs);
                const bmi = computeBmiFromMetric(
                    Number.isFinite(hi) && hi > 0 ? inchesToCm(hi) : null,
                    Number.isFinite(wl) && wl > 0 ? lbsToKg(wl) : null
                );
                if (bmi == null) return null;
                return (
                    <p className="tab14-vitals-bmi-preview" role="status">
                        Calculated BMI: <strong>{formatBmiDisplay(bmi)}</strong> (
                        {bmiCategoryLabel(bmi)})
                    </p>
                );
            })()}
        </>
    );

    const epicOpenMapFor = (sectionKey: string): Record<number, boolean> =>
        epicSectionOpenMaps[sectionKey] ?? { 0: true };

    const setEpicOpenMapFor =
        (sectionKey: string): React.Dispatch<React.SetStateAction<Record<number, boolean>>> =>
        (action) => {
            setEpicSectionOpenMaps((prev) => {
                const cur = prev[sectionKey] ?? { 0: true };
                const next = typeof action === 'function' ? action(cur) : action;
                return { ...prev, [sectionKey]: next };
            });
        };

    const renderEpicSectionMultiHit = (
        sectionKey: import('../intake/tab14PortabilitySections').Tab14SectionKey,
        sectionTitle: string
    ) => {
        if (ehrDocumentType !== 'epic') return null;
        const occs = epicSectionOccurrencesByKey[sectionKey];
        if (!occs?.length) return null;
        return (
            <EpicSectionOccurrencesPanel
                sectionTitle={sectionTitle}
                occurrences={occs}
                openMap={epicOpenMapFor(sectionKey)}
                setOpenMap={setEpicOpenMapFor(sectionKey)}
            />
        );
    };

    return (
        <IonPage className="ct-page ct-tab14">
            <IonContent>
                <div className="chronic-conditions-container tab14-add-patient">
                    <header className="chronic-conditions-header">
                        <h1>
                            <i className="fas fa-user-plus" aria-hidden /> {t('patientIntake.title')}
                        </h1>
                        <div className="tab14-header-actions">
                            {canEditPatientRecords ? (
                                <button
                                    type="button"
                                    className="tab14-sample-data-btn"
                                    onClick={loadSampleData}
                                >
                                    <i className="fas fa-flask" aria-hidden />
                                    {t('patientIntake.loadSample')}
                                </button>
                            ) : null}
                            <button
                                type="button"
                                className="book-btn"
                                onClick={leaveIntake}
                            >
                                <i className="fas fa-arrow-left" aria-hidden />
                                <span>{t('common.goBackToPrevious')}</span>
                            </button>
                        </div>
                    </header>

                    <main className="chronic-conditions-main tab14-master">
                        <div className="tab14-intake-toolbar">
                            <div className="tab14-ehr-type-panel tab14-ehr-type-panel--top" role="group" aria-labelledby="tab14-ehr-type-heading">
                                <div className="tab14-ehr-type-panel__header">
                                    <div className="tab14-ehr-type-panel__intro">
                                        <h3 id="tab14-ehr-type-heading" className="tab14-ehr-type-panel__title">
                                            {t('patientIntake.documentTypeTitle')}
                                        </h3>
                                        <p className="tab14-ehr-type-panel__sub">
                                            {t('patientIntake.documentTypeSub')}
                                        </p>
                                    </div>
                                    <div
                                        className={`tab14-active-format-badge${ehrDocumentType ? ' tab14-active-format-badge--active' : ''}`}
                                        role="status"
                                        aria-live="polite"
                                    >
                                        <span className="tab14-active-format-badge__eyebrow">
                                            {t('patientIntake.intakePanelEyebrow')}
                                        </span>
                                        <strong className="tab14-active-format-badge__title">
                                            {t(`patientIntake.intakePanelTitles.${ehrDocumentType ?? 'none'}`, {
                                                defaultValue: ehrIntakePanelTitle(ehrDocumentType),
                                            })}
                                        </strong>
                                    </div>
                                </div>
                                <div className="tab14-ehr-type-grid">
                                    {EHR_VENDOR_PANEL_OPTIONS.map((opt) => {
                                        const selected = ehrDocumentType === opt.id;
                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                className={`tab14-ehr-type-card${selected ? ' tab14-ehr-type-card--selected' : ''}${
                                                    opt.status === 'planned' ? ' tab14-ehr-type-card--planned' : ''
                                                }`}
                                                aria-pressed={selected}
                                                disabled={uploadParsing}
                                                onClick={() => setEhrDocumentType(opt.id)}
                                            >
                                                <span className="tab14-ehr-type-card__label">{opt.label}</span>
                                                <span
                                                    className={`tab14-ehr-type-card__badge tab14-ehr-type-card__badge--${opt.status}`}
                                                >
                                                    {t(`patientIntake.documentTypeStatus.${opt.status}`, {
                                                        defaultValue: ehrDocumentTypeStatusLabel(opt.status),
                                                    })}
                                                </span>
                                                <span className="tab14-ehr-type-card__hint">{opt.hint}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <label className="tab14-ehr-type-auto">
                                    <input
                                        type="radio"
                                        name="tab14-ehr-type"
                                        checked={ehrDocumentType === 'auto'}
                                        disabled={uploadParsing}
                                        onChange={() => setEhrDocumentType('auto')}
                                    />
                                    <span>{t('patientIntake.documentTypeAuto')}</span>
                                </label>
                            </div>

                            <aside
                                className="tab14-pdf-upload-panel"
                                aria-labelledby="tab14-pdf-upload-heading"
                            >
                                <h3 id="tab14-pdf-upload-heading" className="tab14-pdf-upload-panel__title">
                                    {t('patientIntake.pdfUploadPanelTitle')}
                                </h3>
                                <p className="tab14-pdf-upload-panel__sub">
                                    {t('patientIntake.pdfUploadPanelSub')}
                                </p>
                                <label
                                    className={`file-upload-label${!ehrDocumentType ? ' file-upload-label--disabled' : ''}`}
                                >
                                    {t('patientIntake.uploadFile')}
                                    <input
                                        type="file"
                                        multiple
                                        accept=".pdf,.jpeg,.jpg,.png,application/pdf,image/jpeg,image/png"
                                        onChange={handleFileUpload}
                                        disabled={uploadParsing || !ehrDocumentType}
                                    />
                                </label>
                                {!ehrDocumentType && !uploadParsing && (
                                    <p className="tab14-upload-parse tab14-upload-parse--muted">
                                        {t('patientIntake.selectDocumentTypeFirst')}
                                    </p>
                                )}
                                {uploadParsing && (
                                    <p className="tab14-upload-parse tab14-upload-parse--muted">
                                        {t('patientIntake.readingDocument')}
                                    </p>
                                )}
                                {!uploadParsing && uploadParseMessage && uploadedFiles.length === 0 && (
                                    <p className="tab14-upload-parse">{uploadParseMessage}</p>
                                )}
                                {uploadedFiles.length > 0 && (
                                    <div className="file-preview-list file-preview-list--compact">
                                        <div className="file-preview-row file-preview-row--head" aria-hidden="true">
                                            <span className="file-preview-cell file-preview-cell--name">Name</span>
                                            <span className="file-preview-cell file-preview-cell--status">Status</span>
                                            <span className="file-preview-cell file-preview-cell--actions">Actions</span>
                                        </div>
                                        {uploadedFiles.map((entry) => (
                                            <div className="file-preview-row" key={entry.id}>
                                                <span
                                                    className="file-preview-cell file-preview-cell--name"
                                                    title={entry.file.name}
                                                >
                                                    {entry.file.name}
                                                </span>
                                                <span className="file-preview-cell file-preview-cell--status">
                                                    {entry.parseStatus?.trim() || '-'}
                                                </span>
                                                <span className="file-preview-cell file-preview-cell--actions">
                                                    {entry.file.type === 'application/pdf' ||
                                                    entry.file.name.toLowerCase().endsWith('.pdf') ? (
                                                        <button
                                                            className="preview-button"
                                                            type="button"
                                                            onClick={() => void openUploadedPreview(entry)}
                                                        >
                                                            Preview
                                                        </button>
                                                    ) : (entry.file.type || '').startsWith('image/') ||
                                                      /\.(jpe?g|png)$/i.test(entry.file.name) ? (
                                                        <button
                                                            className="preview-button preview-button--image"
                                                            type="button"
                                                            onClick={() => void openUploadedPreview(entry)}
                                                        >
                                                            View
                                                        </button>
                                                    ) : entry.documentId ? (
                                                        <button
                                                            className="preview-button"
                                                            type="button"
                                                            onClick={() => void openUploadedPreview(entry)}
                                                        >
                                                            Open
                                                        </button>
                                                    ) : null}
                                                    <button
                                                        className="remove-file-button"
                                                        type="button"
                                                        onClick={() => removeUploadedFile(entry.id)}
                                                    >
                                                        Remove
                                                    </button>
                                                </span>
                                            </div>
                                        ))}
                                        <button
                                            className="remove-file-button remove-file-button--clear-all"
                                            type="button"
                                            onClick={clearUploadedFiles}
                                        >
                                            {t('patientIntake.clearUploadedFiles')}
                                        </button>
                                    </div>
                                )}
                            </aside>
                        </div>

                        <div className="tab14-layout">
                            <aside className="tab14-sidebar" aria-label={t('patientIntake.sectionsAria')}>
                                <nav className="tab14-nav">
                                    {tab14Sections.map((s) => {
                                        const label = ehrSidebarNavLabel(s, ehrDocumentType);
                                        return (
                                        <button
                                            key={s.key}
                                            type="button"
                                            className={`tab14-nav-item${activeSection === s.id ? ' active' : ''}`}
                                            onClick={() => setActiveSection(s.id)}
                                        >
                                            <i className={`fas ${s.icon}`} aria-hidden />
                                            <span>{label}</span>
                                        </button>
                                        );
                                    })}
                                </nav>
                            </aside>
                            <div className="tab14-main-panel">
                                {loadingIntake && (
                                    <p className="tab14-loading-hint" role="status">
                                        {t('patientIntake.loadingRecord')}
                                    </p>
                                )}
                                {!canEditPatientRecords && (
                                    <div className="tab14-view-only-banner" role="status">
                                        <p>{t('patientIntake.patientViewOnlyBanner')}</p>
                                    </div>
                                )}
                                <div className="tab14-panel-header">
                                    <h2>
                                        {(() => {
                                            const nav = tab14Sections.find((s) => s.id === activeSection);
                                            return nav
                                              ? ehrSidebarNavLabel(nav, ehrDocumentType)
                                              : t('patientIntake.sections.demographics');
                                        })()}
                                    </h2>
                                    <p className="tab14-panel-sub">
                                        {activeSection === 6
                                            ? t('patientIntake.vitalsPanelSub')
                                            : activeSection === 0
                                              ? ehrDocumentType === 'epic'
                                                ? (() => {
                                                      const n =
                                                          epicSectionOccurrenceCounts[
                                                              'Patient Demographics'
                                                          ];
                                                          return n && n > 0
                                                          ? `Epic columns only · registered × ${n}`
                                                          : 'Epic columns: Patient Address, Patient Name, Communication, Language, Race, Ethnicity, Marital Status';
                                                  })()
                                                : t('patientIntake.demographicsSub')
                                              : (() => {
                                                    const nav = tab14Sections.find(
                                                        (s) => s.id === activeSection
                                                    );
                                                    if (ehrDocumentType !== 'epic' || !nav) {
                                                        return t('patientIntake.defaultPanelSub');
                                                    }
                                                    if (nav.key === 'patientInstructions') {
                                                        const n =
                                                            epicSectionOccurrenceCounts[
                                                                'Note from Mayo Clinic'
                                                            ] ??
                                                            epicNoteFromClinicOccurrences.length;
                                                        return n && n > 0
                                                            ? `Epic cover disclaimer · registered × ${n}`
                                                            : t('patientIntake.defaultPanelSub');
                                                    }
                                                    const label = ehrSidebarNavLabel(
                                                        nav,
                                                        ehrDocumentType
                                                    );
                                                    const n =
                                                        epicSectionOccurrenceCounts[label] ??
                                                        epicSectionOccurrencesByKey[
                                                            nav.key as import('../intake/tab14PortabilitySections').Tab14SectionKey
                                                        ]?.length;
                                                    return n && n > 0
                                                        ? `Epic multi-hit · registered × ${n}`
                                                        : t('patientIntake.defaultPanelSub');
                                                })()}
                                    </p>
                                </div>
                                <div className="tab14-panel-body">
                        {activeSection === 0 && (
                            <>
                                <fieldset
                                    className={`tab14-record-fieldset${!canEditPatientRecords ? ' tab14-record-fieldset--locked' : ''}`}
                                >
                            <div className="tab14-section-card">

                                {ehrDocumentType === 'epic' ? (
                                  <EpicDemographicsOccurrencesPanel
                                    occurrences={epicDemographicsOccurrences}
                                    openMap={epicDemographicsOpen}
                                    setOpenMap={setEpicDemographicsOpen}
                                    setOccurrences={setEpicDemographicsOccurrences}
                                    fallback={{
                                      address: patientInfo.address,
                                      patientFullName:
                                        patientInfo.patientFullName ||
                                        [patientInfo.givenName, patientInfo.familyName]
                                          .filter(Boolean)
                                          .join(' '),
                                      givenName: patientInfo.givenName,
                                      familyName: patientInfo.familyName,
                                      formerAliases: patientInfo.formerAliases,
                                      communication: patientInfo.communication,
                                      phoneNumber: patientInfo.phoneNumber,
                                      homePhone: patientInfo.homePhone,
                                      email: patientInfo.email,
                                      preferredLanguage: patientInfo.preferredLanguage,
                                      race: patientInfo.race,
                                      ethnicity: patientInfo.ethnicity,
                                      maritalStatus: patientInfo.maritalStatus,
                                      sexAtBirth: patientInfo.sexAtBirth,
                                      dateOfBirth: patientInfo.dateOfBirth,
                                    }}
                                    onPrimaryChange={(fields) => {
                                      const full =
                                        fields.patientFullName ||
                                        [fields.givenName, fields.familyName]
                                          .filter(Boolean)
                                          .join(' ');
                                      const parts = full.trim().split(/\s+/);
                                      setPatientInfo((prev) => ({
                                        ...prev,
                                        address: fields.address ?? prev.address,
                                        patientFullName: full || prev.patientFullName,
                                        givenName:
                                          fields.givenName ||
                                          (parts.length > 1 ? parts.slice(0, -1).join(' ') : full) ||
                                          prev.givenName,
                                        familyName:
                                          fields.familyName ||
                                          (parts.length > 1 ? parts[parts.length - 1]! : '') ||
                                          prev.familyName,
                                        formerAliases: fields.formerAliases ?? prev.formerAliases,
                                        communication: fields.communication ?? prev.communication,
                                        phoneNumber: fields.phoneNumber ?? prev.phoneNumber,
                                        homePhone: fields.homePhone ?? prev.homePhone,
                                        email: fields.email ?? prev.email,
                                        preferredLanguage:
                                          fields.preferredLanguage ?? prev.preferredLanguage,
                                        race: fields.race ?? prev.race,
                                        ethnicity: fields.ethnicity ?? prev.ethnicity,
                                        maritalStatus: fields.maritalStatus ?? prev.maritalStatus,
                                        sexAtBirth: fields.sexAtBirth ?? prev.sexAtBirth,
                                        dateOfBirth: fields.dateOfBirth ?? prev.dateOfBirth,
                                      }));
                                    }}
                                  />
                                ) : (
                                  <>
                                <div className="form-field">
                                    <label>
                                        Given Name *{renderPdfFieldWarningIcon('givenName')}
                                    </label>
                                    <input
                                        value={patientInfo.givenName}
                                        onChange={(e) =>
                                        handleSingleChange(
                                            "givenName",
                                            e.target.value,
                                            patientInfo,
                                            setPatientInfo
                                        )}
                                    />
                                    {errors.givenName && (
                                        <span className = "error-message">
                                            {errors.givenName}
                                        </span>
                                    )}
                                </div>

                                <div className="form-field">
                                    <label>
                                        Family Name *{renderPdfFieldWarningIcon('familyName')}
                                    </label>
                                    <input
                                        value={patientInfo.familyName}
                                        onChange={(e) =>
                                        handleSingleChange(
                                            "familyName",
                                            e.target.value,
                                            patientInfo,
                                            setPatientInfo
                                        )}
                                    />
                                    {errors.familyName && (
                                        <span className = "error-message"> 
                                            {errors.familyName}
                                        </span>
                                    )}
                                </div>

                                <div className="form-field">
                                    <label>
                                        Date of Birth *{renderPdfFieldWarningIcon('dateOfBirth')}
                                    </label>
                                    <GlassDateInput
                                        value={patientInfo.dateOfBirth}
                                        onChange={(iso) =>
                                            handleSingleChange('dateOfBirth', iso, patientInfo, setPatientInfo)
                                        }
                                        max={new Date().toISOString().split('T')[0]}
                                    />
                                    {errors.dateOfBirth && (
                                        <span className = "error-message" >
                                            {errors.dateOfBirth}
                                        </span>)}
                                </div>

                                <div className="form-field">
                                    <label>
                                        Email {renderPdfFieldWarningIcon('email')}
                                    </label>
                                    <input
                                        type="email"
                                        value={patientInfo.email}
                                        onChange={(e) =>
                                        handleSingleChange(
                                            "email",
                                            e.target.value,
                                            patientInfo,
                                            setPatientInfo
                                        )}
                                    />

                                    {errors.email && (
                                        <span className = "error-message">
                                            {errors.email}
                                        </span>
                                    )}
                                </div>

                                <label className="no-allergies-row">
                                    <input
                                        type="checkbox"
                                        checked={addAnotherEmail}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setAddAnotherEmail(checked);
                                            if (checked) {
                                                setPatientInfo((prev) => ({
                                                    ...prev,
                                                    additionalEmails:
                                                        prev.additionalEmails.length > 0
                                                            ? prev.additionalEmails
                                                            : [''],
                                                }));
                                            } else {
                                                setPatientInfo((prev) => ({
                                                    ...prev,
                                                    additionalEmails: [],
                                                }));
                                            }
                                        }}
                                    />
                                    <span>Add another email</span>
                                </label>

                                {addAnotherEmail &&
                                    (patientInfo.additionalEmails.length > 0
                                        ? patientInfo.additionalEmails
                                        : ['']
                                    ).map((extraEmail, emailIndex) => (
                                        <div className="form-field" key={`extra-email-${emailIndex}`}>
                                            <label>
                                                Additional email {emailIndex + 1}
                                                {renderPdfFieldWarningIcon('additionalEmails')}
                                            </label>
                                            <input
                                                type="email"
                                                value={extraEmail}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setPatientInfo((prev) => {
                                                        const next = [...prev.additionalEmails];
                                                        if (next.length === 0) next.push('');
                                                        next[emailIndex] = value;
                                                        return { ...prev, additionalEmails: next };
                                                    });
                                                    setPdfFieldWarnings((prev) =>
                                                        clearPatientFieldWarning(prev, 'additionalEmails')
                                                    );
                                                }}
                                            />
                                            {errors[`additionalEmail-${emailIndex}`] && (
                                                <span className="error-message">
                                                    {errors[`additionalEmail-${emailIndex}`]}
                                                </span>
                                            )}
                                        </div>
                                    ))}

                                {addAnotherEmail && (
                                    <button
                                        type="button"
                                        className="add-section-button"
                                        onClick={() =>
                                            setPatientInfo((prev) => ({
                                                ...prev,
                                                additionalEmails: [...prev.additionalEmails, ''],
                                            }))
                                        }
                                    >
                                        + Add another email address
                                    </button>
                                )}
                                
                                <div className = "form-field">
                                    <label>
                                        Phone Number {renderPdfFieldWarningIcon('phoneNumber')}
                                    </label>
                                    <input 
                                    value = {patientInfo.phoneNumber}
                                    onChange={(e) =>
                                        handleSingleChange (
                                            "phoneNumber",
                                            e.target.value,
                                            patientInfo,
                                            setPatientInfo
                                        )}
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        Address{renderPdfFieldWarningIcon('address')}
                                    </label>
                                    <input
                                        value={patientInfo.address}
                                        onChange={(e) =>
                                            handleSingleChange(
                                                'address',
                                                e.target.value,
                                                patientInfo,
                                                setPatientInfo
                                            )
                                        }
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        Race{renderPdfFieldWarningIcon('race')}
                                    </label>
                                    <input
                                        value={patientInfo.race}
                                        onChange={(e) =>
                                            handleSingleChange(
                                                'race',
                                                e.target.value,
                                                patientInfo,
                                                setPatientInfo
                                            )
                                        }
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        Ethnicity{renderPdfFieldWarningIcon('ethnicity')}
                                    </label>
                                    <input
                                        value={patientInfo.ethnicity}
                                        onChange={(e) =>
                                            handleSingleChange(
                                                'ethnicity',
                                                e.target.value,
                                                patientInfo,
                                                setPatientInfo
                                            )
                                        }
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        Preferred Language{renderPdfFieldWarningIcon('preferredLanguage')}
                                    </label>
                                    <input
                                        value={patientInfo.preferredLanguage}
                                        onChange={(e) =>
                                            handleSingleChange(
                                                'preferredLanguage',
                                                e.target.value,
                                                patientInfo,
                                                setPatientInfo
                                            )
                                        }
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        Marital Status{renderPdfFieldWarningIcon('maritalStatus')}
                                    </label>
                                    <select
                                        value={patientInfo.maritalStatus}
                                        onChange={(e) =>
                                            handleSingleChange(
                                                'maritalStatus',
                                                e.target.value,
                                                patientInfo,
                                                setPatientInfo
                                            )
                                        }
                                    >
                                        <option value="">Select marital status</option>
                                        <option value="Single">Single</option>
                                        <option value="Married">Married</option>
                                        <option value="Never Married">Never Married</option>
                                        <option value="Divorced">Divorced</option>
                                        <option value="Widowed">Widowed</option>
                                        <option value="Separated">Separated</option>
                                        <option value="Domestic Partnership">Domestic Partnership</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                
                                <div className="form-field">
                                    <label>
                                        Blood Type{renderPdfFieldWarningIcon('bloodType')}
                                    </label>
                                    <select
                                    value={patientInfo.bloodType}
                                    onChange={(e) =>
                                        handleSingleChange("bloodType", e.target.value, patientInfo, setPatientInfo)
                                    }>
                                        <option value="">Select Blood Type</option>
                                        <option value="A+">A+</option>
                                        <option value="A-">A-</option>
                                        <option value="B+">B+</option>
                                        <option value="B-">B-</option>
                                        <option value="AB+">AB+</option>
                                        <option value="AB-">AB-</option>
                                        <option value="O+">O+</option>
                                        <option value="O-">O-</option>
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label>
                                        Sex at Birth{renderPdfFieldWarningIcon('sexAtBirth')}
                                    </label>
                                    <select
                                    value={patientInfo.sexAtBirth}
                                    onChange={(e) =>
                                        handleSingleChange("sexAtBirth", e.target.value, patientInfo, setPatientInfo)
                                    }>
                                        <option value="">Select Sex at Birth</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label>
                                        Legal sex{renderPdfFieldWarningIcon('legalSex')}
                                    </label>
                                    <select
                                        value={patientInfo.legalSex}
                                        onChange={(e) =>
                                            handleSingleChange(
                                                'legalSex',
                                                e.target.value,
                                                patientInfo,
                                                setPatientInfo
                                            )
                                        }
                                    >
                                        <option value="">Select legal sex</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                        <option value="Unknown">Unknown</option>
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label>
                                        Gender identity{renderPdfFieldWarningIcon('genderIdentity')}
                                    </label>
                                    <input
                                        value={patientInfo.genderIdentity}
                                        onChange={(e) =>
                                            handleSingleChange(
                                                'genderIdentity',
                                                e.target.value,
                                                patientInfo,
                                                setPatientInfo
                                            )
                                        }
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        Sexual orientation{renderPdfFieldWarningIcon('sexualOrientation')}
                                    </label>
                                    <input
                                        value={patientInfo.sexualOrientation}
                                        onChange={(e) =>
                                            handleSingleChange(
                                                'sexualOrientation',
                                                e.target.value,
                                                patientInfo,
                                                setPatientInfo
                                            )
                                        }
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        Sex at birth date recorded
                                        {renderPdfFieldWarningIcon('sexAtBirthRecordedOn')}
                                    </label>
                                    <GlassDateInput
                                        value={patientInfo.sexAtBirthRecordedOn}
                                        onChange={(iso) =>
                                            handleSingleChange(
                                                'sexAtBirthRecordedOn',
                                                iso,
                                                patientInfo,
                                                setPatientInfo
                                            )
                                        }
                                        max={new Date().toISOString().split('T')[0]}
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        Other notes{renderPdfFieldWarningIcon('otherNotes')}
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={patientInfo.otherNotes}
                                        onChange={(e) =>
                                            handleSingleChange(
                                                'otherNotes',
                                                e.target.value,
                                                patientInfo,
                                                setPatientInfo
                                            )
                                        }
                                    />
                                </div>
                                  </>
                                )}

                            </div>

                            {ehrDocumentType !== 'epic' && (
                            <div className="tab14-section-card tab14-emergency-contact-section">
                                <div className="tab14-subsection-heading">
                                    <h3>Emergency Contact</h3>
                                    <p>
                                        Separate from the patient&apos;s own contact details —
                                        name, relationship, and phone or email for who to reach
                                        in an emergency.
                                    </p>
                                </div>

                                <div className="form-field">
                                    <label>
                                        First name
                                        {renderPdfFieldWarningIcon('emergencyContactGivenName')}
                                    </label>
                                    <input
                                        value={patientInfo.emergencyContactGivenName}
                                        onChange={(e) =>
                                            handleSingleChange(
                                                'emergencyContactGivenName',
                                                e.target.value,
                                                patientInfo,
                                                setPatientInfo
                                            )
                                        }
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        Last name
                                        {renderPdfFieldWarningIcon('emergencyContactFamilyName')}
                                    </label>
                                    <input
                                        value={patientInfo.emergencyContactFamilyName}
                                        onChange={(e) =>
                                            handleSingleChange(
                                                'emergencyContactFamilyName',
                                                e.target.value,
                                                patientInfo,
                                                setPatientInfo
                                            )
                                        }
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        Relationship
                                        {renderPdfFieldWarningIcon(
                                            'emergencyContactRelationship'
                                        )}
                                    </label>
                                    <input
                                        value={patientInfo.emergencyContactRelationship}
                                        onChange={(e) =>
                                            handleSingleChange(
                                                'emergencyContactRelationship',
                                                e.target.value,
                                                patientInfo,
                                                setPatientInfo
                                            )
                                        }
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        Phone number
                                        {renderPdfFieldWarningIcon('emergencyContactPhone')}
                                    </label>
                                    <input
                                        value={patientInfo.emergencyContactPhone}
                                        onChange={(e) =>
                                            handleSingleChange(
                                                'emergencyContactPhone',
                                                e.target.value,
                                                patientInfo,
                                                setPatientInfo
                                            )
                                        }
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        Email
                                        {renderPdfFieldWarningIcon('emergencyContactEmail')}
                                    </label>
                                    <input
                                        type="email"
                                        value={patientInfo.emergencyContactEmail}
                                        onChange={(e) =>
                                            handleSingleChange(
                                                'emergencyContactEmail',
                                                e.target.value,
                                                patientInfo,
                                                setPatientInfo
                                            )
                                        }
                                    />
                                </div>
                            </div>
                            )}
                                </fieldset>
                            </>
                        )}

                        {activeSection === 6 && (
                            <fieldset
                                className={`tab14-record-fieldset${!canEditPatientRecords ? ' tab14-record-fieldset--locked' : ''}`}
                            >
                            <div className="tab14-section-card tab14-vitals-section">
                                {ehrDocumentType === 'epic' &&
                                (epicSectionOccurrencesByKey.vitals?.length ?? 0) > 0 ? (
                                    renderEpicSectionMultiHit('vitals', 'Last Filed Vital Signs')
                                ) : (
                                    <>
                                <div className="tab14-vitals-heading">
                                    <h3>{t('patientIntake.heightWeightHeading')}</h3>
                                    <p>
                                        {t('patientIntake.heightWeightSub')}
                                    </p>
                                </div>
                                {renderPatientVitalsFields()}
                                    </>
                                )}
                            </div>
                            </fieldset>
                        )}

                        {activeSection === 7 && (
                            <fieldset
                                className={`tab14-record-fieldset${!canEditPatientRecords ? ' tab14-record-fieldset--locked' : ''}`}
                            >
                            <div className="tab14-section-card">
                                {ehrDocumentType === 'epic' &&
                                (epicSectionOccurrencesByKey.results?.length ?? 0) > 0 ? (
                                    renderEpicSectionMultiHit('results', 'Results')
                                ) : (
                                    <>
                                {!canEditPatientRecords && (
                                    <p className="tab14-panel-sub" style={{ marginTop: 0 }}>
                                        {t('patientIntake.patientLabsReadOnly')}
                                    </p>
                                )}
                                {labPanels.length === 0 ? (
                                    <p className="tab14-panel-sub" style={{ marginTop: 0 }}>
                                        Upload a PDF with lab or imaging results, or add a panel below.
                                    </p>
                                ) : (
                                    <>
                                        <Tab14RepeaterToolbar
                                            onExpandAll={() =>
                                                setAllRepeaterAccordion('labResult', labPanels.length, true)
                                            }
                                            onCollapseAll={() =>
                                                setAllRepeaterAccordion('labResult', labPanels.length, false)
                                            }
                                        />
                                        {labPanels.map((panel, index) => (
                                            <Tab14RepeaterAccordion
                                                key={panel.serverId ?? panel.id}
                                                sectionKey="labResult"
                                                index={index}
                                                title={labResultAccordionTitle(panel, index)}
                                                isOpen={isRepeaterAccordionOpen(
                                                    repeaterAccordionOpen,
                                                    'labResult',
                                                    index
                                                )}
                                                onToggle={() => toggleRepeaterAccordion('labResult', index)}
                                            >
                                                <div className="form-field">
                                                    <label>Test / panel name</label>
                                                    <input
                                                        value={panel.testName}
                                                        onChange={(e) =>
                                                            updateLabPanelField(index, {
                                                                testName: e.target.value,
                                                            })
                                                        }
                                                    />
                                                </div>
                                                <div className="form-field">
                                                    <label>Display code</label>
                                                    <input
                                                        value={panel.displayCode ?? ''}
                                                        onChange={(e) =>
                                                            updateLabPanelField(index, {
                                                                displayCode: e.target.value || null,
                                                            })
                                                        }
                                                    />
                                                </div>
                                                <div className="form-field">
                                                    <label>Collected on</label>
                                                    <GlassDateInput
                                                        value={panel.date}
                                                        onChange={(iso) =>
                                                            updateLabPanelField(index, { date: iso })
                                                        }
                                                    />
                                                </div>
                                                <div className="form-field">
                                                    <label>Status</label>
                                                    <select
                                                        value={panel.status}
                                                        onChange={(e) =>
                                                            updateLabPanelField(index, {
                                                                status: e.target.value,
                                                            })
                                                        }
                                                    >
                                                        {!LAB_STATUS_OPTIONS.includes(
                                                            panel.status as (typeof LAB_STATUS_OPTIONS)[number]
                                                        ) && panel.status ? (
                                                            <option value={panel.status}>{panel.status}</option>
                                                        ) : null}
                                                        {LAB_STATUS_OPTIONS.map((status) => (
                                                            <option key={status} value={status}>
                                                                {status}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="form-field">
                                                    <label>Category</label>
                                                    <select
                                                        value={panel.category || 'lab'}
                                                        onChange={(e) =>
                                                            updateLabPanelField(index, {
                                                                category: e.target
                                                                    .value as Tab14LabPanelCategory,
                                                            })
                                                        }
                                                    >
                                                        {TAB14_LAB_CATEGORIES.map((cat) => (
                                                            <option key={cat} value={cat}>
                                                                {cat}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <label className="no-allergies-row">
                                                    <input
                                                        type="checkbox"
                                                        checked={panel.isNew}
                                                        onChange={(e) =>
                                                            updateLabPanelField(index, {
                                                                isNew: e.target.checked,
                                                            })
                                                        }
                                                    />
                                                    Mark as new
                                                </label>
                                                <div className="form-field">
                                                    <label>Clinical indication</label>
                                                    <textarea
                                                        rows={2}
                                                        value={panel.clinicalIndication ?? ''}
                                                        onChange={(e) =>
                                                            updateLabPanelField(index, {
                                                                clinicalIndication: e.target.value,
                                                            })
                                                        }
                                                    />
                                                </div>
                                                <div className="form-field">
                                                    <label>Impression</label>
                                                    <textarea
                                                        rows={2}
                                                        value={panel.impression ?? ''}
                                                        onChange={(e) =>
                                                            updateLabPanelField(index, {
                                                                impression: e.target.value,
                                                            })
                                                        }
                                                    />
                                                </div>
                                                <div className="form-field">
                                                    <label>Accession number</label>
                                                    <input
                                                        value={panel.accessionNumber ?? ''}
                                                        onChange={(e) =>
                                                            updateLabPanelField(index, {
                                                                accessionNumber: e.target.value,
                                                            })
                                                        }
                                                    />
                                                </div>
                                                <div className="form-field">
                                                    <label>Modality</label>
                                                    <input
                                                        value={panel.modality ?? ''}
                                                        onChange={(e) =>
                                                            updateLabPanelField(index, {
                                                                modality: e.target.value,
                                                            })
                                                        }
                                                    />
                                                </div>
                                                <div className="form-field">
                                                    <label>Signed by</label>
                                                    <input
                                                        value={panel.signedBy ?? ''}
                                                        onChange={(e) =>
                                                            updateLabPanelField(index, {
                                                                signedBy: e.target.value,
                                                            })
                                                        }
                                                    />
                                                </div>
                                                <div className="form-field">
                                                    <label>Notes</label>
                                                    <textarea
                                                        rows={2}
                                                        value={panel.notes ?? ''}
                                                        onChange={(e) =>
                                                            updateLabPanelField(index, {
                                                                notes: e.target.value,
                                                            })
                                                        }
                                                    />
                                                </div>

                                                <h4 className="tab14-lab-components-heading">Components</h4>
                                                {panel.results.map((comp, compIndex) => (
                                                    <div
                                                        key={`${panel.id}-comp-${compIndex}`}
                                                        className="tab14-lab-component-block section-block"
                                                    >
                                                        <div className="form-field">
                                                            <label>Analyte / component name</label>
                                                            <input
                                                                value={comp.name}
                                                                onChange={(e) =>
                                                                    updateLabComponentField(
                                                                        index,
                                                                        compIndex,
                                                                        { name: e.target.value }
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                        <div className="form-field">
                                                            <label>Numeric value</label>
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                value={
                                                                    comp.value == null
                                                                        ? ''
                                                                        : String(comp.value)
                                                                }
                                                                onChange={(e) => {
                                                                    const raw = e.target.value.trim();
                                                                    updateLabComponentField(
                                                                        index,
                                                                        compIndex,
                                                                        {
                                                                            value:
                                                                                raw === ''
                                                                                    ? undefined
                                                                                    : Number(raw),
                                                                        }
                                                                    );
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="form-field">
                                                            <label>Text / qualitative value</label>
                                                            <input
                                                                value={comp.textValue ?? ''}
                                                                placeholder='e.g. &lt;0.6'
                                                                onChange={(e) =>
                                                                    updateLabComponentField(
                                                                        index,
                                                                        compIndex,
                                                                        {
                                                                            textValue:
                                                                                e.target.value,
                                                                        }
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                        <div className="form-field">
                                                            <label>Unit</label>
                                                            <input
                                                                value={comp.unit}
                                                                onChange={(e) =>
                                                                    updateLabComponentField(
                                                                        index,
                                                                        compIndex,
                                                                        { unit: e.target.value }
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                        <div className="form-field">
                                                            <label>Reference range</label>
                                                            <input
                                                                value={comp.range}
                                                                onChange={(e) =>
                                                                    updateLabComponentField(
                                                                        index,
                                                                        compIndex,
                                                                        { range: e.target.value }
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                        <div className="form-field">
                                                            <label>Interpretation</label>
                                                            <input
                                                                value={comp.interpretation ?? ''}
                                                                onChange={(e) =>
                                                                    updateLabComponentField(
                                                                        index,
                                                                        compIndex,
                                                                        {
                                                                            interpretation:
                                                                                e.target.value,
                                                                        }
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                        <label className="no-allergies-row">
                                                            <input
                                                                type="checkbox"
                                                                checked={comp.critical}
                                                                onChange={(e) =>
                                                                    updateLabComponentField(
                                                                        index,
                                                                        compIndex,
                                                                        {
                                                                            critical:
                                                                                e.target.checked,
                                                                        }
                                                                    )
                                                                }
                                                            />
                                                            Critical / flagged
                                                        </label>
                                                        {panel.results.length > 1 && (
                                                            <button
                                                                className="remove-button"
                                                                type="button"
                                                                onClick={() =>
                                                                    removeLabComponent(
                                                                        index,
                                                                        compIndex
                                                                    )
                                                                }
                                                            >
                                                                Remove component
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                <button
                                                    className="add-section-button"
                                                    type="button"
                                                    onClick={() => addLabComponent(index)}
                                                >
                                                    + Add component
                                                </button>

                                                <button
                                                    className="remove-button"
                                                    type="button"
                                                    onClick={() => removeLabPanelAt(index)}
                                                >
                                                    Remove lab result
                                                </button>
                                            </Tab14RepeaterAccordion>
                                        ))}
                                    </>
                                )}
                                <button
                                    className="add-section-button"
                                    type="button"
                                    onClick={addLabPanel}
                                >
                                    + Add lab result
                                </button>
                                    </>
                                )}
                            </div>
                            </fieldset>
                        )}

                        {activeSection >= 1 && activeSection <= 5 && (
                                <fieldset
                                    className={`tab14-record-fieldset${!canEditPatientRecords ? ' tab14-record-fieldset--locked' : ''}`}
                                >

                    {/* Insurance */}
                        {activeSection === 4 && (
                            <div className="tab14-section-card">
                                {ehrDocumentType === 'epic' &&
                                (epicSectionOccurrencesByKey.payers?.length ?? 0) > 0 ? (
                                    renderEpicSectionMultiHit('payers', 'Insurance')
                                ) : (
                                    <>
                                {insurances.map((insurance, index) => {
                                    const insuranceTitle = `${index + 1}# ${t('patientIntake.sections.payers')}`;
                                    const isOpen = isInsuranceAccordionOpen(expandedInsuranceIds, index);
                                    const panelId = `tab14-insurance-${index}`;
                                    return (
                                        <div key={index} className="tab14-repeater-accordion section-block">
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                className={`accordion-header tab14-repeater-accordion__header${
                                                    isOpen ? ' tab14-repeater-accordion__header--open' : ''
                                                }`}
                                                onClick={() =>
                                                    setExpandedInsuranceIds((prev) => ({
                                                        ...prev,
                                                        [index]: !isOpen,
                                                    }))
                                                }
                                                onKeyDown={repeaterToggleKeyDown(() =>
                                                    setExpandedInsuranceIds((prev) => ({
                                                        ...prev,
                                                        [index]: !isOpen,
                                                    }))
                                                )}
                                                aria-expanded={isOpen}
                                                aria-controls={panelId}
                                            >
                                                <span className="tab14-repeater-accordion__title">{insuranceTitle}</span>
                                                <span className="tab14-repeater-accordion__chevron" aria-hidden="true">
                                                    {isOpen ? '▾' : '▸'}
                                                </span>
                                            </div>
                                            {isOpen ? (
                                                <div
                                                    id={panelId}
                                                    className="accordion-content tab14-repeater-accordion__content"
                                                >
                                        <div className = "form-field"> 
                                            <label>
                                                {t('patientIntake.fields.providerName')}
                                                {renderPdfInsuranceWarningIcon(index, 'providerName')}
                                            </label>
                                            <input value = {insurance.providerName}
                                            onChange={(e) => 
                                                handleChange(index, "providerName", e.target.value, insurances, setInsurances)
                                            }/>
                                        </div> 

                                        <div className="form-field">
                                            <label>
                                                {t('patientIntake.fields.policyNumber')}
                                                {renderPdfInsuranceWarningIcon(index, 'policyNumber')}
                                            </label>
                                            <input
                                            value={insurance.policyNumber}
                                            onChange={(e) =>
                                                handleChange(index, "policyNumber", e.target.value, insurances, setInsurances)
                                            }/>
                                        </div>

                                        <div className="form-field">
                                            <label>
                                                {t('patientIntake.fields.planName')}
                                                {renderPdfInsuranceWarningIcon(index, 'planName')}
                                            </label>
                                            <input
                                            value={insurance.planName}
                                            onChange={(e) =>
                                                handleChange(index, "planName", e.target.value, insurances, setInsurances)
                                            }/>
                                        </div>
                                        <div className="form-field">
                                            <label>
                                                {t('patientIntake.fields.memberId')}
                                                {renderPdfInsuranceWarningIcon(index, 'memberID')}
                                            </label>
                                            <input
                                            value={insurance.memberID}
                                            onChange={(e) =>
                                                handleChange(index, "memberID", e.target.value, insurances, setInsurances)
                                            }/>
                                        </div>
                                        <div className="form-field">
                                            <label>
                                                {t('patientIntake.fields.groupNumber')}
                                                {renderPdfInsuranceWarningIcon(index, 'groupNumber')}
                                            </label>
                                            <input
                                            value={insurance.groupNumber}
                                            onChange={(e) =>
                                                handleChange(index, "groupNumber", e.target.value, insurances, setInsurances)
                                            }/>
                                        </div>
                                        <div className="form-field">
                                            <label>Payer ID{renderPdfInsuranceWarningIcon(index, 'payerId')}</label>
                                            <input
                                                value={insurance.payerId}
                                                onChange={(e) =>
                                                    handleChange(index, 'payerId', e.target.value, insurances, setInsurances)
                                                }
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>Guarantor{renderPdfInsuranceWarningIcon(index, 'guarantor')}</label>
                                            <input
                                                value={insurance.guarantor}
                                                onChange={(e) =>
                                                    handleChange(index, 'guarantor', e.target.value, insurances, setInsurances)
                                                }
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>Member name{renderPdfInsuranceWarningIcon(index, 'memberName')}</label>
                                            <input
                                                value={insurance.memberName}
                                                onChange={(e) =>
                                                    handleChange(index, 'memberName', e.target.value, insurances, setInsurances)
                                                }
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>Relation to subscriber{renderPdfInsuranceWarningIcon(index, 'relationToSubscriber')}</label>
                                            <input
                                                value={insurance.relationToSubscriber}
                                                onChange={(e) =>
                                                    handleChange(index, 'relationToSubscriber', e.target.value, insurances, setInsurances)
                                                }
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>Subscriber name{renderPdfInsuranceWarningIcon(index, 'subscriberName')}</label>
                                            <input
                                                value={insurance.subscriberName}
                                                onChange={(e) =>
                                                    handleChange(index, 'subscriberName', e.target.value, insurances, setInsurances)
                                                }
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>Subscriber ID{renderPdfInsuranceWarningIcon(index, 'subscriberId')}</label>
                                            <input
                                                value={insurance.subscriberId}
                                                onChange={(e) =>
                                                    handleChange(index, 'subscriberId', e.target.value, insurances, setInsurances)
                                                }
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>Subscriber date of birth{renderPdfInsuranceWarningIcon(index, 'subscriberDob')}</label>
                                            <GlassDateInput
                                                value={insurance.subscriberDob}
                                                onChange={(iso) =>
                                                    handleChange(index, 'subscriberDob', iso, insurances, setInsurances)
                                                }
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>Billing address{renderPdfInsuranceWarningIcon(index, 'billingAddress')}</label>
                                            <input
                                                value={insurance.billingAddress}
                                                onChange={(e) =>
                                                    handleChange(index, 'billingAddress', e.target.value, insurances, setInsurances)
                                                }
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>{t('patientIntake.fields.startDate')}</label>
                                            <GlassDateInput
                                                value={insurance.startDate}
                                                onChange={(iso) =>
                                                    handleChange(index, 'startDate', iso, insurances, setInsurances)
                                                }
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>{t('patientIntake.fields.endDate')}</label>
                                            <GlassDateInput
                                                value={insurance.endDate}
                                                onChange={(iso) =>
                                                    handleChange(index, 'endDate', iso, insurances, setInsurances)
                                                }
                                            />
                                        </div>

                                        {errors[`insurance-${index}`] && (
                                            <span className="save-error-message">
                                                {errors[`insurance-${index}`]}
                                            </span>
                                        )}

                                            {insurances.length > 1 && (
                                            <button
                                            className="remove-button"
                                            type="button"
                                            onClick={() => {
                                                handleRemoveSection(index, insurances, setInsurances);
                                                setExpandedInsuranceIds((prev) => {
                                                    const next: Record<number, boolean> = {};
                                                    for (const [key, value] of Object.entries(prev)) {
                                                        const k = Number(key);
                                                        if (k < index) next[k] = value;
                                                        else if (k > index) next[k - 1] = value;
                                                    }
                                                    return next;
                                                });
                                                if (insurances.length <= 2) {
                                                    setAddAnotherInsurance(false);
                                                }
                                            }}>
                                                Remove Insurance
                                            </button>
                                        )}
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}

                                <label className="no-allergies-row">
                                    <input
                                        type="checkbox"
                                        checked={addAnotherInsurance}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setAddAnotherInsurance(checked);
                                            if (checked) {
                                                if (insurances.length === 1) {
                                                    const newIndex = insurances.length;
                                                    setInsurances((prev) => [...prev, { ...defaultInsurance }]);
                                                    setExpandedInsuranceIds((prev) => ({
                                                        ...prev,
                                                        [newIndex]: true,
                                                    }));
                                                }
                                            } else if (insurances.length > 1) {
                                                const last = insurances[insurances.length - 1];
                                                if (isInsuranceRowEmpty(last)) {
                                                    setInsurances((prev) => prev.slice(0, -1));
                                                    setExpandedInsuranceIds({});
                                                }
                                            }
                                        }}
                                    />
                                    <span>Add another insurance</span>
                                </label>

                                    </>
                                )}
                            </div>
                        )}

                    {/* Allergies */}
                        {activeSection === 2 && (
                            <div className="tab14-section-card">

                                {/* No Allergies Checkbox */}
                                <label className="no-allergies-row">
                                    <input
                                    type="checkbox"
                                    checked={noAllergies}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setNoAllergies(checked);

                                        if (checked) {
                                        setAllergies([]);
                                        } else {
                                        setAllergies([defaultAllergy]);
                                        }
                                    }}/>

                                    <span> 
                                        Click here if no allergies are present. 
                                    </span>
                                </label>

                                {ehrDocumentType === 'epic' &&
                                (epicSectionOccurrencesByKey.allergies?.length ?? 0) > 0 ? (
                                    renderEpicSectionMultiHit('allergies', 'Allergies')
                                ) : (
                                    <>
                                {!noAllergies && allergies.length > 0 && (
                                    <Tab14RepeaterToolbar
                                        onExpandAll={() => setAllRepeaterAccordion('allergy', allergies.length, true)}
                                        onCollapseAll={() => setAllRepeaterAccordion('allergy', allergies.length, false)}
                                    />
                                )}

                                {!noAllergies && allergies.map((allergy, index) => (
                                    <Tab14RepeaterAccordion
                                        key={index}
                                        sectionKey="allergy"
                                        index={index}
                                        title={repeaterRowTitle('allergy', index, allergy.allergyName)}
                                        isOpen={isRepeaterAccordionOpen(repeaterAccordionOpen, 'allergy', index)}
                                        onToggle={() => toggleRepeaterAccordion('allergy', index)}
                                    >

                                    <div className="form-field">
                                        <label>
                                            Allergy Name
                                            {renderPdfAllergyWarningIcon(index, 'allergyName')}
                                        </label>
                                        <input
                                        value={allergy.allergyName}
                                        onChange={(e) =>
                                            handleChange(index, "allergyName", e.target.value, allergies, setAllergies)
                                        }/>
                                    </div>

                                    <div className="form-field">
                                        <label>Allergen ID</label>
                                        <input
                                            value={allergy.allergenId}
                                            onChange={(e) =>
                                                handleChange(index, 'allergenId', e.target.value, allergies, setAllergies)
                                            }
                                            placeholder="e.g. 1469239"
                                        />
                                    </div>

                                    <div className="form-field">
                                        <label>
                                            Type (e.g. food, drug)
                                            {renderPdfAllergyWarningIcon(index, 'allergyType')}
                                        </label>
                                        <select
                                        value={allergy.allergyType}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setAllergies((prev) => {
                                                const next = [...prev];
                                                const cur = next[index];
                                                next[index] = {
                                                    ...cur,
                                                    allergyType: v,
                                                    allergyTypeOther:
                                                        v === 'Other' ? cur.allergyTypeOther : '',
                                                };
                                                return next;
                                            });
                                        }}>
                                            <option value="">Select type</option>
                                            <option value="Food">Food</option>
                                            <option value="Drug">Drug</option>
                                            <option value="Environmental">Environmental</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    {allergy.allergyType === 'Other' && (
                                        <div className="form-field">
                                            <label>Describe allergy type</label>
                                            <input
                                                value={allergy.allergyTypeOther}
                                                onChange={(e) =>
                                                    handleChange(
                                                        index,
                                                        'allergyTypeOther',
                                                        e.target.value,
                                                        allergies,
                                                        setAllergies
                                                    )
                                                }
                                                placeholder="e.g. Latex, contrast dye, insect sting"
                                            />
                                        </div>
                                    )}

                                    <div className="form-field">
                                        <label>Category (from document)</label>
                                        <input
                                            value={allergy.category}
                                            onChange={(e) =>
                                                handleChange(index, 'category', e.target.value, allergies, setAllergies)
                                            }
                                            placeholder="e.g. environment, medication"
                                        />
                                    </div>

                                    <div className="form-field">
                                        <label>Severity</label>
                                        <select
                                        value={
                                            ALLERGY_SEVERITY_OPTIONS.some((o) => o.value === allergy.severity)
                                                ? allergy.severity
                                                : allergy.severity
                                                    ? allergy.severity
                                                    : ''
                                        }
                                        onChange={(e) =>
                                            handleChange(index, "severity", e.target.value, allergies, setAllergies)
                                        }>
                                            {ALLERGY_SEVERITY_OPTIONS.map((opt) => (
                                                <option key={opt.value || 'blank'} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                            {allergy.severity &&
                                            !ALLERGY_SEVERITY_OPTIONS.some((o) => o.value === allergy.severity) ? (
                                                <option value={allergy.severity}>{allergy.severity}</option>
                                            ) : null}
                                        </select>
                                    </div>

                                    <div className="form-field">
                                        <label>Criticality</label>
                                        <input
                                            value={allergy.criticality}
                                            onChange={(e) =>
                                                handleChange(index, 'criticality', e.target.value, allergies, setAllergies)
                                            }
                                            placeholder="e.g. Not available"
                                        />
                                    </div>

                                    <div className="form-field">
                                        <label>Reaction Notes</label>
                                        <input
                                        value={allergy.reactionNotes}
                                        onChange={(e) =>
                                            handleChange(index, "reactionNotes", e.target.value, allergies, setAllergies)
                                        }/>
                                    </div>

                                    <div className="form-field">
                                        <label>Code</label>
                                        <input
                                            value={allergy.code}
                                            onChange={(e) =>
                                                handleChange(index, 'code', e.target.value, allergies, setAllergies)
                                            }
                                            placeholder="e.g. 235616"
                                        />
                                    </div>

                                    <div className="form-field">
                                        <label>Code system</label>
                                        <input
                                            value={allergy.codeSystem}
                                            onChange={(e) =>
                                                handleChange(index, 'codeSystem', e.target.value, allergies, setAllergies)
                                            }
                                            placeholder="e.g. RxNorm"
                                        />
                                    </div>

                                    <div className="form-field">
                                        <label>Last observed</label>
                                        <GlassDateInput
                                            value={allergy.lastObserved}
                                            onChange={(iso) =>
                                                handleChange(index, 'lastObserved', iso, allergies, setAllergies)
                                            }
                                            max={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>

                                    <div className="form-field">
                                        <label>Recorded by</label>
                                        <input
                                            value={allergy.recordedBy}
                                            onChange={(e) =>
                                                handleChange(index, 'recordedBy', e.target.value, allergies, setAllergies)
                                            }
                                        />
                                    </div>

                                    <div className="form-field">
                                        <label>Organization</label>
                                        <input
                                            value={allergy.organization}
                                            onChange={(e) =>
                                                handleChange(index, 'organization', e.target.value, allergies, setAllergies)
                                            }
                                        />
                                    </div>

                                    <div className="form-field">
                                        <label>Recorded time</label>
                                        <input
                                            value={allergy.recordedTime}
                                            onChange={(e) =>
                                                handleChange(index, 'recordedTime', e.target.value, allergies, setAllergies)
                                            }
                                            placeholder="HH:MM:SS"
                                        />
                                    </div>

                                    {allergies.length > 1 && (
                                        <button
                                        className="remove-button"
                                        type="button"
                                        onClick={() => handleRemoveRepeaterSection('allergy', index, allergies, setAllergies)}>
                                        Remove Allergy
                                        </button>
                                    )}
                                    </Tab14RepeaterAccordion>
                                ))}

                                <button
                                    className="add-section-button"
                                    type="button"
                                    onClick={() => handleAddRepeaterSection('allergy', allergies, setAllergies, defaultAllergy)}>
                                    + Add Another Allergy
                                </button>
                                    </>
                                )}

                            </div>
                        )}

                    {/* Medications */}
                        {activeSection === 3 && (
                            <div className="tab14-section-card">
                                <label className="no-allergies-row">
                                    <input
                                        type="checkbox"
                                        checked={noMedications}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setNoMedications(checked);
                                            setMedications(checked ? [] : [defaultMedication]);
                                        }}
                                    />
                                    Click here if no known medications are present
                                </label>

                                {ehrDocumentType === 'epic' &&
                                (epicSectionOccurrencesByKey.medications?.length ?? 0) > 0 ? (
                                    renderEpicSectionMultiHit('medications', 'Medications')
                                ) : (
                                    <>
                                {!noMedications && medications.length > 0 && (
                                    <Tab14RepeaterToolbar
                                        onExpandAll={() => setAllRepeaterAccordion('medication', medications.length, true)}
                                        onCollapseAll={() => setAllRepeaterAccordion('medication', medications.length, false)}
                                    />
                                )}

                                {!noMedications && medications.map((med, index) => (
                                    <Tab14RepeaterAccordion
                                        key={index}
                                        sectionKey="medication"
                                        index={index}
                                        title={repeaterRowTitle(
                                            'medication',
                                            index,
                                            med.genericName || med.brandName
                                        )}
                                        isOpen={isRepeaterAccordionOpen(repeaterAccordionOpen, 'medication', index)}
                                        onToggle={() => toggleRepeaterAccordion('medication', index)}
                                    >

                                        <div className="form-field">
                                            <label>
                                                Generic Name
                                                {renderPdfMedicationWarningIcon(index, 'genericName')}
                                            </label>
                                            <input
                                            value={med.genericName}
                                            onChange={(e) =>
                                                handleChange(index, "genericName", e.target.value, medications, setMedications)
                                            }/>
                                        </div>

                                        <div className="form-field">
                                            <label>
                                                Brand Name
                                                {renderPdfMedicationWarningIcon(index, 'brandName')}
                                            </label>
                                            <input
                                            value={med.brandName}
                                            onChange={(e) =>
                                                handleChange(index, "brandName", e.target.value, medications, setMedications)
                                            }/>
                                        </div>

                                        <div className="form-field">
                                            <label>Dosage</label>
                                            <input
                                            value={med.dosage}
                                            onChange={(e) =>
                                                handleChange(index, "dosage", e.target.value, medications, setMedications)
                                            }/>
                                        </div>

                                        <div className="form-field">
                                            <label>Route</label>
                                            <input
                                            value={med.route}
                                            onChange={(e) =>
                                                handleChange(index, "route", e.target.value, medications, setMedications)
                                            }/>
                                        </div>

                                        <div className="form-field">
                                            <label>Frequency</label>
                                            <input
                                            value={med.frequency}
                                            onChange={(e) =>
                                                handleChange(index, "frequency", e.target.value, medications, setMedications)
                                            }/>
                                        </div>

                                        <div className="form-field">
                                            <label>Purpose / indication</label>
                                            <input
                                            value={med.purpose}
                                            onChange={(e) =>
                                                handleChange(index, "purpose", e.target.value, medications, setMedications)
                                            }/>
                                        </div>

                                        <div className="form-field">
                                            <label>Directions / Sig</label>
                                            <textarea
                                                rows={2}
                                                value={med.sig}
                                                onChange={(e) =>
                                                    handleChange(index, 'sig', e.target.value, medications, setMedications)
                                                }
                                                placeholder="e.g. TAKE ONE CAPSULE BY MOUTH THREE TIMES DAILY"
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>Status</label>
                                            <input
                                                value={med.status}
                                                onChange={(e) =>
                                                    handleChange(index, 'status', e.target.value, medications, setMedications)
                                                }
                                                placeholder="e.g. Completed"
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>Authored on</label>
                                            <GlassDateInput
                                                value={med.authoredOn}
                                                onChange={(iso) =>
                                                    handleChange(index, 'authoredOn', iso, medications, setMedications)
                                                }
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>Fill quantity</label>
                                            <input
                                                value={med.fillQuantity}
                                                onChange={(e) =>
                                                    handleChange(index, 'fillQuantity', e.target.value, medications, setMedications)
                                                }
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>Prescribing physician</label>
                                            <input
                                            value={med.prescribingPhysician}
                                            onChange={(e) =>
                                                handleChange(index, "prescribingPhysician", e.target.value, medications, setMedications)
                                            }/>
                                        </div>

                                        <div className="form-field">
                                            <label>Recorded by</label>
                                            <input
                                                value={med.recordedBy}
                                                onChange={(e) =>
                                                    handleChange(index, 'recordedBy', e.target.value, medications, setMedications)
                                                }
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>Organization</label>
                                            <input
                                                value={med.organization}
                                                onChange={(e) =>
                                                    handleChange(index, 'organization', e.target.value, medications, setMedications)
                                                }
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>Recorded time</label>
                                            <input
                                                value={med.recordedTime}
                                                onChange={(e) =>
                                                    handleChange(index, 'recordedTime', e.target.value, medications, setMedications)
                                                }
                                                placeholder="HH:MM:SS"
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>{t('patientIntake.fields.startDate')}</label>
                                            <GlassDateInput
                                                value={med.startDate}
                                                onChange={(iso) =>
                                                    handleChange(index, 'startDate', iso, medications, setMedications)
                                                }
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>{t('patientIntake.fields.endDate')}</label>
                                            <GlassDateInput
                                                value={med.endDate}
                                                onChange={(iso) =>
                                                    handleChange(index, 'endDate', iso, medications, setMedications)
                                                }
                                            />
                                        </div>

                                        {/* Error message for invalid date range */}
                                        {errors[`medication-${index}`] && (
                                        <span className="save-error-message">{errors[`medication-${index}`]}</span>
                                        )}      
                                        <div className="form-field">
                                            <label>Notes</label>
                                            <input
                                            value={med.notesMedication}
                                            onChange={(e) =>
                                                handleChange(index, "notesMedication", e.target.value, medications, setMedications)
                                            }/>
                                        </div>

                                        {medications.length > 1 && (
                                            <button
                                                className="remove-button"
                                                type="button"
                                                onClick={() => handleRemoveRepeaterSection('medication', index, medications, setMedications)}>
                                                Remove Medication
                                            </button>
                                        )}
                                    </Tab14RepeaterAccordion>
                                ))}

                                {!noMedications && (
                                    <button
                                        className="add-section-button"
                                        type="button"
                                        onClick={() => handleAddRepeaterSection('medication', medications, setMedications, defaultMedication)}>
                                        + Add Another Medication
                                    </button>
                                )}
                                    </>
                                )}

                            </div>
                        )}

                    {/* Chronic Conditions */}
                        {activeSection === 5 && (
                            <div className="tab14-section-card">
                                <label className="no-allergies-row">
                                    <input
                                        type="checkbox"
                                        checked={noChronicConditions}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setNoChronicConditions(checked);
                                            setChronicConditions(
                                                checked
                                                    ? [
                                                          {
                                                              ...defaultChronicCondition,
                                                              conditionName: 'No Known Problems',
                                                              notesChronicConditions:
                                                                  'No Known Problems',
                                                          },
                                                      ]
                                                    : [defaultChronicCondition]
                                            );
                                            if (checked) setPdfChronicWarnings(undefined);
                                        }}
                                    />
                                    Click here if no known chronic conditions are present
                                </label>

                                {noChronicConditions ? (
                                    <div className="tab14-none-known-fields">
                                        <div className="form-field">
                                            <label>Condition Name</label>
                                            <input
                                                value={
                                                    chronicConditions[0]?.conditionName ||
                                                    'No Known Problems'
                                                }
                                                onChange={(e) =>
                                                    setChronicConditions([
                                                        {
                                                            ...(chronicConditions[0] ||
                                                                defaultChronicCondition),
                                                            conditionName: e.target.value,
                                                        },
                                                    ])
                                                }
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>Additional Notes</label>
                                            <input
                                                value={
                                                    chronicConditions[0]
                                                        ?.notesChronicConditions ||
                                                    'No Known Problems'
                                                }
                                                onChange={(e) =>
                                                    setChronicConditions([
                                                        {
                                                            ...(chronicConditions[0] ||
                                                                defaultChronicCondition),
                                                            notesChronicConditions: e.target.value,
                                                        },
                                                    ])
                                                }
                                            />
                                        </div>
                                    </div>
                                ) : ehrDocumentType === 'epic' &&
                                  (epicSectionOccurrencesByKey.problems?.length ?? 0) > 0 ? (
                                    renderEpicSectionMultiHit('problems', 'Active Problems')
                                ) : (
                                    <>
                                {chronicConditions.length > 0 && (
                                    <Tab14RepeaterToolbar
                                        onExpandAll={() =>
                                            setAllRepeaterAccordion('chronic', chronicConditions.length, true)
                                        }
                                        onCollapseAll={() =>
                                            setAllRepeaterAccordion('chronic', chronicConditions.length, false)
                                        }
                                    />
                                )}

                                {chronicConditions.map((condition, index) => (
                                    <Tab14RepeaterAccordion
                                        key={index}
                                        sectionKey="chronic"
                                        index={index}
                                        title={repeaterRowTitle('chronic', index, condition.conditionName)}
                                        isOpen={isRepeaterAccordionOpen(repeaterAccordionOpen, 'chronic', index)}
                                        onToggle={() => toggleRepeaterAccordion('chronic', index)}
                                        headerWarning={
                                            pdfChronicWarnings?.[index]
                                                ? Object.values(pdfChronicWarnings[index]!).find(Boolean)
                                                      ?.message || FIELD_WARNING_MESSAGES.VERIFY_GENERIC
                                                : null
                                        }
                                    >

                                        <div className="form-field">
                                            <label>
                                                Condition Name
                                                {renderPdfChronicWarningIcon(index, 'conditionName')}
                                            </label>
                                            <input
                                            value={condition.conditionName}
                                            onChange={(e) =>
                                                handleChange(index, "conditionName", e.target.value, chronicConditions, setChronicConditions)
                                            }/>
                                        </div>

                                        <div className="form-field">
                                            <label>
                                                ICD Code
                                                {renderPdfChronicWarningIcon(index, 'icdCode')}
                                            </label>
                                            <input
                                            value={condition.icdCode}
                                            onChange={(e) =>
                                                handleChange(index, "icdCode", e.target.value, chronicConditions, setChronicConditions)
                                            }/>
                                        </div>

                                        <div className="form-field">
                                            <label>
                                                Diagnosis Date
                                                {renderPdfChronicWarningIcon(index, 'diagnosisDate')}
                                            </label>
                                            <GlassDateInput
                                                value={condition.diagnosisDate}
                                                onChange={(iso) =>
                                                    handleChange(
                                                        index,
                                                        'diagnosisDate',
                                                        iso,
                                                        chronicConditions,
                                                        setChronicConditions,
                                                    )
                                                }
                                                max={new Date().toISOString().split('T')[0]}
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>
                                                Preexisting
                                                {renderPdfChronicWarningIcon(index, 'prexisting')}
                                            </label>
                                            <input
                                            value={condition.prexisting}
                                            onChange={(e) =>
                                                handleChange(index, "prexisting", e.target.value, chronicConditions, setChronicConditions)
                                            }/>
                                        </div>

                                        <div className="form-field">
                                            <label>Status</label>
                                            <input
                                            placeholder='e.g. Active, Resolved'
                                            value={condition.status ?? ''}
                                            onChange={(e) =>
                                                handleChange(index, "status", e.target.value, chronicConditions, setChronicConditions)
                                            }/>
                                        </div>

                                        <div className="form-field">
                                            <label>
                                                Additional Notes
                                                {renderPdfChronicWarningIcon(
                                                    index,
                                                    'notesChronicConditions'
                                                )}
                                            </label>
                                            <input
                                            value={condition.notesChronicConditions}
                                            onChange={(e) =>
                                                handleChange(index, "notesChronicConditions", e.target.value, chronicConditions, setChronicConditions)
                                            }/>
                                        </div>

                                        {chronicConditions.length > 1 && (
                                            <button
                                                className = "remove-button"
                                                type="button"
                                                onClick={() =>
                                                    handleRemoveRepeaterSection('chronic', index, chronicConditions, setChronicConditions)
                                                  }>
                                                Remove Chronic Condition
                                            </button>
                                        )}
                                    </Tab14RepeaterAccordion>
                                ))}

                                <button
                                    className = "add-section-button"
                                    type = "button"
                                    onClick={() =>
                                    handleAddRepeaterSection('chronic', chronicConditions, setChronicConditions, defaultChronicCondition)}>
                                    + Add Another Chronic Condition
                                </button>
                                    </>
                                )}

                            </div>
                        )}

                    {activeSection === 1 && (
                        <div className="tab14-section-card">
                            {ehrDocumentType === 'epic' &&
                            (epicSectionOccurrencesByKey.pastEncounters?.length ?? 0) > 0 ? (
                                renderEpicSectionMultiHit('pastEncounters', 'Encounter Details')
                            ) : (
                                <>
                            <p className="tab14-panel-sub" style={{ marginTop: 0 }}>
                                Fill these fields to populate the Health Overview “Patient Hospital” card.
                            </p>
                            {hospitalVisits.length > 0 && (
                                <Tab14RepeaterToolbar
                                    onExpandAll={() =>
                                        setAllRepeaterAccordion('hospitalVisit', hospitalVisits.length, true)
                                    }
                                    onCollapseAll={() =>
                                        setAllRepeaterAccordion('hospitalVisit', hospitalVisits.length, false)
                                    }
                                />
                            )}
                            {hospitalVisits.map((visit, index) => (
                                <Tab14RepeaterAccordion
                                    key={index}
                                    sectionKey="hospitalVisit"
                                    index={index}
                                    title={repeaterRowTitle(
                                        'hospitalVisit',
                                        index,
                                        visit.facilityName || visit.visitType || visit.reason
                                    )}
                                    isOpen={isRepeaterAccordionOpen(repeaterAccordionOpen, 'hospitalVisit', index)}
                                    onToggle={() => toggleRepeaterAccordion('hospitalVisit', index)}
                                >
                                    <div className="form-field">
                                        <label>
                                            Type
                                            {renderPdfHospitalWarningIcon('visitType')}
                                        </label>
                                        <input
                                            placeholder='e.g. Recent admission, ER, outpatient'
                                            value={visit.visitType}
                                            onChange={(e) =>
                                                handleChange(index, 'visitType', e.target.value, hospitalVisits, setHospitalVisits)
                                            }
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>
                                            Facility
                                            {renderPdfHospitalWarningIcon('facilityName')}
                                        </label>
                                        <input
                                            value={visit.facilityName}
                                            onChange={(e) =>
                                                handleChange(index, 'facilityName', e.target.value, hospitalVisits, setHospitalVisits)
                                            }
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>
                                            Reason
                                            {renderPdfHospitalWarningIcon('reason')}
                                        </label>
                                        <input
                                            value={visit.reason}
                                            onChange={(e) =>
                                                handleChange(index, 'reason', e.target.value, hospitalVisits, setHospitalVisits)
                                            }
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>
                                            Date
                                            {renderPdfHospitalWarningIcon('visitDate')}
                                        </label>
                                        <GlassDateInput
                                            value={visit.visitDate}
                                            onChange={(iso) =>
                                                handleChange(index, 'visitDate', iso, hospitalVisits, setHospitalVisits)
                                            }
                                            max={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>
                                            Discharge
                                            {renderPdfHospitalWarningIcon('dischargeDate')}
                                        </label>
                                        <GlassDateInput
                                            value={visit.dischargeDate}
                                            onChange={(iso) =>
                                                handleChange(index, 'dischargeDate', iso, hospitalVisits, setHospitalVisits)
                                            }
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>
                                            Attending
                                            {renderPdfHospitalWarningIcon('attendingPhysician')}
                                        </label>
                                        <input
                                            value={visit.attendingPhysician}
                                            onChange={(e) =>
                                                handleChange(index, 'attendingPhysician', e.target.value, hospitalVisits, setHospitalVisits)
                                            }
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>
                                            ReportId
                                            {renderPdfHospitalWarningIcon('reportId')}
                                        </label>
                                        <input
                                            value={visit.reportId}
                                            onChange={(e) =>
                                                handleChange(index, 'reportId', e.target.value, hospitalVisits, setHospitalVisits)
                                            }
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>Encounter ID</label>
                                        <input
                                            value={visit.encounterId ?? ''}
                                            onChange={(e) =>
                                                handleChange(index, 'encounterId', e.target.value, hospitalVisits, setHospitalVisits)
                                            }
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>Location</label>
                                        <input
                                            placeholder='e.g. ELP_ACWHP - Mesa'
                                            value={visit.location ?? ''}
                                            onChange={(e) =>
                                                handleChange(index, 'location', e.target.value, hospitalVisits, setHospitalVisits)
                                            }
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>Encounter start</label>
                                        <input
                                            placeholder='MM/DD/YYYY HH:MM:SS'
                                            value={visit.startDateTime ?? ''}
                                            onChange={(e) =>
                                                handleChange(index, 'startDateTime', e.target.value, hospitalVisits, setHospitalVisits)
                                            }
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>Encounter closed</label>
                                        <input
                                            placeholder='MM/DD/YYYY HH:MM:SS'
                                            value={visit.closedDateTime ?? ''}
                                            onChange={(e) =>
                                                handleChange(index, 'closedDateTime', e.target.value, hospitalVisits, setHospitalVisits)
                                            }
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>SNOMED-CT</label>
                                        <input
                                            value={visit.snomed ?? ''}
                                            onChange={(e) =>
                                                handleChange(index, 'snomed', e.target.value, hospitalVisits, setHospitalVisits)
                                            }
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>ICD-10</label>
                                        <input
                                            value={visit.icd10 ?? ''}
                                            onChange={(e) =>
                                                handleChange(index, 'icd10', e.target.value, hospitalVisits, setHospitalVisits)
                                            }
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>IMO code</label>
                                        <input
                                            value={visit.imo ?? ''}
                                            onChange={(e) =>
                                                handleChange(index, 'imo', e.target.value, hospitalVisits, setHospitalVisits)
                                            }
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>Diagnosis note</label>
                                        <textarea
                                            rows={3}
                                            value={visit.diagnosisNote ?? ''}
                                            onChange={(e) =>
                                                handleChange(index, 'diagnosisNote', e.target.value, hospitalVisits, setHospitalVisits)
                                            }
                                        />
                                    </div>
                                    {hospitalVisits.length > 1 && (
                                        <button
                                            className="remove-button"
                                            type="button"
                                            onClick={() =>
                                                handleRemoveRepeaterSection('hospitalVisit', index, hospitalVisits, setHospitalVisits)
                                            }
                                        >
                                            Remove Hospital Visit
                                        </button>
                                    )}
                                </Tab14RepeaterAccordion>
                            ))}
                            <button
                                className="add-section-button"
                                type="button"
                                onClick={() =>
                                    handleAddRepeaterSection('hospitalVisit', hospitalVisits, setHospitalVisits, defaultHospitalVisit)
                                }
                            >
                                + Add Another Hospital Visit
                            </button>
                                </>
                            )}
                        </div>
                    )}

                                </fieldset>
                        )}

                    {(() => {
                        const activeNav = tab14Sections.find((s) => s.id === activeSection);
                        if (!activeNav || activeNav.legacy) return null;
                        const key = activeNav.key as Tab14ExtendedSectionKey;
                        if (
                            ehrDocumentType === 'epic' &&
                            key === 'patientInstructions' &&
                            epicNoteFromClinicOccurrences.length > 0
                        ) {
                            return (
                                <div className="tab14-section-card">
                                    <EpicNoteFromClinicOccurrencesPanel
                                        occurrences={epicNoteFromClinicOccurrences}
                                        openMap={epicNoteFromClinicOpen}
                                        setOpenMap={setEpicNoteFromClinicOpen}
                                        setOccurrences={setEpicNoteFromClinicOccurrences}
                                        onOccurrencesChange={(next) => {
                                            setExtendedSections((prev) => ({
                                                ...prev,
                                                patientInstructions: next.map((src) => ({
                                                    title: `Note from ${src.fields.clinicName || 'Clinic'}`,
                                                    detail: src.fields.body || '',
                                                    date: src.intakeDateIso || '',
                                                    recordedBy: src.fields.sharedWith
                                                        ? `Shared with ${src.fields.sharedWith}`
                                                        : '',
                                                    place: src.fields.clinicName || '',
                                                    time: '',
                                                    notes: src.visitType || '',
                                                    noteType:
                                                        src.intakeDateKind === 'generated'
                                                            ? 'Cover disclaimer'
                                                            : 'Visit reprint',
                                                    status:
                                                        src.source === 'inferredReprint'
                                                            ? 'inferred'
                                                            : 'parsed',
                                                })),
                                            }));
                                        }}
                                    />
                                </div>
                            );
                        }
                        const epicTitle = ehrSidebarNavLabel(activeNav, ehrDocumentType);
                        if (
                            ehrDocumentType === 'epic' &&
                            (epicSectionOccurrencesByKey[key]?.length ?? 0) > 0
                        ) {
                            return (
                                <div className="tab14-section-card">
                                    {renderEpicSectionMultiHit(key, epicTitle)}
                                </div>
                            );
                        }
                        return (
                            <Tab14ExtendedSectionPanel
                                sectionKey={key}
                                title={epicTitle}
                                entries={extendedSections[key] ?? []}
                                canEdit={canEditPatientRecords}
                                onChange={(next) =>
                                    setExtendedSections((prev) => ({ ...prev, [key]: next }))
                                }
                            />
                        );
                    })()}

                                </div>

                                <div className="tab14-panel-footer">

                    <div className = "bottom-buttons">

                        <button
                            className = "save-button"
                            type = "button"
                            onClick = {() => void saveForm()}
                            disabled={saving || !authReady}
                        >
                            {saving ? t('patientIntake.saving') : t('patientIntake.save')}
                        </button>

                        <span
                            className={`tab14-clear-tooltip-host${canEditPatientRecords ? '' : ' tab14-clear-tooltip-host--locked'}`}
                            onMouseEnter={() => {
                                if (!canEditPatientRecords) setClearFormHintVisible(true);
                            }}
                            onMouseLeave={() => setClearFormHintVisible(false)}
                            onFocus={() => {
                                if (!canEditPatientRecords) setClearFormHintVisible(true);
                            }}
                            onBlur={() => setClearFormHintVisible(false)}
                        >
                            <button
                                className={`clear-button${canEditPatientRecords ? '' : ' clear-button--staff-locked'}`}
                                type="button"
                                onClick={() => {
                                    if (!canEditPatientRecords) return;
                                    clearForm();
                                }}
                                aria-disabled={!canEditPatientRecords}
                                title={
                                    canEditPatientRecords
                                        ? undefined
                                        : t('patientIntake.clearFormStaffHint')
                                }
                            >
                                {t('patientIntake.clearForm')}
                            </button>
                            {!canEditPatientRecords && clearFormHintVisible && (
                                <span className="tab14-clear-tooltip-popup" role="tooltip">
                                    {t('patientIntake.clearFormStaffHint')}
                                </span>
                            )}
                        </span>

                    </div>

                    <div className = "form"> 
                        {saveErrorMessage && (
                            <span className = "save-error-message">
                                Unable to save. Upload a PDF or ensure{' '}
                                <strong>Given Name</strong>, <strong>Family Name</strong>, and{' '}
                                <strong>Date of Birth</strong> are filled (Patient Information
                                section).
                            </span>
                        )}
                        {backendError && (
                            <span className = "save-error-message" style={{ display: 'block', marginTop: 8 }}>
                                {backendError}
                            </span>
                        )}
                        {intakeCompletenessNotice && (
                            <div className="tab14-intake-completeness" role="status">
                                <p>{intakeCompletenessNotice}</p>
                                {athenaPortabilityScore &&
                                    athenaPortabilityScore.gapLabels.length > 0 && (
                                    <ul className="tab14-athena-gap-list">
                                        {athenaPortabilityScore.sections
                                            .filter(
                                                (s) =>
                                                    s.status === 'missing' ||
                                                    s.status === 'thin'
                                            )
                                            .map((s) => (
                                                <li key={s.id}>
                                                    <span
                                                        className={`tab14-athena-gap-badge tab14-athena-gap-badge--${s.status}`}
                                                    >
                                                        {s.status}
                                                    </span>
                                                    <strong>{s.label}</strong>
                                                    <span className="tab14-athena-gap-detail">
                                                        {s.detail}
                                                    </span>
                                                </li>
                                            ))}
                                    </ul>
                                )}
                                {evaluatePatientFieldReviewGate(
                                    pdfFieldWarnings,
                                    pdfFieldReview,
                                    {
                                        allergies: pdfAllergyWarnings,
                                        medications: pdfMedicationWarnings,
                                        chronic: pdfChronicWarnings,
                                        insurances: pdfInsuranceWarnings,
                                        hospital: pdfHospitalWarnings,
                                        decisions: pdfIndexedReview,
                                    }
                                ).unresolvedCount > 0 ? (
                                    <button
                                        type="button"
                                        className="tab14-pdf-review-btn tab14-pdf-review-btn--accept"
                                        onClick={() => {
                                            const next = acceptAllPatientFieldWarnings(
                                                pdfFieldWarnings,
                                                pdfFieldReview,
                                                {
                                                    allergies: pdfAllergyWarnings,
                                                    medications: pdfMedicationWarnings,
                                                    chronic: pdfChronicWarnings,
                                                    insurances: pdfInsuranceWarnings,
                                                    hospital: pdfHospitalWarnings,
                                                    decisions: pdfIndexedReview,
                                                }
                                            );
                                            setPdfFieldWarnings(next.warnings);
                                            setPdfFieldReview(next.decisions);
                                            setPdfIndexedReview(next.indexedDecisions);
                                            setPdfAllergyWarnings(next.allergies);
                                            setPdfMedicationWarnings(next.medications);
                                            setPdfChronicWarnings(next.chronic);
                                            setPdfInsuranceWarnings(next.insurances);
                                            setPdfHospitalWarnings(next.hospital);
                                        }}
                                    >
                                        Accept all flagged fields
                                    </button>
                                ) : null}
                            </div>
                        )}
                        {labSaveNotice && (
                            <span
                                className="tab14-upload-parse"
                                style={{ display: 'block', marginTop: 8 }}
                            >
                                {labSaveNotice}
                            </span>
                        )}
                    </div>

                    {saveMessage && 
                    <div className = "saved-message">
                        {t('patientIntake.dataSaved')}
                    </div>}

                    </div>

                            </div>
                        </div>
                    </main>
                </div>

                {showUnsavedLeavePrompt && (
                    <div className="tab14-unsaved-modal" role="presentation">
                        <div
                            className="tab14-unsaved-modal__panel"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="tab14-unsaved-title"
                        >
                            <h2 id="tab14-unsaved-title">Unsaved changes</h2>
                            <p>You have modified patient information. What would you like to do before leaving this page?</p>
                            <div className="tab14-unsaved-modal__actions">
                                <button
                                    type="button"
                                    className="tab14-unsaved-modal__btn tab14-unsaved-modal__btn--primary"
                                    onClick={() => void saveAndLeavePage()}
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                    type="button"
                                    className="tab14-unsaved-modal__btn tab14-unsaved-modal__btn--danger"
                                    onClick={leaveWithoutSaving}
                                    disabled={saving}
                                >
                                    Dont save
                                </button>
                                <button
                                    type="button"
                                    className="tab14-unsaved-modal__btn tab14-unsaved-modal__btn--secondary"
                                    onClick={() => {
                                        setShowUnsavedLeavePrompt(false);
                                        setPendingLeaveUrl(null);
                                    }}
                                    disabled={saving}
                                >
                                    Go back
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </IonContent>
        </IonPage>
    );

};

export default Tab14; 