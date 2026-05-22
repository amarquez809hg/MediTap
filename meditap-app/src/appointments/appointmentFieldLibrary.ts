/** Common values staff can pick when booking or editing appointments. */

export const APPOINTMENT_STATUS_OPTIONS = [
  'Pending',
  'Confirmed',
  'Cancelled',
  'Completed',
  'Rescheduled',
  'No-show',
] as const;

export const APPOINTMENT_VISIT_TYPE_OPTIONS = [
  'In-Office Visit',
  'Video Consultation',
  'Phone Consultation',
  'Home Visit',
  'Urgent Care',
  'Follow-up Visit',
  'New Patient Visit',
] as const;

export const APPOINTMENT_SPECIALIST_OPTIONS = [
  'Dr. Evelyn Reed',
  'Dr. Michael Cho',
  'Dr. Lena Varma',
  'Dr. James Patel',
  'Dr. Sarah Nguyen',
  'Dr. Robert Kim',
  'Nurse Practitioner — Rivera',
  'Physician Assistant — Brooks',
] as const;

export const APPOINTMENT_DEPARTMENT_OPTIONS = [
  'General Practice',
  'Cardiology',
  'Dermatology',
  'Orthopedics',
  'Neurology',
  'Pediatrics',
  'OB/GYN',
  'Mental Health',
  'Endocrinology',
  'Pulmonology',
  'Urgent Care',
] as const;

export const APPOINTMENT_TIME_OPTIONS = [
  '08:00 AM',
  '08:30 AM',
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '12:30 PM',
  '01:00 PM',
  '01:30 PM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '03:30 PM',
  '04:00 PM',
  '04:30 PM',
  '05:00 PM',
] as const;

export const APPOINTMENT_DURATION_OPTIONS = [
  '15 min',
  '20 min',
  '25 min',
  '30 min',
  '45 min',
  '60 min',
  '90 min',
] as const;

export const APPOINTMENT_LOCATION_OPTIONS = [
  'MediTap Main Clinic — Building 1',
  'Lomont Clinic — Building 2',
  'MediTap Telehealth Room A',
  'MediTap Telehealth Room B',
  'Lomont Clinic — Dermatology Suite',
  'Lomont Clinic — Cardiology Wing',
  'Patient home (home visit)',
  'Phone — callback line',
] as const;

export const APPOINTMENT_REASON_OPTIONS = [
  'Annual wellness exam and preventive screening.',
  'Follow-up for blood pressure and chest discomfort review.',
  'Medication review and chronic condition maintenance.',
  'Persistent symptoms — evaluate and adjust treatment plan.',
  'Post-procedure follow-up and wound check.',
  'New patient intake and history review.',
  'Lab results review and next steps.',
  'Vaccination / immunization update.',
  'Mental health check-in and care plan review.',
] as const;

export const APPOINTMENT_INSTRUCTIONS_OPTIONS = [
  'Arrive 15 minutes early with photo ID and insurance card.',
  'Bring latest vitals, medication list, and allergy information.',
  'Fast for 8 hours before bloodwork (water is OK).',
  'Avoid topical steroid use 24 hours prior to dermatology exam.',
  'Join video visit 5 minutes early; test camera and microphone.',
  'Call clinic if you need to reschedule at least 24 hours ahead.',
  'Wear loose clothing if imaging or physical exam is planned.',
] as const;

export const APPOINTMENT_CLINICAL_NOTES_OPTIONS = [
  'Review chronic condition maintenance and immunization status.',
  'Assess medication tolerance and update treatment plan.',
  'Evaluate symptom progression; document vitals and exam findings.',
  'Coordinate referrals and order follow-up labs if indicated.',
  'Patient education provided; return precautions discussed.',
  'No acute distress; continue current regimen pending labs.',
] as const;

export const APPOINTMENT_ID_AUTO_LABEL = 'Auto-generate on save';

export const APPOINTMENT_ID_PRESETS = [
  APPOINTMENT_ID_AUTO_LABEL,
  'APPT-URGENT',
  'APPT-FOLLOWUP',
  'APPT-WELLNESS',
] as const;

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/** Relative booking dates matching existing appointment card formatting. */
export function buildAppointmentDatePresets(): string[] {
  const base = new Date();
  base.setHours(12, 0, 0, 0);
  const offsets = [0, 1, 3, 7, 14, 21, 30];
  return offsets.map((days) => {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return formatDisplayDate(d);
  });
}

export function suggestAppointmentId(nextNumericId: number): string {
  return `APPT-${String(nextNumericId).padStart(5, '0')}`;
}
