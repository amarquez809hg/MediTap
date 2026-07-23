import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './Tab14.css';
import './Tab5.css';
import { useLocation } from 'react-router-dom';
import { GlassDateInput } from '../components/GlassDatePicker';
import { useAuth } from '../contexts/AuthContext';
import { markOnboardingStep } from '../onboarding/onboardingStorage';
import { getMeditapRecordEditorRole } from '../config/meditap-roles';
import { clearTab14DraftKeysOnly } from '../auth/clearWorkflowLocalState';
import { getAccessTokenPayload } from '../auth/accessTokenClaims';
import {
    clearMeditapIntakeElevation,
    isMeditapIntakeElevationValidForPatient,
    setMeditapIntakeElevationToken,
} from '../auth/staffElevationStorage';
import { staffElevateErrorMessage } from '../auth/staffElevateErrorMessage';
import {
    loadTab14FromBackend,
    requestPatientIntakeStaffElevation,
    saveTab14ToBackend,
    createPatientLabPanel,
    updatePatientLabPanel,
    deletePatientLabPanel,
    fetchPatientLabPanels,
    type PatientLabPanelWriteBody,
    type Tab14LoadResult,
} from '../api';
import { parseTab14IntakeDocument } from '../intake/tab14DocumentParse';
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
} from '../intake/tab14IntakeTypes';
import { emptyInsuranceRow } from '../intake/tab14IntakeTypes';
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
    dateOfBirth: string;
    bloodType: string;
    email: string;
    additionalEmails: string[];
    phoneNumber: string;
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
};
interface HospitalVisit {
    facilityName: string;
    visitType: string;
    reason: string;
    visitDate: string;
    dischargeDate: string;
    attendingPhysician: string;
    reportId: string;
};
interface ChronicCondition {
    conditionName: string;
    icdCode: string;
    diagnosisDate: string;
    severity: string;
    prexisting: string;
    notesChronicConditions: string;
};

// initializing 
const defaultPatientInfo: PatientInfo = { 
    givenName: '',
    familyName: '',
    dateOfBirth: '',
    bloodType: '', 
    email: '',
    additionalEmails: [],
    phoneNumber: '',
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
};
const defaultInsurance: Insurance = emptyInsuranceRow();
const defaultAllergy: Allergy = {
    allergyName: '', 
    allergyType: '',
    allergyTypeOther: '',
    severity: '', 
    reactionNotes:'', 
    lastObserved: '',
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
};
const defaultHospitalVisit: HospitalVisit = {
    facilityName: '',
    visitType: '',
    reason: '',
    visitDate: '',
    dischargeDate: '',
    attendingPhysician: '',
    reportId: '',
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
};

/** Demo / QA: fills every Tab14 field without overwriting empty defaults used by Clear. */
const samplePatientInfo: PatientInfo = {
    givenName: 'Jordan',
    familyName: 'Rivera',
    dateOfBirth: '1990-03-15',
    bloodType: 'O+',
    email: 'jordan.rivera@example.com',
    additionalEmails: ['jordan.alt@example.com'],
    phoneNumber: '555-201-8844',
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
    allergyName: 'Penicillin',
    allergyType: 'Drug',
    allergyTypeOther: '',
    severity: 'High',
    reactionNotes: 'Hives, localized swelling, and shortness of breath within 30 minutes.',
    lastObserved: '2022-06-10',
};

