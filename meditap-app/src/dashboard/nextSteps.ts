import type { DashboardDetail } from '../api';
import type { Appointment } from '../appointments/appointmentStorage';
import { loadOnboarding } from '../onboarding/onboardingStorage';

export type NextStepTone = 'primary' | 'warning' | 'danger' | 'neutral';

export type NextStepItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  tone: NextStepTone;
  /** Lower = shown first when trimming the list */
  priority: number;
};

export type BuildNextStepsOptions = {
  /** Dashboard home hides the self-referential “overview” step */
  surface: 'dashboard' | 'quick-status';
  username?: string | null;
};

export function isPatientMissing(detail: DashboardDetail | null): boolean {
  if (!detail) return true;
  if (detail.id === 'Not created yet') return true;
  if ((detail.patientProfile?.patientId || '').toLowerCase().includes('not created')) {
    return true;
  }
  return false;
}

export function countLabAttention(panels: { status: string; is_new?: boolean }[]): {
  pending: number;
  newPanels: number;
} {
  const pending = panels.filter((r) => r.status.toLowerCase() === 'pending').length;
  const newPanels = panels.filter((r) => Boolean(r.is_new)).length;
  return { pending, newPanels };
}

function profileFieldsIncomplete(detail: DashboardDetail | null): boolean {
  if (!detail || isPatientMissing(detail)) return false;
  const p = detail.patientProfile;
  const missing = (v: string) => !v?.trim() || v.trim() === '—';
  return missing(p.phone) || missing(p.bloodType) || missing(p.sexAtBirth);
}

