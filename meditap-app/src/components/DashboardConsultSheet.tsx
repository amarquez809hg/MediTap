import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import PortalNavLink from './PortalNavLink';
import type { DashboardDetail } from '../api';
import type { Appointment } from '../appointments/appointmentStorage';
import './DashboardConsultSheet.css';

type HealthSummary = {
  bmi: string | number;
  bmiCategory: string;
  bloodPressure: string;
  heartRate: string;
  lastVisit: string;
  allergies: number;
  medications: number;
};

type DashboardConsultSheetProps = {
  greeting: string;
  contextLine: string;
  patientName: string;
  profile: DashboardDetail['patientProfile'] | undefined;
  emailFallback: string;
  health: HealthSummary;
  appointments: Appointment[];
  allergyNames: string[];
  medicationNames: string[];
  problemNames: string[];
  loading: boolean;
};

const TOOLS = [
  { href: '/app/labs', icon: 'fas fa-vial', labelKey: 'nav.labResults' },
  { href: '/app/intake?section=imagingResults', icon: 'fas fa-x-ray', labelKey: 'dashboard.imagingChip' },
  { href: '/app/appointments', icon: 'fas fa-calendar-check', labelKey: 'nav.appointments' },
  { href: '/app/conditions', icon: 'fas fa-notes-medical', labelKey: 'nav.patientHistory' },
  { href: '/app/intake?section=pastEncounters', icon: 'fas fa-hospital', labelKey: 'dashboard.pastEncounters' },
] as const;

function dash(v: string | undefined): string {
  return (v || '').trim();
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="dash-consult-field">
      {label}
      <input type="text" readOnly value={value || ''} placeholder="—" />
    </label>
  );
}

export function composeCareSummary(input: {
  patientName: string;
  sex: string;
  dob: string;
  lastVisit: string;
  nextAppointment: string;
  allergyNames: string[];
  medicationNames: string[];
  problemNames: string[];
  bmi: string;
  bp: string;
}): { heading: string; missing: number; blocks: { title: string; body: string }[] } {
  const required = [input.patientName, input.sex, input.dob, input.lastVisit];
  const missing = required.filter((x) => !x.trim() || x.trim() === '—').length;

  const who = [input.patientName || 'Patient', input.sex, input.dob && `DOB ${input.dob}`]
    .filter(Boolean)
    .join(', ');
  const allergies = input.allergyNames.length
    ? input.allergyNames.join(', ')
    : 'No allergies recorded.';
  const meds = input.medicationNames.length
    ? input.medicationNames.join(', ')
    : 'No medications recorded.';
  const problems = input.problemNames.length
    ? input.problemNames.join(', ')
    : 'No problems recorded.';
  const vitals = [
    input.bmi && input.bmi !== 'N/A' ? `BMI ${input.bmi}` : '',
    input.bp && input.bp !== '—' ? `BP ${input.bp}` : '',
  ]
    .filter(Boolean)
    .join('; ');

  return {
    heading: 'Care overview',
    missing,
    blocks: [
      { title: 'Patient', body: who },
      {
        title: 'Visit status',
        body: [
          input.lastVisit && input.lastVisit !== '—'
            ? `Last visit ${input.lastVisit}.`
            : 'Last visit not recorded.',
          input.nextAppointment
            ? `Next appointment ${input.nextAppointment}.`
            : 'No upcoming appointment on file.',
        ].join(' '),
      },
      { title: 'Problems', body: problems },
      { title: 'Allergies', body: allergies },
      { title: 'Medications', body: meds },
      {
        title: 'Vitals snapshot',
        body: vitals || 'Height, weight, and blood pressure are not on file yet.',
      },
    ],
  };
}