const sampleMedication: Medication = {
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

const TAB14_SECTIONS: { id: number; labelKey: string; icon: string }[] = [
    { id: 0, labelKey: 'patientIntake.sections.patientInfo', icon: 'fa-id-card' },
    { id: 6, labelKey: 'patientIntake.sections.vitals', icon: 'fa-heartbeat' },
    { id: 1, labelKey: 'patientIntake.sections.hospitalVisit', icon: 'fa-hospital' },
    { id: 2, labelKey: 'patientIntake.sections.allergies', icon: 'fa-exclamation-triangle' },
    { id: 3, labelKey: 'patientIntake.sections.medications', icon: 'fa-pills' },
    { id: 4, labelKey: 'patientIntake.sections.insurance', icon: 'fa-file-medical' },
    { id: 5, labelKey: 'patientIntake.sections.chronicConditions', icon: 'fa-notes-medical' },
    { id: 7, labelKey: 'patientIntake.sections.labResults', icon: 'fa-flask' },
];

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
    if (Object.keys(b.patientFields).length) chips.push('Patient info');
    if (b.noKnownDrugAllergies) chips.push('NKDA (no known drug allergies)');
    else if (b.allergies.length) chips.push(`Allergies (${b.allergies.length})`);
    if (b.medications.length) chips.push(`Medications (${b.medications.length})`);
    if (b.insurances.length) chips.push('Insurance');
    if (b.chronicConditions.length) chips.push(`Chronic (${b.chronicConditions.length})`);
    if (Object.keys(b.hospitalVisit).length) chips.push('Hospital visit');
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


function splitUploadedAtStamp(stamp: string): { date: string; time: string } {
    const comma = stamp.indexOf(", ");
    if (comma < 0) return { date: stamp, time: "" };
    return { date: stamp.slice(0, comma), time: stamp.slice(comma + 2) };
}


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
    allergy: 'Allergy',
    medication: 'Medication',
    chronic: 'Chronic Condition',
    hospitalVisit: 'Hospital Visit',
    labResult: 'Lab Result',
};

