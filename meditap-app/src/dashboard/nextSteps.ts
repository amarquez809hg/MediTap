import type { TFunction } from 'i18next';
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
  options: BuildNextStepsOptions,
  t: TFunction
): NextStepItem[] {
  const steps: NextStepItem[] = [];
  const missing = isPatientMissing(detail);
  const onDashboard = options.surface === 'dashboard';

  if (missing || !patientHasBasicProfile(detail)) {
    steps.push({
      id: 'profile',
      title: t('nextSteps.completeProfile'),
      subtitle: t('nextSteps.completeProfileSub'),
      href: '/tab14',
      tone: 'primary',
      priority: 10,
    });
  } else if (profileFieldsIncomplete(detail)) {
    steps.push({
      id: 'profile-fields',
      title: t('nextSteps.finishProfile'),
      subtitle: t('nextSteps.finishProfileSub'),
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
        title: t('nextSteps.uploadRecords'),
        subtitle: t('nextSteps.uploadRecordsSub'),
        href: '/tab14',
        tone: 'primary',
        priority: 20,
      });
    }
  }

  if (pendingLabs > 0) {
    steps.push({
      id: 'labs-pending',
      title: t('nextSteps.labsPending', { count: pendingLabs }),
      subtitle:
        newLabPanels > 0
          ? t('nextSteps.labsPendingSubNew', { count: newLabPanels })
          : t('nextSteps.labsPendingSub'),
      href: '/tab7',
      tone: 'warning',
      priority: 30,
    });
  } else if (newLabPanels > 0) {
    steps.push({
      id: 'labs-new',
      title: t('nextSteps.labsNew'),
      subtitle: t('nextSteps.labsNewSub'),
      href: '/tab7',
      tone: 'primary',
      priority: 35,
    });
  }

  const pendingAppts = appointments.filter((a) => a.status.toLowerCase() === 'pending').length;
  if (pendingAppts > 0) {
    steps.push({
      id: 'appts-pending',
      title: t('nextSteps.apptsPending', { count: pendingAppts }),
      subtitle: t('nextSteps.apptsPendingSub'),
      href: '/tab4',
      tone: 'warning',
      priority: 40,
    });
  }

  const medCount = detail?.medications.length ?? 0;
  if (detail && !missing && medCount === 0) {
    steps.push({
      id: 'meds',
      title: t('nextSteps.addMeds'),
      subtitle: t('nextSteps.addMedsSub'),
      href: '/tab14',
      tone: 'neutral',
      priority: 50,
    });
  }

  const insCount = detail?.insurance.length ?? 0;
  if (detail && !missing && insCount === 0) {
    steps.push({
      id: 'insurance',
      title: t('nextSteps.addInsurance'),
      subtitle: t('nextSteps.addInsuranceSub'),
      href: '/tab12',
      tone: 'neutral',
      priority: 55,
    });
  }

  const chronicCount = detail?.chronicConditions.length ?? 0;
  if (detail && !missing && chronicCount > 0) {
    steps.push({
      id: 'chronic',
      title: t('nextSteps.reviewChronic'),
      subtitle: t('nextSteps.reviewChronicSub', { count: chronicCount }),
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
        title: t('nextSteps.reviewAllergies'),
        subtitle: t('nextSteps.reviewAllergiesSub'),
        href: '/tab14',
        tone: 'danger',
        priority: 25,
      });
    }
  }

  if (detail && !missing && appointments.length === 0) {
    steps.push({
      id: 'book',
      title: t('nextSteps.scheduleVisit'),
      subtitle: t('nextSteps.scheduleVisitSub'),
      href: '/tab4',
      tone: 'primary',
      priority: 45,
    });
  }

  if (!onDashboard && detail && !missing && medCount > 0) {
    steps.push({
      id: 'meds-review',
      title: t('nextSteps.medsReview'),
      subtitle: t('nextSteps.medsReviewSub', { count: medCount }),
      href: '/tab14',
      tone: 'primary',
      priority: 70,
    });
  }

  if (!onDashboard) {
    steps.push({
      id: 'dashboard',
      title: t('nextSteps.fullOverview'),
      subtitle: t('nextSteps.fullOverviewSub'),
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
  detail: DashboardDetail | null,
  t: TFunction
): ProfileCompleteness {
  if (!detail || isPatientMissing(detail)) {
    return {
      percent: 0,
      subtitle: t('nextSteps.profileCreate'),
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
    return { percent: 100, subtitle: t('nextSteps.profileComplete') };
  }
  if (percent >= 70) {
    return { percent, subtitle: t('nextSteps.profileAlmost') };
  }
  if (percent >= 40) {
    return { percent, subtitle: t('nextSteps.profileMissing') };
  }
  return { percent, subtitle: t('nextSteps.profileStart') };
}

export function countSevereAllergies(detail: DashboardDetail | null): number {
  if (!detail) return 0;
  return detail.allergies.filter((a) =>
    /severe|high|anaphyl/i.test(a.severity || '')
  ).length;
}

export function greetingForDisplayName(displayName: string, t: TFunction): string {
  const hour = new Date().getHours();
  const period =
    hour < 12
      ? t('nextSteps.greetingMorning')
      : hour < 17
        ? t('nextSteps.greetingAfternoon')
        : t('nextSteps.greetingEvening');
  const first = displayName.trim().split(/\s+/)[0] || displayName.trim() || t('nextSteps.greetingFallback');
  return `${period}, ${first}.`;
}

export function welcomeContextLine(
  appointments: Appointment[],
  loading: boolean,
  hasSummaryError: boolean,
  t: TFunction
): string {
  if (loading) return t('nextSteps.syncingRecord');
  if (hasSummaryError) return t('nextSteps.summaryPartialError');

  const pending = appointments.filter((a) => a.status.toLowerCase() === 'pending').length;
  const confirmed = appointments.filter((a) => a.status.toLowerCase() === 'confirmed').length;

  if (appointments.length === 0) {
    return t('nextSteps.noAppointmentsFile');
  }
  if (pending > 0) {
    return t('nextSteps.appointmentsAttention', { total: appointments.length, pending });
  }
  if (confirmed > 0) {
    return t('nextSteps.confirmedVisits', { count: confirmed });
  }
  return t('nextSteps.appointmentsOnSchedule', { count: appointments.length });
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