export function buildNextSteps(
  detail: DashboardDetail | null,
  appointments: Appointment[],
  pendingLabs: number,
  newLabPanels: number,
  options: BuildNextStepsOptions
): NextStepItem[] {
  const steps: NextStepItem[] = [];
  const missing = isPatientMissing(detail);
  const onDashboard = options.surface === 'dashboard';

  if (missing || !patientHasBasicProfile(detail)) {
    steps.push({
      id: 'profile',
      title: 'Complete your patient profile',
      subtitle: 'Add name, date of birth, and contact details in Patient Information.',
      href: '/tab14',
      tone: 'primary',
      priority: 10,
    });
  } else if (profileFieldsIncomplete(detail)) {
    steps.push({
      id: 'profile-fields',
      title: 'Finish profile details',
      subtitle: 'Add phone, blood type, or sex at birth so your chart is complete.',
      href: '/tab14',
      tone: 'primary',
      priority: 15,
    });
  }

  if (onDashboard) {
    const onboarding = loadOnboarding(options.username ?? null);
    const needsUpload = onboarding
      ? !onboarding.steps.upload
      : !patientHasBasicProfile(detail);
    if (needsUpload && !missing) {
      steps.push({
        id: 'upload-doc',
        title: 'Upload medical records',
        subtitle: 'PDF or photo of labs, visit summaries, or intake forms—we can pre-fill fields.',
        href: '/tab14',
        tone: 'primary',
        priority: 20,
      });
    }
  }

  if (pendingLabs > 0) {
    steps.push({
      id: 'labs-pending',
      title:
        pendingLabs === 1 ? '1 lab panel still pending' : `${pendingLabs} lab panels pending`,
      subtitle:
        newLabPanels > 0
          ? `${newLabPanels} panel(s) have new or partial results to review.`
          : 'Open Lab Results to track status.',
      href: '/tab7',
      tone: 'warning',
      priority: 30,
    });
  } else if (newLabPanels > 0) {
    steps.push({
      id: 'labs-new',
      title: 'New lab results to review',
      subtitle: 'Open Lab Results for details and reference ranges.',
      href: '/tab7',
      tone: 'primary',
      priority: 35,
    });
  }

  const pendingAppts = appointments.filter((a) => a.status.toLowerCase() === 'pending').length;
  if (pendingAppts > 0) {
    steps.push({
      id: 'appts-pending',
      title:
        pendingAppts === 1
          ? '1 appointment needs attention'
          : `${pendingAppts} appointments need attention`,
      subtitle: 'Confirm or update visits on the Appointments tab.',
      href: '/tab4',
      tone: 'warning',
      priority: 40,
    });
  }

  const medCount = detail?.medications.length ?? 0;
  if (detail && !missing && medCount === 0) {
    steps.push({
      id: 'meds',
      title: 'Add your medications',
      subtitle: 'Document prescriptions in Patient Information for safer care.',
      href: '/tab14',
      tone: 'neutral',
      priority: 50,
    });
  }

  const insCount = detail?.insurance.length ?? 0;
  if (detail && !missing && insCount === 0) {
    steps.push({
      id: 'insurance',
      title: 'Add insurance on file',
      subtitle: 'Speeds check-in and claims on the Patient Insurance tab.',
      href: '/tab12',
      tone: 'neutral',
      priority: 55,
    });
  }

  const chronicCount = detail?.chronicConditions.length ?? 0;
  if (detail && !missing && chronicCount > 0) {
    steps.push({
      id: 'chronic',
      title: 'Review chronic conditions',
      subtitle: `${chronicCount} condition(s) on file — keep history current.`,
      href: '/tab5',
      tone: 'primary',
      priority: 60,
    });
  }

  const allergyCount = detail?.allergies.length ?? 0;
  if (detail && !missing && allergyCount > 0) {
    const severe = detail.allergies.some((a) =>
      /severe|high|anaphyl/i.test(a.severity || '')
    );
    if (severe) {
      steps.push({
        id: 'allergies',
        title: 'Review allergy documentation',
        subtitle: 'Severe allergies on file — confirm details in Patient Information.',
        href: '/tab14',
        tone: 'danger',
        priority: 25,
      });
    }
  }

  if (detail && !missing && appointments.length === 0) {
    steps.push({
      id: 'book',
      title: 'Schedule your next visit',
      subtitle: 'No upcoming appointments — add one on the Appointments tab.',
      href: '/tab4',
      tone: 'primary',
      priority: 45,
    });
  }

  if (!onDashboard && detail && !missing && medCount > 0) {
    steps.push({
      id: 'meds-review',
      title: 'Medication list on your record',
      subtitle: `${medCount} active medication(s). Update anytime in Patient Information.`,
      href: '/tab14',
      tone: 'primary',
      priority: 70,
    });
  }

  if (!onDashboard) {
    steps.push({
      id: 'dashboard',
      title: 'Full health overview',
      subtitle: 'See metrics, labs, incidents, and more on the main dashboard.',
      href: '/tab1',
      tone: 'neutral',
      priority: 90,
    });
  }

  const seen = new Set<string>();
  const deduped = steps.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  deduped.sort((a, b) => a.priority - b.priority);
  return deduped;
}

export function trimNextStepsForDashboard(steps: NextStepItem[], max = 4): NextStepItem[] {
  return steps.slice(0, max);
}

const URGENCY_ORDER: Record<NextStepTone, number> = {
  danger: 0,
  warning: 1,
  primary: 2,
  neutral: 3,
};

/** Quick Status: surface highest-risk items first, then by priority number. */
export function sortNextStepsByUrgency(steps: NextStepItem[]): NextStepItem[] {
  return [...steps].sort((a, b) => {
    const byTone = URGENCY_ORDER[a.tone] - URGENCY_ORDER[b.tone];
    if (byTone !== 0) return byTone;
    return a.priority - b.priority;
  });
}

export function trimNextStepsForQuickStatus(steps: NextStepItem[], max = 6): NextStepItem[] {
  return sortNextStepsByUrgency(steps).slice(0, max);
}

export function hasUrgentNextSteps(steps: NextStepItem[]): boolean {
  return steps.some((s) => s.tone === 'danger' || s.tone === 'warning');
}

