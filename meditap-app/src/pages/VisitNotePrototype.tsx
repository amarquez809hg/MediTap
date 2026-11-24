import React, { useMemo, useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useLocation } from 'react-router-dom';
import GoBackButton from '../components/GoBackButton';
import HeaderLanguagePicker from '../components/HeaderLanguagePicker';
import PortalNavLink from '../components/PortalNavLink';
import { chartPageGoBackFallback, navigatePortalHard } from '../navigation/portalGoBack';
import './VisitNotePrototype.css';

export const VISIT_NOTE_PROTOTYPE_PATH = '/visit-note-prototype';
export const VISIT_NOTE_APP_PATH = '/app/visit-note';

type Territory = 'venous' | 'arterial' | 'carotid';

type VisitNoteForm = {
  sex: 'female' | 'male' | '';
  age: string;
  dateOfBirth: string;
  facility: string;
  specialty: string;
  diagnosis: string;
  territories: Territory[];
  historyShort: string;
  diabetes: boolean;
  evolution: string;
  treatment: string;
  currentIllness: string;
  exam: string;
  analysis: string;
};

const DEMO_FORM: VisitNoteForm = {
  sex: 'female',
  age: '62',
  dateOfBirth: '1964-03-12',
  facility: 'Hospital General de Zona, Monterrey, Nuevo Leon',
  specialty: 'Angiology and Vascular Surgery',
  diagnosis: 'Chronic peripheral venous insufficiency',
  territories: ['venous'],
  historyShort: 'Type 2 diabetes mellitus',
  diabetes: true,
  evolution: '16 years',
  treatment: 'Compression therapy and scheduled follow-up',
  currentIllness: 'Progressive lower-extremity edema and aching after standing.',
  exam: 'No trophic lesions. Distal pulses present. Skin warm, no immediate ischemia.',
  analysis: 'Chronic venous disease affecting daily activity. Counsel on compression and limb elevation.',
};

const EMPTY_FORM: VisitNoteForm = {
  sex: '',
  age: '',
  dateOfBirth: '',
  facility: '',
  specialty: '',
  diagnosis: '',
  territories: [],
  historyShort: '',
  diabetes: false,
  evolution: '',
  treatment: '',
  currentIllness: '',
  exam: '',
  analysis: '',
};

const TERRITORY_LABEL: Record<Territory, string> = {
  venous: 'Venous',
  arterial: 'Peripheral arterial',
  carotid: 'Carotid',
};

const REQUIRED_KEYS: (keyof VisitNoteForm)[] = [
  'sex',
  'age',
  'dateOfBirth',
  'facility',
  'specialty',
  'diagnosis',
  'currentIllness',
  'exam',
  'analysis',
];

function missingCount(form: VisitNoteForm): number {
  let n = 0;
  for (const key of REQUIRED_KEYS) {
    const v = form[key];
    if (typeof v === 'string' && !v.trim()) n += 1;
  }
  if (form.territories.length === 0) n += 1;
  return n;
}

function composeVisitNote(form: VisitNoteForm): { heading: string; blocks: { title: string; body: string }[] } {
  const sexLine = form.sex === 'female' ? 'female' : form.sex === 'male' ? 'male' : 'patient';
  const ageBit = form.age.trim() ? `${form.age.trim()}-year-old` : 'adult';
  const place = form.facility.trim() || 'the referring facility';
  const dx = form.diagnosis.trim() || 'a vascular concern';
  const territories =
    form.territories.length > 0
      ? form.territories.map((t) => TERRITORY_LABEL[t].toLowerCase()).join(', ')
      : 'unspecified territory';
  const historyParts = [
    form.historyShort.trim(),
    form.diabetes && !form.historyShort.toLowerCase().includes('diabetes')
      ? 'Type 2 diabetes mellitus'
      : '',
  ].filter(Boolean);
  const history = historyParts.length ? historyParts.join('. ') : 'No additional personal history entered.';

  return {
    heading: form.specialty.trim() || 'Outpatient consult',
    blocks: [
      {
        title: 'Service',
        body: form.specialty.trim() || 'Specialty not selected.',
      },
      {
        title: 'Outpatient consult note',
        body: `${ageBit} ${sexLine} referred from ${place} for ${dx} (${territories}).`,
      },
      {
        title: 'Personal history',
        body: history,
      },
      {
        title: 'Current illness',
        body: form.currentIllness.trim() || 'Not documented.',
      },
      {
        title: 'Directed physical exam',
        body: form.exam.trim() || 'Not documented.',
      },
      {
        title: 'Diagnosis',
        body: form.diagnosis.trim() || 'Pending.',
      },
      {
        title: 'Analysis',
        body: form.analysis.trim() || 'Pending.',
      },
    ],
  };
}

