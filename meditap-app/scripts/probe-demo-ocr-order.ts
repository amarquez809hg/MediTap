import { parseEpicPatientDemographicsBody, inventoryEpicPatientDemographics, buildEpicDemographicsOccurrenceList } from '../src/intake/epicPatientDemographics';

// Simulate OCR reading order that might skip labels for address/name
const OCR_A = `
Patient Demographics Female; born Mar. 15, 1976
4821 Maple Grove Ln
Fort Worth, TX 76102-3345
Mrs. Jane A. Smith-Doe
Former / Aliases Jane Smith Jane A. Doe
555-014-7788(Mobile) 555-014-7788(Home) jane.smithdoe@example.com
English - Spoken (Preferred) English - Written (Preferred)
White / Hispanic or Latino
Married
Note from Mayo Clinic
`;

const OCR_B = `
Patient Demographics - Female; born Mar. 15, 1976
Communication 555-014-7788(Mobile)
Language English - Spoken (Preferred) English - Written (Preferred)
Race / Ethnicity White / Hispanic or Latino
Patient Address 4821 Maple Grove Ln, Fort Worth, TX 76102-3345
Patient Name Mrs. Jane A. Smith-Doe
Marital Status Married
`;

const OCR_C = `
Patient Demographics Female; born Mar. 15, 1976
Patient Address4821 Maple Grove Ln, Fort Worth, TX 76102-3345Patient NameMrs. Jane A. Smith-Doe
Communication555-014-7788(Mobile)555-014-7788(Home)jane.smithdoe@example.com
LanguageEnglish - Spoken (Preferred)English - Written (Preferred)
Race / EthnicityWhite / Hispanic or LatinoMarital StatusMarried
`;

for (const [k, t] of [['A', OCR_A], ['B', OCR_B], ['C', OCR_C]] as const) {
  const d = parseEpicPatientDemographicsBody(t);
  console.log(k, {
    address: d.address,
    name: d.patientFullName || d.givenName,
    comm: d.communication,
    lang: d.preferredLanguage,
    race: d.race,
    eth: d.ethnicity,
    marital: d.maritalStatus,
  });
}