export type ProfileCompleteness = {
  percent: number;
  subtitle: string;
};

function fieldFilled(value: string | undefined | null): boolean {
  return Boolean(value?.trim()) && value!.trim() !== '—';
}

/** Name + DOB present on the server-backed patient chart. */
export function patientHasBasicProfile(detail: DashboardDetail | null): boolean {
  if (!detail || isPatientMissing(detail)) return false;
  const p = detail.patientProfile;
  return (
    fieldFilled(p.fullName) &&
    fieldFilled(p.dateOfBirth) &&
    detail.name.trim().toLowerCase() !== 'patient'
  );
}

/** Seven chart fields: intake, demographics, contact, and insurance on file. */
export function computeProfileCompleteness(
  detail: DashboardDetail | null
): ProfileCompleteness {
  if (!detail || isPatientMissing(detail)) {
    return {
      percent: 0,
      subtitle: 'Create your patient chart in Patient Information',
    };
  }

  const p = detail.patientProfile;
  const checks = [
    patientHasBasicProfile(detail),
    fieldFilled(p.dateOfBirth),
    fieldFilled(p.email),
    fieldFilled(p.phone),
    fieldFilled(p.bloodType),
    fieldFilled(p.sexAtBirth),
    detail.insurance.length > 0,
    detail.healthSummary.bmi !== 'N/A',
  ];
  const passed = checks.filter(Boolean).length;
  const percent = Math.round((passed / checks.length) * 100);

  if (percent >= 100) {
    return { percent: 100, subtitle: 'Chart basics complete — keep details current' };
  }
  if (percent >= 70) {
    return { percent, subtitle: 'Almost there — finish remaining profile fields' };
  }
  if (percent >= 40) {
    return { percent, subtitle: 'Add missing contact and insurance details' };
  }
  return { percent, subtitle: 'Start in Patient Information to build your chart' };
}

export function countSevereAllergies(detail: DashboardDetail | null): number {
  if (!detail) return 0;
  return detail.allergies.filter((a) =>
    /severe|high|anaphyl/i.test(a.severity || '')
  ).length;
}

export function greetingForDisplayName(displayName: string): string {
  const hour = new Date().getHours();
  const period = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const first = displayName.trim().split(/\s+/)[0] || displayName.trim() || 'there';
  return `${period}, ${first}.`;
}

export function welcomeContextLine(
  appointments: Appointment[],
  loading: boolean,
  hasSummaryError: boolean
): string {
  if (loading) return 'Syncing your health record…';
  if (hasSummaryError) return 'Some live data could not be loaded — steps below still apply.';

  const pending = appointments.filter((a) => a.status.toLowerCase() === 'pending').length;
  const confirmed = appointments.filter((a) => a.status.toLowerCase() === 'confirmed').length;

  if (appointments.length === 0) {
    return 'No upcoming appointments on file.';
  }
  if (pending > 0) {
    return `${appointments.length} appointment(s) · ${pending} need your attention`;
  }
  if (confirmed > 0) {
    return `${confirmed} confirmed visit(s) on your schedule`;
  }
  return `${appointments.length} appointment(s) on your schedule`;
}

/** Font Awesome classes for dashboard next-step cards */
export const NEXT_STEP_FA_ICON: Record<string, string> = {
  profile: 'fas fa-user-circle',
  'profile-fields': 'fas fa-id-card',
  'upload-doc': 'fas fa-file-upload',
  'labs-pending': 'fas fa-vial',
  'labs-new': 'fas fa-flask',
  'appts-pending': 'fas fa-calendar-check',
  meds: 'fas fa-pills',
  insurance: 'fas fa-id-card',
  chronic: 'fas fa-notes-medical',
  allergies: 'fas fa-allergies',
  book: 'fas fa-calendar-plus',
  'meds-review': 'fas fa-pills',
  dashboard: 'fas fa-heartbeat',
};
