export type IncidentRecord = {
  /** Display id (e.g. I-2024-005) */
  id: string;
  /** Django incident_id when loaded from API */
  serverId?: string;
  hospitalId?: string;
  type: string;
  date: string;
  severity: string;
  location: string;
  outcome: string;
  details: string;
};

export const mockIncidents: IncidentRecord[] = [
  {
    id: 'I-2024-005',
    type: 'Acute Respiratory Infection',
    date: '2024-10-15',
    severity: 'Medium',
    location: 'Home',
    outcome: 'Resolved with antibiotics (Primary Care)',
    details:
      'Developed severe cough and fever over 3 days, leading to a prescription for Azithromycin.',
  },
  {
    id: 'I-2024-004',
    type: 'Accidental Fall',
    date: '2024-08-28',
    severity: 'Low',
    location: 'Workplace',
    outcome: 'Minor bruising (Self-treated)',
    details:
      "Slipped on wet floor in the office kitchen. No loss of consciousness or fractures. Rested knee for 2 days.",
  },
  {
    id: 'I-2023-012',
    type: 'Severe Migraine Episode',
    date: '2023-12-01',
    severity: 'High',
    location: "Patient's Home",
    outcome: 'Managed with IV medication (Emergency Room visit)',
    details:
      'Migraine persisted for over 24 hours, unresponsive to usual medication. Required stabilizing treatment at ER.',
  },
];
