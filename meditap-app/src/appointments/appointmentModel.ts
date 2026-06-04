import type {
  PatientAppointmentApi,
  PatientAppointmentWriteBody,
} from '../api';
import type { Appointment } from './appointmentStorage';

export function mapPatientAppointmentApiToRow(
  api: PatientAppointmentApi
): Appointment {
  return {
    id: api.appointment_id,
    appointmentId: api.appointmentId ?? '',
    date: api.date ?? '',
    time: api.time ?? '',
    specialist: api.specialist ?? '',
    department: api.department ?? '',
    type: api.type ?? 'In-Office Visit',
    status: api.status ?? 'Pending',
    reasonForVisit: api.reasonForVisit ?? '',
    location: api.location ?? '',
    duration: api.duration ?? '',
    patientInstructions: api.patientInstructions ?? '',
    clinicalNotes: api.clinicalNotes ?? '',
  };
}

export function appointmentDraftToWriteBody(
  patientId: string,
  draft: Appointment
): PatientAppointmentWriteBody {
  return {
    patient: patientId,
    appointmentId: draft.appointmentId.trim() || undefined,
    date: draft.date,
    time: draft.time,
    specialist: draft.specialist,
    department: draft.department,
    type: draft.type,
    status: draft.status,
    reasonForVisit: draft.reasonForVisit,
    location: draft.location,
    duration: draft.duration,
    patientInstructions: draft.patientInstructions,
    clinicalNotes: draft.clinicalNotes,
  };
}