const DashboardConsultSheet: React.FC<DashboardConsultSheetProps> = ({
  greeting,
  contextLine,
  patientName,
  profile,
  emailFallback,
  health,
  appointments,
  allergyNames,
  medicationNames,
  problemNames,
  loading,
}) => {
  const { t } = useTranslation();
  const nextAppt = appointments[0];
  const nextApptLabel = nextAppt
    ? [nextAppt.date, nextAppt.time, nextAppt.specialist || nextAppt.type].filter(Boolean).join(' · ')
    : '';

  const note = useMemo(
    () =>
      composeCareSummary({
        patientName,
        sex: dash(profile?.sexAtBirth),
        dob: dash(profile?.dateOfBirth),
        lastVisit: String(health.lastVisit || ''),
        nextAppointment: nextApptLabel,
        allergyNames,
        medicationNames,
        problemNames,
        bmi: String(health.bmi ?? ''),
        bp: health.bloodPressure,
      }),
    [
      patientName,
      profile?.sexAtBirth,
      profile?.dateOfBirth,
      health.lastVisit,
      health.bmi,
      health.bloodPressure,
      nextApptLabel,
      allergyNames,
      medicationNames,
      problemNames,
    ]
  );

  return (
    <section className="dash-consult" aria-label={t('dashboard.welcomeAria')}>
      <div className="dash-consult__intro">
        <div>
          <p className="dash-consult__kicker">Patient portal</p>
          <h1 className="dash-consult__title">{greeting}</h1>
          <p className="dash-consult__context">{contextLine}</p>
        </div>
        <nav className="dash-consult__quick" aria-label={t('dashboard.quickActionsAria')}>
          <PortalNavLink
            to="/app/intake?section=demographics"
            className="meditap-glass-btn meditap-glass-btn--compact"
          >
            <i className="fas fa-user-edit" aria-hidden />
            <span>{t('dashboard.updateIntake')}</span>
          </PortalNavLink>
          <PortalNavLink
            to="/app/intake?section=demographics"
            className="meditap-glass-btn meditap-glass-btn--compact"
          >
            <i className="fas fa-file-upload" aria-hidden />
            <span>{t('dashboard.uploadDocument')}</span>
          </PortalNavLink>
          <PortalNavLink to="/app/status" className="meditap-glass-btn meditap-glass-btn--compact">
            <i className="fas fa-chart-line" aria-hidden />
            <span>{t('dashboard.quickStatusLink')}</span>
          </PortalNavLink>
        </nav>
      </div>

      <div className="dash-consult__tools" aria-label={t('dashboard.quickActionsAria')}>
        {TOOLS.map((tool) => (
          <PortalNavLink key={tool.href} to={tool.href} className="dash-consult-chip">
            <i className={tool.icon} aria-hidden />
            {tool.labelKey === 'dashboard.imagingChip' ? 'Imaging' : t(tool.labelKey)}
          </PortalNavLink>
        ))}
      </div>

      <div className="dash-consult__grid">
        <div className="dash-consult-card">
          <h2>Patient</h2>
          <div className="dash-consult-row">
            <Field label={t('dashboard.dob')} value={dash(profile?.dateOfBirth)} />
            <Field label={t('dashboard.sex')} value={dash(profile?.sexAtBirth)} />
          </div>
          <div className="dash-consult-row">
            <Field label={t('dashboard.blood')} value={dash(profile?.bloodType)} />
            <Field label={t('dashboard.phone')} value={dash(profile?.phone)} />
          </div>
          <Field
            label={t('dashboard.email')}
            value={dash(profile?.email) || dash(emailFallback)}
          />

          <h2>{t('dashboard.healthMetrics')}</h2>
          <div className="dash-consult-row">
            <Field label={t('dashboard.bmiScore')} value={String(health.bmi ?? '')} />
            <Field
              label={t('dashboard.bpHeartRate')}
              value={
                health.bloodPressure !== '—'
                  ? health.bloodPressure
                  : health.heartRate !== '—'
                    ? health.heartRate
                    : ''
              }
            />
          </div>
          <Field label={t('dashboard.lastVisit')} value={health.lastVisit === '—' ? '' : health.lastVisit} />
          {loading && <p className="dash-consult-loading">{t('dashboard.healthMetricsSyncing')}</p>}
        </div>

        <aside className="dash-consult-card dash-consult-card--note" aria-live="polite">
          <div className="dash-consult-notehead">
            <h2>{note.heading}</h2>
            <p className={note.missing ? 'dash-consult-missing' : 'dash-consult-complete'}>
              {note.missing
                ? `${note.missing} field${note.missing === 1 ? '' : 's'} still empty`
                : 'Note complete from current chart'}
            </p>
          </div>
          <p className="dash-consult-notehint">
            Assembled from the chart on file. Open Patient Information to fill empty fields.
          </p>
          {note.blocks.map((block) => (
            <div key={block.title} className="dash-consult-block">
              <h3>{block.title}</h3>
              <p>{block.body}</p>
            </div>
          ))}
        </aside>
      </div>
    </section>
  );
};

export default DashboardConsultSheet;