function repeaterRowTitle(section: Tab14RepeaterSection, index: number, detail?: string) {
    const base = REPEATER_SECTION_LABELS[section];
    const trimmed = detail?.trim();
    if (trimmed) return `${base} - ${trimmed}`;
    return `${base} ${index + 1}`;
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

type UploadedFileEntry = {
    id: string;
    file: File;
    previewUrl: string;
    uploadedAt: string;
    parseStatus?: string;
};

const Tab14: React.FC = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const { username, hasRealmRole, authReady } = useAuth();
    const recordEditorRole = getMeditapRecordEditorRole();
    const hasEditorRealmRole = hasRealmRole(recordEditorRole);

    const [staffModalOpen, setStaffModalOpen] = useState(false);
    const [staffUsername, setStaffUsername] = useState('');
    const [staffPassword, setStaffPassword] = useState('');
    const [staffSubmitting, setStaffSubmitting] = useState(false);
    const [staffModalError, setStaffModalError] = useState<string | null>(null);
    const [elevationNonce, setElevationNonce] = useState(0);

    const kcParsedTab14 = getAccessTokenPayload() ?? undefined;
    const patientSub =
        typeof kcParsedTab14?.sub === 'string' ? kcParsedTab14.sub : undefined;

    const canEditPatientRecords =
        hasEditorRealmRole || isMeditapIntakeElevationValidForPatient(patientSub);

    const staffElevationActive =
        !hasEditorRealmRole && isMeditapIntakeElevationValidForPatient(patientSub);

    const submitStaffModal = async (e: React.FormEvent) => {
        e.preventDefault();
        setStaffModalError(null);
        setStaffSubmitting(true);
        try {
            const res = await requestPatientIntakeStaffElevation(
                staffUsername.trim(),
                staffPassword
            );
            setMeditapIntakeElevationToken(res.elevation_token);
            setStaffPassword('');
            setStaffModalOpen(false);
            setElevationNonce((n) => n + 1);
        } catch (err) {
            setStaffModalError(staffElevateErrorMessage(err));
        } finally {
            setStaffSubmitting(false);
        }
    };

    // useStates // 

    //file handling 
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFileEntry[]>([]); 
    // error handling 
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [activeSection, setActiveSection] = useState(0);

    useEffect(() => {
        const section = new URLSearchParams(location.search).get('section');
        if (section === 'vitals') {
            setActiveSection(6);
        }
    }, [location.search]);

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
        window.location.assign(url);
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
            bundle.medications.length > 0 ? bundle.medications : [defaultMedication]
        );
        setChronicConditions(
            bundle.chronicConditions.length > 0
                ? bundle.chronicConditions
                : [defaultChronicCondition]
        );
        setHospitalVisits(mapStoredHospitalVisits(bundle.hospitalVisits));
        setNoAllergies(bundle.noAllergies);
        setNoMedications(bundle.medications.length === 0);
        setNoChronicConditions(bundle.chronicConditions.length === 0);
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
            if (entry) URL.revokeObjectURL(entry.previewUrl);
            return prev.filter((row) => row.id !== id);
        });
    };

    const clearAllPdfWarnings = () => {
        setPdfFieldWarnings(undefined);
        setPdfChronicWarnings(undefined);
        setPdfInsuranceWarnings(undefined);
        setPdfAllergyWarnings(undefined);
        setPdfMedicationWarnings(undefined);
        setPdfHospitalWarnings(undefined);
    };

    const clearUploadedFiles = () => {
        setUploadedFiles((prev) => {
            prev.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
            return [];
        });
        setUploadParseMessage(null);
        clearAllPdfWarnings();
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

        if (selected.some((file) => !isTab14UploadFileType(file))) {
            setUploadParseMessage(t('patientIntake.uploadFileTypeError'));
            e.target.value = '';
            return;
        }

        setUploadParsing(true);
        setUploadParseMessage(null);

        let snapshot = buildMergeSnapshot();
        let patientFromUpload: Tab14PatientFields = {};
        let warningsFromUpload: Tab14PatientFieldWarnings | undefined;
        let anyHardToRead = false;
        const hardToReadByBundle: boolean[] = [];
        const parsedBundles: Tab14IntakeParseResult[] = [];
        const fileMessages: string[] = [];
        const newEntries: UploadedFileEntry[] = [];

        try {
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
                const hardToRead = extracted.hardToRead;
                if (hardToRead) anyHardToRead = true;
                hardToReadByBundle.push(hardToRead);
                const parsedBundle = parseTab14IntakeDocument(extracted.text);
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
                if (hardToRead) {
                    uploadMsg +=
                        ' Document text looked sparse or hard to read — verify imported fields.';
                }
                fileMessages.push(uploadMsg);

                newEntries.push({
                    id: `${Date.now()}-${index}-${file.name}`,
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
            if (Object.keys(patientFromUpload).length > 0) {
                setPatientInfo({
                    ...defaultPatientInfo,
                    ...patientFromUpload,
                    additionalEmails: patientFromUpload.additionalEmails ?? [],
                });
                if ((patientFromUpload.additionalEmails ?? []).length > 0) {
                    setAddAnotherEmail(true);
                }
                setActiveSection(0);
            }
            setPdfFieldWarnings(warningsFromUpload);
            // Prefer hard-to-read from the last identity-bearing upload; otherwise any hard-to-read file.
            const identityHardToRead = parsedBundles.some(
                (bundle, i) => bundleHasPatientIdentity(bundle) && hardToReadByBundle[i]
            );
            const sectionHardToRead = identityHardToRead || anyHardToRead;
            setPdfChronicWarnings(
                buildChronicConditionWarnings(snapshot.chronicConditions, sectionHardToRead)
            );
            setPdfInsuranceWarnings(
                buildInsuranceRowWarnings(snapshot.insurances, sectionHardToRead)
            );
            setPdfAllergyWarnings(
                buildAllergyRowWarnings(snapshot.allergies, sectionHardToRead)
            );
            setPdfMedicationWarnings(
                buildMedicationRowWarnings(snapshot.medications, sectionHardToRead)
            );
            const lastHospital = snapshot.hospitalVisits[snapshot.hospitalVisits.length - 1] ?? {};
            setPdfHospitalWarnings(
                buildHospitalFieldWarnings(lastHospital, sectionHardToRead)
            );
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
        }
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
        if (!patientInfo.dateOfBirth) newErrors.dateOfBirth = "Date of Birth is required.";

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
                !patientInfo.dateOfBirth
            ) {
                setActiveSection(0);
            }
            return false;
        }

        setSaveErrorMessage(false);
        setBackendError(null);
        setLabSaveNotice(null);
        setSaving(true);
        try {
            await saveTab14ToBackend({
                username,
                patient: patientInfo,
                insurances,
                allergies: noAllergies ? [] : allergies,
                medications: noMedications ? [] : medications,
                chronicConditions: noChronicConditions ? [] : chronicConditions,
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
                            'Chart saved. Lab results need staff sign-in to persist — use Staff sign-in and Save again.'
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
                        ? refreshed.chronicConditions.length === 0
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
        navigateAwayFromTab14(destination);
    };

    const leaveWithoutSaving = () => {
        if (!pendingLeaveUrl) return;
        const destination = pendingLeaveUrl;
        setSavedFormSnapshot(formSnapshot);
        setShowUnsavedLeavePrompt(false);
        setPendingLeaveUrl(null);
        navigateAwayFromTab14(destination);
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
        setRemovedLabPanelServerIds([]);
        setLabSaveNotice(null);
        setNoAllergies(false);
        setNoMedications(false);
        setNoChronicConditions(false);
        setPdfFieldWarnings(undefined);
        setPdfChronicWarnings(undefined);
        setPdfInsuranceWarnings(undefined);
        setPdfAllergyWarnings(undefined);
        setPdfMedicationWarnings(undefined);
        setPdfHospitalWarnings(undefined);
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
        setPdfChronicWarnings(undefined);
        setPdfInsuranceWarnings(undefined);
        setPdfAllergyWarnings(undefined);
        setPdfMedicationWarnings(undefined);
        setPdfHospitalWarnings(undefined);
    };

    const renderPdfFieldWarningIcon = (field: Tab14PatientFieldKey) => {
        const warning = pdfFieldWarnings?.[field];
        if (!warning) return null;
        const message = warning.message || FIELD_WARNING_MESSAGES.VERIFY_GENERIC;
        return (
            <span
                className="tab14-pdf-field-warning"
                title={message}
                aria-label={message}
                role="img"
            >
                <IonIcon icon={warningOutline} aria-hidden />
            </span>
        );
    };

    const renderIndexedWarningIcon = (
        warning: { message: string } | undefined
    ) => {
        if (!warning) return null;
        const message = warning.message || FIELD_WARNING_MESSAGES.VERIFY_GENERIC;
        return (
            <span
                className="tab14-pdf-field-warning"
                title={message}
                aria-label={message}
                role="img"
            >
                <IonIcon icon={warningOutline} aria-hidden />
            </span>
        );
    };

    const renderPdfChronicWarningIcon = (
        index: number,
        field: Tab14ChronicFieldKey
    ) => renderIndexedWarningIcon(pdfChronicWarnings?.[index]?.[field]);

    const renderPdfInsuranceWarningIcon = (
        index: number,
        field: Tab14InsuranceFieldKey
    ) => renderIndexedWarningIcon(pdfInsuranceWarnings?.[index]?.[field]);

    const renderPdfAllergyWarningIcon = (
        index: number,
        field: Tab14AllergyFieldKey
    ) => renderIndexedWarningIcon(pdfAllergyWarnings?.[index]?.[field]);

    const renderPdfMedicationWarningIcon = (
        index: number,
        field: Tab14MedicationFieldKey
    ) => renderIndexedWarningIcon(pdfMedicationWarnings?.[index]?.[field]);

    const renderPdfHospitalWarningIcon = (field: Tab14HospitalFieldKey) =>
        renderIndexedWarningIcon(pdfHospitalWarnings?.[field]);

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
    }, [authReady, username, elevationNonce, canEditPatientRecords]);

    const renderPatientVitalsFields = () => (
        <>
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

    return (
        <IonPage className="ct-page ct-tab14">
            <IonContent>
                <div className="chronic-conditions-container tab14-add-patient">
                    <header className="chronic-conditions-header">
                        <h1>
                            <i className="fas fa-user-plus" aria-hidden /> {t('patientIntake.title')}
                        </h1>
                        <div className="tab14-header-actions">
                            <button
                                type="button"
                                className="tab14-sample-data-btn"
                                onClick={loadSampleData}
                                disabled={!canEditPatientRecords}
                            >
                                <i className="fas fa-flask" aria-hidden />
                                {t('patientIntake.loadSample')}
                            </button>
                            <button type="button" className="book-btn">
                                <a
                                    href="/tab1"
                                    onClick={() => {
                                        if (staffElevationActive) {
                                            clearMeditapIntakeElevation();
                                            setElevationNonce((n) => n + 1);
                                        }
                                    }}
                                >
                                    <i className="fas fa-arrow-left" aria-hidden />
                                    {t('common.goBackToDashboard')}
                                </a>
                            </button>
                        </div>
                    </header>

                    <main className="chronic-conditions-main tab14-master">
                        <div className="tab14-layout">
                            <aside className="tab14-sidebar" aria-label={t('patientIntake.sectionsAria')}>
                                <nav className="tab14-nav">
                                    {TAB14_SECTIONS.map((s) => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            className={`tab14-nav-item${activeSection === s.id ? ' active' : ''}`}
                                            onClick={() => setActiveSection(s.id)}
                                        >
                                            <i className={`fas ${s.icon}`} aria-hidden />
                                            <span>{t(s.labelKey)}</span>
                                        </button>
                                    ))}
                                </nav>
                            </aside>
                            <div className="tab14-main-panel">
                                {loadingIntake && (
                                    <p className="tab14-loading-hint" role="status">
                                        {t('patientIntake.loadingRecord')}
                                    </p>
                                )}
                                {staffElevationActive && (
                                    <div className="tab14-staff-elevation-banner" role="status">
                                        <p>
                                            {t('patientIntake.staffActiveBanner')}
                                        </p>
                                        <button
                                            type="button"
                                            className="tab14-end-staff-btn"
                                            onClick={() => {
                                                clearMeditapIntakeElevation();
                                                setElevationNonce((n) => n + 1);
                                            }}
                                        >
                                            {t('common.endStaffMode')}
                                        </button>
                                    </div>
                                )}
                                {!canEditPatientRecords && (
                                    <div className="tab14-view-only-banner" role="status">
                                        <p>
                                            {t('patientIntake.viewOnlyBanner')}
                                        </p>
                                        <button
                                            type="button"
                                            className="tab14-staff-signin-btn"
                                            onClick={() => {
                                                setStaffModalError(null);
                                                setStaffModalOpen(true);
                                            }}
                                        >
                                            {t('common.staffSignIn')}
                                        </button>
                                    </div>
                                )}
                                <div className="tab14-panel-header">
                                    <h2>
                                        {t(
                                            TAB14_SECTIONS.find((s) => s.id === activeSection)?.labelKey ??
                                                'patientIntake.sections.patientInfo'
                                        )}
                                    </h2>
                                    <p className="tab14-panel-sub">
                                        {activeSection === 6
                                            ? t('patientIntake.vitalsPanelSub')
                                            : activeSection === 0
                                              ? t('patientIntake.demographicsSub')
                                              : t('patientIntake.defaultPanelSub')}
                                    </p>
                                </div>
                                <div className="tab14-panel-body">
                        {activeSection === 0 && (
                            <>
                                <fieldset
                                    className="tab14-record-fieldset"
                                    disabled={!canEditPatientRecords}
                                >
                            <div className="tab14-section-card">

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
                                        <option value="Divorced">Divorced</option>
                                        <option value="Widowed">Widowed</option>
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

                            </div>
                                </fieldset>
                            </>
                        )}

                        {activeSection === 6 && (
                            <div className="tab14-section-card tab14-vitals-section">
                                <div className="tab14-vitals-heading">
                                    <h3>{t('patientIntake.heightWeightHeading')}</h3>
                                    <p>
                                        {t('patientIntake.heightWeightSub')}
                                    </p>
                                </div>
                                {renderPatientVitalsFields()}
                            </div>
                        )}

                        {activeSection === 7 && (
                            <fieldset
                                className="tab14-record-fieldset"
                                disabled={!canEditPatientRecords}
                            >
                            <div className="tab14-section-card">
                                {!canEditPatientRecords && (
                                    <p className="tab14-panel-sub" style={{ marginTop: 0 }}>
                                        Staff sign-in is required to edit lab results.
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
                                                title={repeaterRowTitle(
                                                    'labResult',
                                                    index,
                                                    panel.testName || panel.displayCode || undefined
                                                )}
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
                            </div>
                            </fieldset>
                        )}

                        {activeSection >= 1 && activeSection <= 5 && (
                                <fieldset
                                    className="tab14-record-fieldset"
                                    disabled={!canEditPatientRecords}
                                >

                    {/* Insurance */}
                        {activeSection === 4 && (
                            <div className="tab14-section-card">
                                {insurances.map((insurance, index) => {
                                    const insuranceTitle = `${t('patientIntake.fields.insuranceN', { n: index + 1 })}${
                                        insurance.providerName.trim()
                                            ? ` — ${insurance.providerName.trim()}`
                                            : ''
                                    }`;
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
                                        <label>Severity</label>
                                        <select
                                        value={allergy.severity}
                                        onChange={(e) =>
                                            handleChange(index, "severity", e.target.value, allergies, setAllergies)
                                        }>
                                            {ALLERGY_SEVERITY_OPTIONS.map((opt) => (
                                                <option key={opt.value || 'blank'} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
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
                                        <label>Last observed</label>
                                        <GlassDateInput
                                            value={allergy.lastObserved}
                                            onChange={(iso) =>
                                                handleChange(index, 'lastObserved', iso, allergies, setAllergies)
                                            }
                                            max={new Date().toISOString().split('T')[0]}
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
                                            <label>Prescribing physician</label>
                                            <input
                                            value={med.prescribingPhysician}
                                            onChange={(e) =>
                                                handleChange(index, "prescribingPhysician", e.target.value, medications, setMedications)
                                            }/>
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
                                            setChronicConditions(checked ? [] : [defaultChronicCondition]);
                                            if (checked) setPdfChronicWarnings(undefined);
                                        }}
                                    />
                                    Click here if no known chronic conditions are present
                                </label>

                                {!noChronicConditions && chronicConditions.length > 0 && (
                                    <Tab14RepeaterToolbar
                                        onExpandAll={() =>
                                            setAllRepeaterAccordion('chronic', chronicConditions.length, true)
                                        }
                                        onCollapseAll={() =>
                                            setAllRepeaterAccordion('chronic', chronicConditions.length, false)
                                        }
                                    />
                                )}

                                {!noChronicConditions && chronicConditions.map((condition, index) => (
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

                            </div>
                        )}

                    {activeSection === 1 && (
                        <div className="tab14-section-card">
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
                        </div>
                    )}

                                </fieldset>
                        )}

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

                    {/* Upload works for patients; Save is outside fieldset so it stays clickable */}
                    <div className = "file-upload-section">
                        <label className = "file-upload-label">
                            {t('patientIntake.uploadFile')}
                            <input type = "file" multiple accept = ".pdf,.jpeg,.jpg,.png,application/pdf,image/jpeg,image/png" onChange = {handleFileUpload} disabled={uploadParsing} /> 
                        </label>
                        {uploadParsing && (
                            <p className="tab14-upload-parse tab14-upload-parse--muted">{t('patientIntake.readingDocument')}</p>
                        )}
                        {!uploadParsing && uploadParseMessage && uploadedFiles.length === 0 && (
                            <p className="tab14-upload-parse">{uploadParseMessage}</p>
                        )}

                        {uploadedFiles.length > 0 && (
                        <div className="file-preview-list">
                            <div className="file-preview-row file-preview-row--head" aria-hidden="true">
                                <span className="file-preview-cell file-preview-cell--name">Name</span>
                                <span className="file-preview-cell file-preview-cell--size">Size</span>
                                <span className="file-preview-cell file-preview-cell--uploaded">Uploaded</span>
                                <span className="file-preview-cell file-preview-cell--status">Import status</span>
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
                                    <span className="file-preview-cell file-preview-cell--size">
                                        {(entry.file.size / 1024).toFixed(2)} KB
                                    </span>
                                    <span className="file-preview-cell file-preview-cell--uploaded">
                                        {(() => {
                                            const { date, time } = splitUploadedAtStamp(entry.uploadedAt);
                                            return (
                                                <>
                                                    <span className="file-preview-uploaded-date">{date}</span>
                                                    {time ? (
                                                        <span className="file-preview-uploaded-time">{time}</span>
                                                    ) : null}
                                                </>
                                            );
                                        })()}
                                    </span>
                                    <span className="file-preview-cell file-preview-cell--status">
                                        {entry.parseStatus?.trim() || '-'}
                                    </span>
                                    <span className="file-preview-cell file-preview-cell--actions">
                                        {entry.file.type === 'application/pdf' ? (
                                            <button
                                                className="preview-button"
                                                type="button"
                                                onClick={() => window.open(entry.previewUrl, '_blank')}
                                            >
                                                Preview PDF
                                            </button>
                                        ) : entry.file.type.startsWith('image/') ? (
                                            <button
                                                className="preview-button preview-button--image"
                                                type="button"
                                                onClick={() => window.open(entry.previewUrl, '_blank')}
                                            >
                                                View Image
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

                {staffModalOpen && (
                    <div
                        className="tab14-staff-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="tab14-staff-modal-title"
                    >
                        <button
                            type="button"
                            className="tab14-staff-modal__backdrop"
                            aria-label={t('common.closeDialog')}
                            disabled={staffSubmitting}
                            onClick={() => {
                                if (!staffSubmitting) setStaffModalOpen(false);
                            }}
                        />
                        <div className="tab14-staff-modal__panel">
                            <h2 id="tab14-staff-modal-title">{t('common.staffSignIn')}</h2>
                            <p className="tab14-staff-modal__hint">
                                {t('patientIntake.staffModalHint')}
                            </p>
                            <form onSubmit={(e) => void submitStaffModal(e)}>
                                <div className="form-field">
                                    <label htmlFor="tab14-staff-user">{t('common.staffUsername')}</label>
                                    <input
                                        id="tab14-staff-user"
                                        name="username"
                                        autoComplete="username"
                                        value={staffUsername}
                                        onChange={(e) => setStaffUsername(e.target.value)}
                                        disabled={staffSubmitting}
                                    />
                                </div>
                                <div className="form-field">
                                    <label htmlFor="tab14-staff-pass">{t('common.password')}</label>
                                    <input
                                        id="tab14-staff-pass"
                                        name="password"
                                        type="password"
                                        autoComplete="current-password"
                                        value={staffPassword}
                                        onChange={(e) => setStaffPassword(e.target.value)}
                                        disabled={staffSubmitting}
                                    />
                                </div>
                                {staffModalError && (
                                    <p className="tab14-staff-modal__error">{staffModalError}</p>
                                )}
                                <div className="tab14-staff-modal__actions">
                                    <button
                                        type="button"
                                        className="tab14-staff-modal__btn tab14-staff-modal__btn--secondary"
                                        disabled={staffSubmitting}
                                        onClick={() => setStaffModalOpen(false)}
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        className="tab14-staff-modal__btn tab14-staff-modal__btn--primary"
                                        disabled={staffSubmitting}
                                    >
                                        {staffSubmitting ? t('common.signingIn') : t('common.unlockAndContinue')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </IonContent>
        </IonPage>
    );

};

export default Tab14; 