const TOOLS = [
  { href: '/app/labs', icon: 'fas fa-vial', label: 'Labs' },
  { href: '/app/intake?section=imagingResults', icon: 'fas fa-x-ray', label: 'Imaging' },
  { href: '/app/appointments', icon: 'fas fa-calendar-check', label: 'Appointments' },
  { href: '/app/conditions', icon: 'fas fa-notes-medical', label: 'History' },
  { href: '/app/intake?section=pastEncounters', icon: 'fas fa-hospital', label: 'Encounters' },
] as const;

const VisitNotePrototype: React.FC = () => {
  const location = useLocation();
  const inPortal = location.pathname.startsWith('/app/');
  const [form, setForm] = useState<VisitNoteForm>(DEMO_FORM);
  const missing = missingCount(form);
  const note = useMemo(() => composeVisitNote(form), [form]);

  const patch = <K extends keyof VisitNoteForm>(key: K, value: VisitNoteForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleTerritory = (t: Territory) => {
    setForm((prev) => {
      const has = prev.territories.includes(t);
      return {
        ...prev,
        territories: has ? prev.territories.filter((x) => x !== t) : [...prev.territories, t],
      };
    });
  };

  return (
    <IonPage className="ct-page ct-visit-note">
      <IonContent fullscreen>
        <div className="visit-note-container">
          <header className="visit-note-header patient-insurance-header meditap-glass-header">
            <div className="visit-note-header__title-block">
              <h1>
                <i className="fas fa-file-medical" aria-hidden />
                Outpatient visit note
              </h1>
              <p className="visit-note-header__kicker">Visual prototype · does not save</p>
            </div>
            <div className="patient-insurance-header__actions">
              <HeaderLanguagePicker className="patient-insurance-header__action-btn" />
              {inPortal ? (
                <GoBackButton
                  fallback={chartPageGoBackFallback()}
                  className="patient-insurance-header__action-btn"
                />
              ) : (
                <button
                  type="button"
                  className="book-btn patient-insurance-header__action-btn"
                  onClick={() => navigatePortalHard('/visit-note-prototype')}
                >
                  Stay on preview
                </button>
              )}
            </div>
          </header>

          <div className="visit-note-toolbar" aria-label="Related clinical tools">
            {TOOLS.map((tool) => (
              <PortalNavLink key={tool.label} to={tool.href} className="visit-note-chip">
                <i className={tool.icon} aria-hidden />
                {tool.label}
              </PortalNavLink>
            ))}
          </div>

          <p className="visit-note-banner">
            MediTap glass header plus a hospital-style two-pane consult: structured fields on the
            left, a live note on the right. Sample data only.
          </p>

          <main className="visit-note-grid">
            <section className="visit-note-card" aria-label="Structured visit fields">
              <h2>Patient</h2>
              <div className="visit-note-row">
                <fieldset className="visit-note-fieldset">
                  <legend>Sex</legend>
                  <label>
                    <input
                      type="radio"
                      name="vn-sex"
                      checked={form.sex === 'female'}
                      onChange={() => patch('sex', 'female')}
                    />
                    Female
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="vn-sex"
                      checked={form.sex === 'male'}
                      onChange={() => patch('sex', 'male')}
                    />
                    Male
                  </label>
                </fieldset>
                <label className="visit-note-field">
                  Age
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.age}
                    onChange={(e) => patch('age', e.target.value)}
                    placeholder="Years"
                  />
                </label>
              </div>
              <label className="visit-note-field">
                Date of birth
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => patch('dateOfBirth', e.target.value)}
                />
              </label>
              <label className="visit-note-field">
                Referring facility
                <input
                  type="text"
                  value={form.facility}
                  onChange={(e) => patch('facility', e.target.value)}
                />
              </label>
              <label className="visit-note-field">
                Specialty
                <input
                  type="text"
                  value={form.specialty}
                  onChange={(e) => patch('specialty', e.target.value)}
                />
              </label>
              <label className="visit-note-field">
                Referral diagnosis
                <input
                  type="text"
                  value={form.diagnosis}
                  onChange={(e) => patch('diagnosis', e.target.value)}
                />
              </label>

              <fieldset className="visit-note-fieldset visit-note-fieldset--block">
                <legend>Vascular territory (select one or more)</legend>
                {(Object.keys(TERRITORY_LABEL) as Territory[]).map((t) => (
                  <label key={t}>
                    <input
                      type="checkbox"
                      checked={form.territories.includes(t)}
                      onChange={() => toggleTerritory(t)}
                    />
                    {TERRITORY_LABEL[t]}
                  </label>
                ))}
              </fieldset>

              <h2>History</h2>
              <label className="visit-note-field">
                Short history
                <input
                  type="text"
                  value={form.historyShort}
                  onChange={(e) => patch('historyShort', e.target.value)}
                />
              </label>
              <label className="visit-note-check">
                <input
                  type="checkbox"
                  checked={form.diabetes}
                  onChange={(e) => patch('diabetes', e.target.checked)}
                />
                Type 2 diabetes
              </label>
              <div className="visit-note-row">
                <label className="visit-note-field">
                  Evolution
                  <input
                    type="text"
                    value={form.evolution}
                    onChange={(e) => patch('evolution', e.target.value)}
                    placeholder="Duration"
                  />
                </label>
                <label className="visit-note-field">
                  Treatment
                  <input
                    type="text"
                    value={form.treatment}
                    onChange={(e) => patch('treatment', e.target.value)}
                  />
                </label>
              </div>
              <label className="visit-note-field">
                Current illness
                <textarea
                  rows={3}
                  value={form.currentIllness}
                  onChange={(e) => patch('currentIllness', e.target.value)}
                />
              </label>
              <label className="visit-note-field">
                Directed exam
                <textarea
                  rows={3}
                  value={form.exam}
                  onChange={(e) => patch('exam', e.target.value)}
                />
              </label>
              <label className="visit-note-field">
                Analysis
                <textarea
                  rows={3}
                  value={form.analysis}
                  onChange={(e) => patch('analysis', e.target.value)}
                />
              </label>

              <div className="visit-note-actions">
                <button type="button" className="book-btn" onClick={() => setForm(DEMO_FORM)}>
                  Reload sample
                </button>
                <button
                  type="button"
                  className="visit-note-ghost"
                  onClick={() => setForm(EMPTY_FORM)}
                >
                  Clear fields
                </button>
              </div>
            </section>

            <aside className="visit-note-card visit-note-card--note" aria-live="polite">
              <div className="visit-note-notehead">
                <h2>{note.heading}</h2>
                <p className={missing ? 'visit-note-missing' : 'visit-note-complete'}>
                  {missing
                    ? `${missing} field${missing === 1 ? '' : 's'} still empty`
                    : 'Note complete from current fields'}
                </p>
              </div>
              <p className="visit-note-notehint">
                The note assembles while you type. Nothing is stored.
              </p>
              {note.blocks.map((block) => (
                <div key={block.title} className="visit-note-block">
                  <h3>{block.title}</h3>
                  <p>{block.body}</p>
                </div>
              ))}
              {(form.evolution.trim() || form.treatment.trim()) && (
                <div className="visit-note-block">
                  <h3>Course and treatment</h3>
                  <p>
                    {[form.evolution.trim() && `Evolution: ${form.evolution.trim()}`, form.treatment.trim() && `Plan: ${form.treatment.trim()}`]
                      .filter(Boolean)
                      .join(' ')}
                  </p>
                </div>
              )}
            </aside>
          </main>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default VisitNotePrototype;
