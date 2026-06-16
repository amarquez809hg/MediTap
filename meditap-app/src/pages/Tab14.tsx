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
    type Tab14LoadResult,
} from '../api';
import { parseTab14IntakeDocument } from '../intake/tab14DocumentParse';
import { mergeAllergiesFromPdf } from '../intake/mergeTab14Allergies';
import {
    hasHospitalVisitData,
    mergeChronicConditionsFromPdf,
    mergeHospitalVisitFromPdf,
    mergeInsurancesFromPdf,
    mergeMedicationsFromPdf,
} from '../intake/mergeTab14IntakeUpload';
import {
    applyTab14ParseBundle,
    formatTab14MergeStatsNotes,
    type Tab14MergeSnapshot,
} from '../intake/applyTab14ParseBundle';
import {
    loadTab14LegacyFromLocalStorage,
    tab14LegacyToSaveInput,
} from '../intake/tab14LegacyStorage';
import {
    extractTab14UploadFileText,
    isTab14UploadFileType,
} from '../intake/documentTextExtraction';
import {
    bmiCategoryLabel,
    computeBmiFromMetric,
    formatBmiDisplay,
    inchesToCm,
    lbsToKg,
} from '../vitals/bmi';
import {
    IonPage,
    IonContent
} from '@ionic/react';
import * as pdfjsLib from "pdfjs-dist";
import { GlobalWorkerOptions } from "pdfjs-dist";
import worker from "pdfjs-dist/build/pdf.worker.mjs?url";

GlobalWorkerOptions.workerSrc = `${worker}?v=nginx-mjs-mime`;

interface PatientInfo {
    givenName: string;
    familyName: string;
    dateOfBirth: string;
    bloodType: string;
    email: string;
    phoneNumber: string;
    address: string;
    race: string;
    ethnicity: string;
    preferredLanguage: string;
    maritalStatus: string;
    sexAtBirth: string;
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
    phoneNumber: '',
    address: '',
    race: '',
    ethnicity: '',
    preferredLanguage: '',
    maritalStatus: '',
    sexAtBirth:'',
    heightInches: '',
    weightLbs: '',
    systolicBp: '',
    diastolicBp: '',
    heartRate: '',
};
const defaultInsurance: Insurance = {
    providerName:'',
    policyNumber:'',
    planName: '', 
    memberID: '',
    groupNumber: '',
    startDate:'', 
    endDate:'',
};
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
    phoneNumber: '555-201-8844',
    address: '1200 Market St, San Francisco, CA 94103',
    race: 'Asian',
    ethnicity: 'Not Hispanic or Latino',
    preferredLanguage: 'English',
    maritalStatus: 'Married',
    sexAtBirth: 'Female',
    heightInches: '65',
    weightLbs: '148',
    systolicBp: '118',
    diastolicBp: '76',
    heartRate: '72',
};

const sampleInsurance: Insurance = {
    providerName: 'Blue Cross Blue Shield',
    policyNumber: 'POL-778821',
    planName: 'PPO Select Gold',
    memberID: 'MEM-009921',
    groupNumber: 'GRP-4400',
    startDate: '2024-01-01',
    endDate: '2025-12-31',
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
];

