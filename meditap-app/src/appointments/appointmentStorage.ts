export type Appointment = {
  /** Server UUID (empty string for unsaved draft). */
  id: string;
  date: string;
  time: string;
  specialist: string;
  department: string;
  type: string;
  status: string;
  reasonForVisit: string;
  location: string;
  duration: string;
  appointmentId: string;
  patientInstructions: string;
  clinicalNotes: string;
};

export const mockAppointments: Appointment[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    date: 'Wednesday, Nov 27',
    time: '10:00 AM',
    specialist: 'Dr. Evelyn Reed',
    department: 'Cardiology',
    type: 'Video Consultation',
    status: 'Confirmed',
    reasonForVisit: 'Follow-up for blood pressure and chest discomfort review.',
    location: 'MediTap Telehealth Room A',
    duration: '30 min',
    appointmentId: 'APPT-24001',
    patientInstructions: 'Bring latest BP readings and current medication list.',
    clinicalNotes: 'Assess medication tolerance and update treatment plan.',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    date: 'Monday, Dec 9',
    time: '02:30 PM',
    specialist: 'Dr. Michael Cho',
    department: 'General Practice',
    type: 'In-Office Visit',
    status: 'Confirmed',
    reasonForVisit: 'Annual wellness exam and preventive screening.',
    location: 'Lomont Clinic - Building 2',
    duration: '45 min',
    appointmentId: 'APPT-24002',
    patientInstructions: 'Fast for 8 hours before bloodwork.',
    clinicalNotes: 'Review chronic condition maintenance and immunization status.',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    date: 'Friday, Dec 20',
    time: '11:00 AM',
    specialist: 'Dr. Lena Varma',
    department: 'Dermatology',
    type: 'In-Office Visit',
    status: 'Pending',
    reasonForVisit: 'Persistent eczema flare with pruritus.',
    location: 'Lomont Clinic - Dermatology Suite',
    duration: '25 min',
    appointmentId: 'APPT-24003',
    patientInstructions: 'Avoid topical steroid use 24 hours prior to exam.',
    clinicalNotes: 'Evaluate lesion progression and adjust topical regimen.',
  },
];

export const APPOINTMENTS_STORAGE_PREFIX = 'meditap_tab4_appointments_v1';

export function appointmentsStorageKey(username: string | null): string {
  const key = (username || 'guest').trim() || 'guest';
  return `${APPOINTMENTS_STORAGE_PREFIX}:${key}`;
}

export function isAppointmentRecord(x: unknown): x is Appointment {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  const strings: (keyof Appointment)[] = [
    'date',
    'time',
    'specialist',
    'department',
    'type',
    'status',
    'reasonForVisit',
    'location',
    'duration',
    'appointmentId',
    'patientInstructions',
    'clinicalNotes',
  ];
  if (typeof o.id !== 'string') return false;
  for (const k of strings) {
    if (typeof o[k] !== 'string') return false;
  }
  return true;
}

/** Draft id for “new” row before first save (never stored in the list). */
export const NEW_APPOINTMENT_DRAFT_ID = '';

export function emptyAppointmentDraft(): Appointment {
  return {
    id: NEW_APPOINTMENT_DRAFT_ID,
    date: '',
    time: '',
    specialist: '',
    department: '',
    type: 'In-Office Visit',
    status: 'Pending',
    reasonForVisit: '',
    location: '',
    duration: '',
    appointmentId: '',
    patientInstructions: '',
    clinicalNotes: '',
  };
}

export function loadAppointmentsFromStorage(
  username: string | null
): Appointment[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(appointmentsStorageKey(username));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    if (!parsed.every(isAppointmentRecord)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Remove cached Tab4 appointments for this user after a successful API sync. */
export function clearAppointmentsLocalStorage(username: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(appointmentsStorageKey(username));
  } catch {
    /* ignore */
  }
}

/** Legacy rows used numeric ids — coerce for one-time migration. */
export function normalizeLegacyAppointmentRow(raw: Record<string, unknown>): Appointment | null {
  const id =
    typeof raw.id === 'string'
      ? raw.id
      : typeof raw.id === 'number' && Number.isFinite(raw.id)
        ? `legacy-${raw.id}`
        : '';
  if (!id) return null;
  const strings: (keyof Appointment)[] = [
    'date',
    'time',
    'specialist',
    'department',
    'type',
    'status',
    'reasonForVisit',
    'location',
    'duration',
    'appointmentId',
    'patientInstructions',
    'clinicalNotes',
  ];
  for (const k of strings) {
    if (typeof raw[k] !== 'string') return null;
  }
  return {
    id,
    date: raw.date as string,
    time: raw.time as string,
    specialist: raw.specialist as string,
    department: raw.department as string,
    type: raw.type as string,
    status: raw.status as string,
    reasonForVisit: raw.reasonForVisit as string,
    location: raw.location as string,
    duration: raw.duration as string,
    appointmentId: raw.appointmentId as string,
    patientInstructions: raw.patientInstructions as string,
    clinicalNotes: raw.clinicalNotes as string,
  };
}

export function loadLegacyAppointmentsFromStorage(
  username: string | null
): Appointment[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(appointmentsStorageKey(username));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const rows: Appointment[] = [];
    for (const item of parsed) {
      if (isAppointmentRecord(item)) {
        rows.push(item);
        continue;
      }
      if (item && typeof item === 'object') {
        const normalized = normalizeLegacyAppointmentRow(item as Record<string, unknown>);
        if (normalized) rows.push(normalized);
      }
    }
    return rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}
