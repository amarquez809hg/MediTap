import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getApiBase } from '../config/api';
import PublicPageLayout from '../components/PublicPageLayout';
import './CardProfilePage.css';

type AllergyRow = { name: string; severity: string | null };
type EmergencyContact = {
  name: string | null;
  relationship: string | null;
  phone: string | null;
};
type NamedRow = { name: string; severity?: string | null; notes?: string | null };
type CardProfile = {
  given_name: string;
  family_name: string;
  date_of_birth: string;
  blood_type: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  sex_at_birth?: string | null;
  legal_sex?: string | null;
  gender_identity?: string | null;
  preferred_language?: string | null;
  other_notes?: string | null;
  allergies: AllergyRow[];
  emergency_contact: (EmergencyContact & { email?: string | null }) | null;
  medications?: Array<{ name: string; dosage?: string | null; frequency?: string | null; notes?: string | null }>;
  conditions?: NamedRow[];
  insurance?: Array<{ provider: string; plan?: string | null; member_id?: string | null; policy_number?: string | null }>;
  appointments?: Array<{ when: string; specialist: string; status?: string | null; reason?: string | null }>;
  labs?: Array<{ name: string; collected_on?: string | null; status?: string | null; impression?: string | null }>;
  visits?: Array<{ occurred_at?: string | null; type: string; summary: string; home_instructions?: string | null }>;
  vitals?: {
    systolic_bp?: number | null;
    diastolic_bp?: number | null;
    heart_rate_bpm?: number | null;
    temperature_f?: string | null;
    oxygen_saturation_pct?: number | null;
    weight_kg?: string | null;
    height_cm?: string | null;
  };
};

function cardApiBase(): string {
  const configured = (import.meta.env.VITE_API_BASE || '').trim();
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location;
    const onLan = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(hostname);
    if (onLan && (port === '8100' || port === '')) {
      return `${protocol}//${hostname}:8080`;
    }
  }
  return getApiBase();
}