function summarizeTab14ParseResult(b: ReturnType<typeof parseTab14IntakeDocument>): string {
    const chips: string[] = [];
    if (Object.keys(b.patientFields).length) chips.push('Patient info');
    if (b.noKnownDrugAllergies) chips.push('NKDA (no known drug allergies)');
    else if (b.allergies.length) chips.push(`Allergies (${b.allergies.length})`);
    if (b.medications.length) chips.push(`Medications (${b.medications.length})`);
    if (b.insurances.length) chips.push('Insurance');
    if (b.chronicConditions.length) chips.push(`Chronic (${b.chronicConditions.length})`);
    if (Object.keys(b.hospitalVisit).length) chips.push('Hospital visit');
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

type UploadedFileEntry = {
    id: string;
    file: File;
    previewUrl: string;
    uploadedAt: string;
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
    const [uploadParseMessage, setUploadParseMessage] = useState<string | null>(null);
    const [uploadParsing, setUploadParsing] = useState(false);
    const [loadingIntake, setLoadingIntake] = useState(true);
    const [clearFormHintVisible, setClearFormHintVisible] = useState(false);
    const [savedFormSnapshot, setSavedFormSnapshot] = useState('');
    const [showUnsavedLeavePrompt, setShowUnsavedLeavePrompt] = useState(false);
    const [pendingLeaveUrl, setPendingLeaveUrl] = useState<string | null>(null);
    const suppressUnsavedPromptRef = useRef(false);

    const [patientInfo, setPatientInfo] = useState<PatientInfo>(defaultPatientInfo);
    const [insurances, setInsurances] = useState<Insurance[]>([defaultInsurance]);
    const [allergies, setAllergies] = useState<Allergy[]>([defaultAllergy]);
    const [medications, setMedications] = useState<Medication[]>([defaultMedication]);
    const [chronicConditions, setChronicConditions] = useState<ChronicCondition[]>([
        defaultChronicCondition,
    ]);
    const [hospitalVisit, setHospitalVisit] = useState<HospitalVisit>(defaultHospitalVisit);

    const formSnapshot = useMemo(
        () =>
            JSON.stringify({
                patientInfo,
                insurances,
                allergies,
                medications,
                chronicConditions,
                hospitalVisit,
                noAllergies,
                noMedications,
                noChronicConditions,
            }),
        [patientInfo, insurances, allergies, medications, chronicConditions, hospitalVisit, noAllergies, noMedications, noChronicConditions]
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
        setPatientInfo(bundle.patient);
        setInsurances(
            bundle.insurances.length > 0 ? bundle.insurances : [defaultInsurance]
        );
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
        setHospitalVisit(
            Object.values(bundle.hospitalVisit).some((v) => String(v).trim())
                ? bundle.hospitalVisit
                : defaultHospitalVisit
        );
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
        setHospitalVisit({
            ...defaultHospitalVisit,
            ...snapshot.hospitalVisit,
        });
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
        hospitalVisit: { ...defaultHospitalVisit, ...hospitalVisit },
    });

    const removeUploadedFile = (id: string) => {
        setUploadedFiles((prev) => {
            const entry = prev.find((row) => row.id === id);
            if (entry) URL.revokeObjectURL(entry.previewUrl);
            return prev.filter((row) => row.id !== id);
        });
    };

    const clearUploadedFiles = () => {
        setUploadedFiles((prev) => {
            prev.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
            return [];
        });
        setUploadParseMessage(null);
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

                const fullText = await extractTab14UploadFileText(file);
                const bundle = parseTab14IntakeDocument(fullText);
                const merged = applyTab14ParseBundle(snapshot, bundle);
                snapshot = merged.snapshot;

                let uploadMsg = summarizeTab14ParseResult(bundle);
                const mergeNotes = formatTab14MergeStatsNotes(merged.stats);
                if (mergeNotes.length > 0) {
                    uploadMsg += ` ${mergeNotes.join('; ')}.`;
                }
                fileMessages.push(`${file.name}: ${uploadMsg}`);

                newEntries.push({
                    id: `${Date.now()}-${index}-${file.name}`,
                    file,
                    previewUrl: URL.createObjectURL(file),
                    uploadedAt: new Date().toLocaleString(),
                });
            }

            applySnapshotToForm(snapshot);
            setUploadedFiles((prev) => [...prev, ...newEntries]);
            setUploadParseMessage(fileMessages.join('\n\n'));
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
    };

    const handleHospitalChange = (field: keyof HospitalVisit, value: string) => {
        setHospitalVisit((prev) => ({ ...prev, [field]: value }));
    };
    const handleChange = 
    <T,>(index: number, field: keyof T, value: string, array: T[], setArray: React.Dispatch<React.SetStateAction<T[]>>) => {
        const updated = [...array];
        updated[index] = { ...updated[index], [field]: value } as T;
        setArray(updated);
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
        setSaving(true);
        try {
            await saveTab14ToBackend({
                username,
                patient: patientInfo,
                insurances,
                allergies: noAllergies ? [] : allergies,
                medications: noMedications ? [] : medications,
                chronicConditions: noChronicConditions ? [] : chronicConditions,
                hospitalVisit,
                noAllergies,
                allowStaffOnlySections: canEditPatientRecords,
            });
            clearTab14DraftKeysOnly();
            const refreshed = await loadTab14FromBackend(username);
            if (refreshed.hasPatient) {
                applyTab14Bundle(refreshed);
            }
            setSavedFormSnapshot(formSnapshot);
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
        setInsurances([defaultInsurance]);
        setAllergies([defaultAllergy]);
        setMedications([defaultMedication]);
        setChronicConditions([defaultChronicCondition]);
        setHospitalVisit(defaultHospitalVisit);
        setNoAllergies(false);
        setNoMedications(false);
        setNoChronicConditions(false);
    };

    const loadSampleData = () => {
        setPatientInfo({ ...samplePatientInfo });
        setInsurances([{ ...sampleInsurance }]);
        setAllergies([{ ...sampleAllergy }]);
        setMedications([{ ...sampleMedication }]);
        setChronicConditions([{ ...sampleChronicCondition }]);
        setHospitalVisit({ ...sampleHospitalVisit });
        setNoAllergies(false);
        setNoMedications(false);
        setNoChronicConditions(false);
        setErrors({});
        setSaveErrorMessage(false);
        setBackendError(null);
    };

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
                                    <label>Given Name *</label>
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
                                    <label>Family Name *</label>
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
                                    <label>Date of Birth *</label>
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
                                    <label>Email </label>
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
                                
                                <div className = "form-field">
                                    <label> Phone Number </label>
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
                                    <label>Address</label>
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
                                    <label>Race</label>
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
                                    <label>Ethnicity</label>
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
                                    <label>Preferred Language</label>
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
                                    <label>Marital Status</label>
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
                                    <label>Blood Type</label>
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
                                    <label>Sex at Birth</label>
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

                        {activeSection >= 1 && activeSection <= 5 && (
                                <fieldset
                                    className="tab14-record-fieldset"
                                    disabled={!canEditPatientRecords}
                                >

                    {/* Insurance */}
                        {activeSection === 4 && (
                            <div className="tab14-section-card">
                                {insurances.map((insurance, index) => (
                                    <div key = {index} className = "section-block">

                                        <h3> Insurance {index + 1} </h3>

                                        <div className = "form-field"> 
                                            <label> Provider Name </label>
                                            <input value = {insurance.providerName}
                                            onChange={(e) => 
                                                handleChange(index, "providerName", e.target.value, insurances, setInsurances)
                                            }/>
                                        </div> 

                                        <div className="form-field">
                                            <label>Policy Number</label>
                                            <input
                                            value={insurance.policyNumber}
                                            onChange={(e) =>
                                                handleChange(index, "policyNumber", e.target.value, insurances, setInsurances)
                                            }/>
                                        </div>

                                        <div className="form-field">
                                            <label>Plan Name</label>
                                            <input
                                            value={insurance.planName}
                                            onChange={(e) =>
                                                handleChange(index, "planName", e.target.value, insurances, setInsurances)
                                            }/>
                                        </div>
                                        <div className="form-field">
                                            <label>Member ID</label>
                                            <input
                                            value={insurance.memberID}
                                            onChange={(e) =>
                                                handleChange(index, "memberID", e.target.value, insurances, setInsurances)
                                            }/>
                                        </div>
                                        <div className="form-field">
                                            <label>Group number</label>
                                            <input
                                            value={insurance.groupNumber}
                                            onChange={(e) =>
                                                handleChange(index, "groupNumber", e.target.value, insurances, setInsurances)
                                            }/>
                                        </div>
                                        <div className="form-field">
                                            <label>Start Date</label>
                                            <GlassDateInput
                                                value={insurance.startDate}
                                                onChange={(iso) =>
                                                    handleChange(index, 'startDate', iso, insurances, setInsurances)
                                                }
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>End Date</label>
                                            <GlassDateInput
                                                value={insurance.endDate}
                                                onChange={(iso) =>
                                                    handleChange(index, 'endDate', iso, insurances, setInsurances)
                                                }
                                            />
                                        </div>

                                        {/* Inavlid date range message*/}
                                        {errors[`insurance-${index}`] && (
                                            <span className="save-error-message">
                                                {errors[`insurance-${index}`]}
                                            </span>
                                        )}

                                        {/* Space to remove section*/}
                                            {insurances.length > 1 && (
                                            <button
                                            className="remove-button"
                                            type="button"
                                            onClick={() => handleRemoveSection(index, insurances, setInsurances)}>
                                                Remove Insurance
                                            </button>
                                        )}
                                    </div>
                                ))}

                                {/*Add another section*/}
                                <button
                                className="add-section-button"
                                type="button"
                                onClick={() =>
                                handleAddSection(insurances, setInsurances, defaultInsurance)
                                }>
                                    + Add Another Insurance
                                </button>

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

                                {!noAllergies && allergies.map((allergy, index) => (
                                    <div key={index} className="section-block">
                                    <h3>Allergy {index + 1}</h3>

                                    <div className="form-field">
                                        <label>Allergy Name</label>
                                        <input
                                        value={allergy.allergyName}
                                        onChange={(e) =>
                                            handleChange(index, "allergyName", e.target.value, allergies, setAllergies)
                                        }/>
                                    </div>

                                    <div className="form-field">
                                        <label>Type (e.g. food, drug)</label>
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
                                        onClick={() => handleRemoveSection(index, allergies, setAllergies)}>
                                        Remove Allergy
                                        </button>
                                    )}
                                    </div>
                                ))}

                                <button
                                    className="add-section-button"
                                    type="button"
                                    onClick={() => handleAddSection(allergies, setAllergies, defaultAllergy)}>
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

                                {!noMedications && medications.map((med, index) => (
                                    <div key={index} className="section-block">
                                        <h3>Medication {index + 1}</h3>

                                        <div className="form-field">
                                            <label>Generic Name</label>
                                            <input
                                            value={med.genericName}
                                            onChange={(e) =>
                                                handleChange(index, "genericName", e.target.value, medications, setMedications)
                                            }/>
                                        </div>

                                        <div className="form-field">
                                            <label>Brand Name</label>
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
                                            <label>Start Date</label>
                                            <GlassDateInput
                                                value={med.startDate}
                                                onChange={(iso) =>
                                                    handleChange(index, 'startDate', iso, medications, setMedications)
                                                }
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>End Date</label>
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
                                                onClick={() => handleRemoveSection(index, medications, setMedications)}>
                                                Remove Medication
                                            </button>
                                        )}
                                    </div>
                                ))}

                                {!noMedications && (
                                    <button
                                        className="add-section-button"
                                        type="button"
                                        onClick={() => handleAddSection(medications, setMedications, defaultMedication)}>
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
                                        }}
                                    />
                                    Click here if no known chronic conditions are present
                                </label>

                                {!noChronicConditions && chronicConditions.map((condition, index) => (
                                    <div key={index} className="section-block">

                                        <h3>Chronic Conditions {index + 1}</h3>

                                        <div className="form-field">
                                            <label>Condition Name</label>
                                            <input
                                            value={condition.conditionName}
                                            onChange={(e) =>
                                                handleChange(index, "conditionName", e.target.value, chronicConditions, setChronicConditions)
                                            }/>
                                        </div>

                                        <div className="form-field">
                                            <label>ICD Code</label>
                                            <input
                                            value={condition.icdCode}
                                            onChange={(e) =>
                                                handleChange(index, "icdCode", e.target.value, chronicConditions, setChronicConditions)
                                            }/>
                                        </div>

                                        <div className="form-field">
                                            <label>Diagnosis Date</label>
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
                                            <label>Preexisting</label>
                                            <input
                                            value={condition.prexisting}
                                            onChange={(e) =>
                                                handleChange(index, "prexisting", e.target.value, chronicConditions, setChronicConditions)
                                            }/>
                                        </div>

                                        <div className="form-field">
                                            <label>Additional Notes</label>
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
                                                    handleRemoveSection(index, chronicConditions, setChronicConditions)
                                                  }>
                                                Remove Chronic Condition
                                            </button>
                                        )}
                                    </div>
                                ))}

                                <button
                                    className = "add-section-button"
                                    type = "button"
                                    onClick={() =>
                                    handleAddSection(chronicConditions, setChronicConditions, defaultChronicCondition)}>
                                    + Add Another Chronic Condition
                                </button>

                            </div>
                        )}

                    {activeSection === 1 && (
                        <div className="tab14-section-card">
                            <p className="tab14-panel-sub" style={{ marginTop: 0 }}>
                                Fill these fields to populate the Health Overview “Patient Hospital” card.
                            </p>
                            <div className="form-field">
                                <label>Type</label>
                                <input
                                    placeholder='e.g. Recent admission, ER, outpatient'
                                    value={hospitalVisit.visitType}
                                    onChange={(e) =>
                                        handleHospitalChange('visitType', e.target.value)
                                    }
                                />
                            </div>
                            <div className="form-field">
                                <label>Facility</label>
                                <input
                                    value={hospitalVisit.facilityName}
                                    onChange={(e) =>
                                        handleHospitalChange('facilityName', e.target.value)
                                    }
                                />
                            </div>
                            <div className="form-field">
                                <label>Reason</label>
                                <input
                                    value={hospitalVisit.reason}
                                    onChange={(e) =>
                                        handleHospitalChange('reason', e.target.value)
                                    }
                                />
                            </div>
                            <div className="form-field">
                                <label>Date</label>
                                <GlassDateInput
                                    value={hospitalVisit.visitDate}
                                    onChange={(iso) => handleHospitalChange('visitDate', iso)}
                                    max={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div className="form-field">
                                <label>Discharge</label>
                                <GlassDateInput
                                    value={hospitalVisit.dischargeDate}
                                    onChange={(iso) => handleHospitalChange('dischargeDate', iso)}
                                />
                            </div>
                            <div className="form-field">
                                <label>Attending</label>
                                <input
                                    value={hospitalVisit.attendingPhysician}
                                    onChange={(e) =>
                                        handleHospitalChange('attendingPhysician', e.target.value)
                                    }
                                />
                            </div>
                            <div className="form-field">
                                <label>ReportId</label>
                                <input
                                    value={hospitalVisit.reportId}
                                    onChange={(e) =>
                                        handleHospitalChange('reportId', e.target.value)
                                    }
                                />
                            </div>
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
                        {!uploadParsing && uploadParseMessage && (
                            <p className="tab14-upload-parse">{uploadParseMessage}</p>
                        )}

                        {uploadedFiles.length > 0 && (
                        <div className="file-preview-list">
                            {uploadedFiles.map((entry) => (
                                <div className="file-preview" key={entry.id}>
                                    <p><strong>Name:</strong> {entry.file.name}</p>
                                    <p><strong>Size:</strong> {(entry.file.size / 1024).toFixed(2)} KB</p>
                                    <p><strong>Uploaded:</strong> {entry.uploadedAt}</p>

                                    {entry.file.type === 'application/pdf' ? (
                                        <div className = "file-thumbnail">
                                            <img src = "/pdf-icon.png" alt="" />
                                            <button
                                                className = "preview-button"
                                                type = "button"
                                                onClick = {() => window.open(entry.previewUrl, "_blank")}>
                                                Preview PDF
                                            </button>
                                        </div>
                                    ) : entry.file.type.startsWith('image/') ? (
                                        <div className="file-thumbnail">
                                            <img src={entry.previewUrl} alt="Uploaded" style={{ width: 100, height: 100, objectFit: 'cover' }} />
                                        </div>
                                    ) : (
                                        <p>No preview available for this file type.</p>
                                    )}

                                    <button
                                        className="remove-file-button"
                                        type="button"
                                        onClick={() => removeUploadedFile(entry.id)}>
                                        Remove File
                                    </button>
                                </div>
                            ))}
                            <button
                                className="remove-file-button remove-file-button--clear-all"
                                type="button"
                                onClick={clearUploadedFiles}>
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