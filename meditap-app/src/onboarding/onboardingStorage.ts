const STORAGE_PREFIX = 'meditap_onboarding_v1_';

export type OnboardingSteps = {
  profile: boolean;
  upload: boolean;
  finished: boolean;
};

export type OnboardingRecord = {
  steps: OnboardingSteps;
  skipped: boolean;
};

const defaultSteps = (): OnboardingSteps => ({
  profile: false,
  upload: false,
  finished: false,
});

function key(username: string | null): string | null {
  const u = username?.trim();
  return u ? `${STORAGE_PREFIX}${u.toLowerCase()}` : null;
}

export function loadOnboarding(username: string | null): OnboardingRecord | null {
  const k = key(username);
  if (!k) return null;
  try {
    const raw = localStorage.getItem(k);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OnboardingRecord>;
    return {
      skipped: Boolean(parsed.skipped),
      steps: { ...defaultSteps(), ...(parsed.steps ?? {}) },
    };
  } catch {
    return null;
  }
}

export function saveOnboarding(username: string | null, record: OnboardingRecord): void {
  const k = key(username);
  if (!k) return;
  localStorage.setItem(k, JSON.stringify(record));
}

export function markOnboardingStep(
  username: string | null,
  step: keyof OnboardingSteps,
  value = true
): void {
  const current = loadOnboarding(username) ?? { skipped: false, steps: defaultSteps() };
  current.steps[step] = value;
  saveOnboarding(username, current);
}

export function skipOnboarding(username: string | null): void {
  const current = loadOnboarding(username) ?? { skipped: false, steps: defaultSteps() };
  current.skipped = true;
  current.steps.finished = true;
  saveOnboarding(username, current);
}

export function startOnboardingForNewUser(username: string | null): void {
  saveOnboarding(username, { skipped: false, steps: defaultSteps() });
}

export function isOnboardingComplete(username: string | null): boolean {
  const rec = loadOnboarding(username);
  if (!rec) return true;
  if (rec.skipped || rec.steps.finished) return true;
  return rec.steps.profile && rec.steps.upload;
}

export function shouldShowOnboardingWizard(username: string | null): boolean {
  const rec = loadOnboarding(username);
  if (!rec) return false;
  return !rec.skipped && !rec.steps.finished;
}

export function shouldShowDashboardOnboardingBanner(username: string | null): boolean {
  const rec = loadOnboarding(username);
  if (!rec) return false;
  if (rec.skipped || rec.steps.finished) return false;
  return !(rec.steps.profile && rec.steps.upload);
}

export function patientInfoLooksComplete(): boolean {
  try {
    const raw = localStorage.getItem('patientInfo');
    if (!raw) return false;
    const info = JSON.parse(raw) as Record<string, unknown>;
    const first = String(
      info.givenName ?? info.firstName ?? info.first_name ?? ''
    ).trim();
    const last = String(
      info.familyName ?? info.lastName ?? info.last_name ?? ''
    ).trim();
    return Boolean(first && last);
  } catch {
    return false;
  }
}
