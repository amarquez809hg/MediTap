import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
type CardProfile = {
  given_name: string;
  family_name: string;
  date_of_birth: string;
  blood_type: string | null;
  allergies: AllergyRow[];
  emergency_contact: EmergencyContact | null;
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

const CardProfilePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<CardProfile | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) {
        setError(t('cardProfile.notActive'));
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const response = await fetch(
          `${cardApiBase()}/api/card-profile/${encodeURIComponent(token)}/`,
        );
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
  }, [token, t]);

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
        </>
      )}
    </PublicPageLayout>
  );
};

export default CardProfilePage;
