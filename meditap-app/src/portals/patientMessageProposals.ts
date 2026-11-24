/**
 * Quick-select clinic message proposals for the patient portal.
 * Common non-urgent requests seen on patient messaging platforms.
 */

export type PatientMessageProposal = {
  id: string;
  label: string;
  body: string;
};

export const PATIENT_MESSAGE_PROPOSALS: PatientMessageProposal[] = [
  {
    id: 'appointment-confirm',
    label: 'Confirm appointment',
    body: 'Hi — can you confirm the date, time, and location of my next appointment?',
  },
  {
    id: 'appointment-reschedule',
    label: 'Reschedule visit',
    body: 'I need to reschedule my upcoming visit. What earlier or later times are available?',
  },
  {
    id: 'prescription-refill',
    label: 'Prescription refill',
    body: 'I would like to request a refill of my current prescription. Please let me know if you need the medication name or pharmacy details.',
  },
  {
    id: 'lab-results',
    label: 'Lab results',
    body: 'Have my recent lab results been reviewed? I would appreciate a short summary or next steps when available.',
  },
  {
    id: 'document-review',
    label: 'Document uploaded',
    body: 'I uploaded a document to my chart. Can you confirm it was received and whether anything else is needed from me?',
  },
  {
    id: 'referral-status',
    label: 'Referral status',
    body: 'Could you update me on the status of my referral or specialist order?',
  },
  {
    id: 'medication-question',
    label: 'Medication question',
    body: 'I have a non-urgent question about one of my medications (dose, timing, or side effects). When convenient, could someone from the care team advise?',
  },
  {
    id: 'follow-up',
    label: 'After-visit follow-up',
    body: 'Following my recent visit, I still have a question about the plan of care. Could someone clarify the next steps?',
  },
  {
    id: 'forms-paperwork',
    label: 'Forms / paperwork',
    body: 'Do you need any forms or paperwork from me before my next visit? Happy to complete them in the portal if available.',
  },
  {
    id: 'insurance-billing',
    label: 'Insurance / billing',
    body: 'I have a non-urgent question about my insurance on file or a recent bill. Who should I speak with?',
  },
];