function formatDob(iso: string): string {
  const [year, month, day] = iso.split('-').map((part) => Number(part));
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

type CardProfilePageProps = {
  sun?: boolean;
};

const CardProfilePage: React.FC<CardProfilePageProps> = ({ sun = false }) => {
  const { token, cardId } = useParams<{ token?: string; cardId?: string }>();
  const { search } = useLocation();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<CardProfile | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const pathId = sun ? cardId : token;
      if (!pathId) {
        setError(t('cardProfile.notActive'));
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      const endpoint = sun
        ? `${cardApiBase()}/api/card-profile/s/${encodeURIComponent(pathId)}/${search}`
        : `${cardApiBase()}/api/card-profile/${encodeURIComponent(pathId)}/`;
      try {
        const response = await fetch(endpoint);
        if (response.status === 404) {
          if (!cancelled) setError(t('cardProfile.notActive'));
          return;
        }
        if (!response.ok) {
          if (!cancelled) setError(t('cardProfile.loadError'));
          return;
        }
        const body = (await response.json()) as CardProfile;
        if (!cancelled) setProfile(body);
      } catch {
        if (!cancelled) setError(t('cardProfile.loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, cardId, search, sun, t]);

  const name = profile ? `${profile.given_name} ${profile.family_name}`.trim() : '';

  return (
    <PublicPageLayout title={t('cardProfile.title')} subtitle={t('cardProfile.subtitle')}>
      {loading && (
        <section className="public-page__card">
          <p>{t('cardProfile.loading')}</p>
        </section>
      )}
      {!loading && error && (
        <section className="public-page__card">
          <p>{error}</p>
        </section>
      )}
      {!loading && profile && (
        <>
          <section className="public-page__card public-page__card--accent card-profile__identity">
            <p className="card-profile__name">{name}</p>
            <p className="card-profile__blood">
              <span>{t('cardProfile.bloodType')}</span>
              <strong>{profile.blood_type || t('cardProfile.notRecorded')}</strong>
            </p>
            <p className="card-profile__dob">
              {t('cardProfile.dateOfBirth')}: {formatDob(profile.date_of_birth)}
            </p>
            {profile.phone || profile.email || profile.address ? (
              <p className="card-profile__dob">
                {[profile.phone, profile.email, profile.address].filter(Boolean).join(' · ')}
              </p>
            ) : null}
          </section>

          <section className="public-page__card">
            <h2>{t('cardProfile.allergies')}</h2>
            {profile.allergies.length === 0 ? (
              <p>{t('cardProfile.noAllergies')}</p>
            ) : (
              <ul className="card-profile__list">
                {profile.allergies.map((row) => (
                  <li key={row.name}>
                    {row.name}
                    {row.severity ? ` — ${row.severity}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="public-page__card">
            <h2>{t('cardProfile.emergencyContact')}</h2>
            {profile.emergency_contact ? (
              <p>
                {[profile.emergency_contact.name, profile.emergency_contact.relationship]
                  .filter(Boolean)
                  .join(' · ')}
                {profile.emergency_contact.phone ? (
                  <>
                    <br />
                    <a href={`tel:${profile.emergency_contact.phone}`}>
                      {profile.emergency_contact.phone}
                    </a>
                  </>
                ) : null}
              </p>
            ) : (
              <p>{t('cardProfile.noEmergencyContact')}</p>
            )}
          </section>

          {profile.medications ? (
            <ChartList
              title={t('cardProfile.medications')}
              empty={t('cardProfile.noneRecorded')}
              rows={profile.medications.map((row) =>
                [row.name, row.dosage, row.frequency].filter(Boolean).join(' · '),
              )}
            />
          ) : null}
          {profile.conditions ? (
            <ChartList
              title={t('cardProfile.conditions')}
              empty={t('cardProfile.noneRecorded')}
              rows={profile.conditions.map((row) =>
                [row.name, row.severity].filter(Boolean).join(' · '),
              )}
            />
          ) : null}
          {profile.insurance ? (
            <ChartList
              title={t('cardProfile.insurance')}
              empty={t('cardProfile.noneRecorded')}
              rows={profile.insurance.map((row) =>
                [row.provider, row.plan, row.member_id].filter(Boolean).join(' · '),
              )}
            />
          ) : null}
          {profile.appointments ? (
            <ChartList
              title={t('cardProfile.appointments')}
              empty={t('cardProfile.noneRecorded')}
              rows={profile.appointments.map((row) =>
                [row.when, row.specialist, row.status].filter(Boolean).join(' · '),
              )}
            />
          ) : null}
          {profile.labs ? (
            <ChartList
              title={t('cardProfile.labs')}
              empty={t('cardProfile.noneRecorded')}
              rows={profile.labs.map((row) =>
                [row.name, row.collected_on, row.status].filter(Boolean).join(' · '),
              )}
            />
          ) : null}
          {profile.visits ? (
            <ChartList
              title={t('cardProfile.visits')}
              empty={t('cardProfile.noneRecorded')}
              rows={profile.visits.map((row) =>
                [row.type, row.summary].filter(Boolean).join(' — '),
              )}
            />
          ) : null}
          {profile.vitals ? <VitalsBlock vitals={profile.vitals} label={t('cardProfile.vitals')} /> : null}
          {profile.other_notes ? (
            <section className="public-page__card">
              <h2>{t('cardProfile.notes')}</h2>
              <p>{profile.other_notes}</p>
            </section>
          ) : null}
        </>
      )}
    </PublicPageLayout>
  );
};

function ChartList({ title, empty, rows }: { title: string; empty: string; rows: string[] }) {
  return (
    <section className="public-page__card">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p>{empty}</p>
      ) : (
        <ul className="card-profile__list">
          {rows.map((row, index) => (
            <li key={`${index}-${row}`}>{row}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function VitalsBlock({
  vitals,
  label,
}: {
  vitals: NonNullable<CardProfile['vitals']>;
  label: string;
}) {
  const parts = [
    vitals.systolic_bp && vitals.diastolic_bp ? `BP ${vitals.systolic_bp}/${vitals.diastolic_bp}` : '',
    vitals.heart_rate_bpm ? `HR ${vitals.heart_rate_bpm}` : '',
    vitals.temperature_f ? `${vitals.temperature_f}°F` : '',
    vitals.oxygen_saturation_pct ? `SpO2 ${vitals.oxygen_saturation_pct}%` : '',
    vitals.weight_kg ? `${vitals.weight_kg} kg` : '',
    vitals.height_cm ? `${vitals.height_cm} cm` : '',
  ].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <section className="public-page__card">
      <h2>{label}</h2>
      <p>{parts.join(' · ')}</p>
    </section>
  );
}

export default CardProfilePage;
