import { describe, expect, it } from "vitest";
import {
  dedupeChronicRows,
  dedupeInsuranceRows,
  dedupeMedicationRows,
  fillEmptyInsuranceFields,
  hasHospitalVisitData,
  mergeChronicConditionsFromPdf,
  mergeHospitalVisitFromPdf,
  mergeInsurancesFromPdf,
  mergeMedicationsFromPdf,
} from "./mergeTab14IntakeUpload";
import type {
  Tab14ChronicRow,
  Tab14HospitalFields,
  Tab14InsuranceRow,
  Tab14MedicationRow,
} from "./tab14IntakeTypes";

const metformin: Tab14MedicationRow = {
  genericName: "Metformin",
  brandName: "Glucophage",
  dosage: "500 mg",
  route: "Oral",
  frequency: "Twice daily",
  startDate: "2023-11-01",
  endDate: "",
  purpose: "Diabetes",
  prescribingPhysician: "Dr. Patel",
  notesMedication: "",
};

const lisinopril: Tab14MedicationRow = {
  genericName: "Lisinopril",
  brandName: "",
  dosage: "10 mg",
  route: "Oral",
  frequency: "Daily",
  startDate: "",
  endDate: "",
  purpose: "",
  prescribingPhysician: "",
  notesMedication: "",
};

const diabetes: Tab14ChronicRow = {
  conditionName: "Type 2 Diabetes Mellitus",
  icdCode: "E11.9",
  diagnosisDate: "2018-05-10",
  severity: "Moderate",
  prexisting: "Yes",
  notesChronicConditions: "Diet counseling",
};

const hypertension: Tab14ChronicRow = {
  conditionName: "Hypertension",
  icdCode: "I10",
  diagnosisDate: "",
  severity: "",
  prexisting: "",
  notesChronicConditions: "",
};

const aetnaPrimary: Tab14InsuranceRow = {
  providerName: "Aetna",
  policyNumber: "POL-12345",
  planName: "Gold PPO",
  memberID: "",
  groupNumber: "GRP-99",
  startDate: "2024-01-01",
  endDate: "",
};

const aetnaSecondary: Tab14InsuranceRow = {
  providerName: "Blue Cross",
  policyNumber: "BC-67890",
  planName: "Silver HMO",
  memberID: "MEM-111",
  groupNumber: "",
  startDate: "",
  endDate: "",
};

describe("mergeMedicationsFromPdf", () => {
  it("appends new medications and keeps existing", () => {
    const result = mergeMedicationsFromPdf([metformin], [lisinopril]);
    expect(result.rows).toHaveLength(2);
    expect(result.addedCount).toBe(1);
  });

  it("dedupes by generic name, dosage, and frequency", () => {
    const dup: Tab14MedicationRow = {
      ...metformin,
      brandName: "Different brand",
    };
    const result = mergeMedicationsFromPdf([metformin], [dup]);
    expect(result.rows).toHaveLength(1);
    expect(result.addedCount).toBe(0);
  });

  it("allows same drug with different dosage", () => {
    const higher: Tab14MedicationRow = { ...metformin, dosage: "1000 mg" };
    const result = mergeMedicationsFromPdf([metformin], [higher]);
    expect(result.rows).toHaveLength(2);
    expect(result.addedCount).toBe(1);
  });

  it("dedupes duplicates already on the form", () => {
    expect(dedupeMedicationRows([metformin, { ...metformin }])).toHaveLength(1);
  });
});

describe("mergeChronicConditionsFromPdf", () => {
  it("appends new conditions and keeps existing", () => {
    const result = mergeChronicConditionsFromPdf([diabetes], [hypertension]);
    expect(result.rows).toHaveLength(2);
    expect(result.addedCount).toBe(1);
  });

  it("dedupes by ICD code", () => {
    const dup: Tab14ChronicRow = {
      ...diabetes,
      conditionName: "T2DM",
      icdCode: "E11.9",
    };
    const result = mergeChronicConditionsFromPdf([diabetes], [dup]);
    expect(result.rows).toHaveLength(1);
    expect(result.addedCount).toBe(0);
  });

  it("dedupes by condition name when ICD missing", () => {
    const a: Tab14ChronicRow = { ...hypertension, icdCode: "" };
    const b: Tab14ChronicRow = { ...hypertension, icdCode: "", conditionName: "HYPERTENSION" };
    expect(dedupeChronicRows([a, b])).toHaveLength(1);
  });
});

describe("mergeInsurancesFromPdf", () => {
  it("appends new insurance rows and keeps existing", () => {
    const result = mergeInsurancesFromPdf([aetnaPrimary], [aetnaSecondary]);
    expect(result.rows).toHaveLength(2);
    expect(result.addedCount).toBe(1);
    expect(result.filledFieldCount).toBe(0);
  });

  it("dedupes by policy number and fills empty fields", () => {
    const partial: Tab14InsuranceRow = {
      providerName: "Aetna",
      policyNumber: "POL-12345",
      planName: "",
      memberID: "",
      groupNumber: "",
      startDate: "",
      endDate: "",
    };
    const incoming: Tab14InsuranceRow = {
      ...aetnaPrimary,
      planName: "Gold PPO Updated",
      memberID: "MEM-555",
    };
    const result = mergeInsurancesFromPdf([partial], [incoming]);
    expect(result.rows).toHaveLength(1);
    expect(result.addedCount).toBe(0);
    expect(result.filledFieldCount).toBeGreaterThan(0);
    expect(result.rows[0].planName).toBe("Gold PPO Updated");
    expect(result.rows[0].memberID).toBe("MEM-555");
    expect(result.rows[0].startDate).toBe("2024-01-01");
  });

  it("treats policy numbers with different punctuation as the same policy", () => {
    const variant: Tab14InsuranceRow = {
      ...aetnaPrimary,
      policyNumber: "POL12345",
    };
    const result = mergeInsurancesFromPdf([aetnaPrimary], [variant]);
    expect(result.rows).toHaveLength(1);
    expect(result.addedCount).toBe(0);
  });

  it("does not overwrite populated insurance fields", () => {
    const fill = fillEmptyInsuranceFields(aetnaPrimary, {
      ...aetnaPrimary,
      providerName: "Other Carrier",
      planName: "Other Plan",
    });
    expect(fill.row.providerName).toBe("Aetna");
    expect(fill.row.planName).toBe("Gold PPO");
    expect(fill.filledFieldCount).toBe(0);
  });

  it("dedupes duplicates already on the form", () => {
    expect(dedupeInsuranceRows([aetnaPrimary, { ...aetnaPrimary }])).toHaveLength(1);
  });
});

describe("mergeHospitalVisitFromPdf", () => {
  it("fills empty fields without overwriting existing values", () => {
    const existing: Tab14HospitalFields = {
      facilityName: "St. Jude Medical Center",
      visitDate: "2024-09-15",
    };
    const incoming: Tab14HospitalFields = {
      facilityName: "Other Hospital",
      visitDate: "2025-01-01",
      attendingPhysician: "Dr. Sharma",
      reason: "Follow-up",
    };
    const result = mergeHospitalVisitFromPdf(existing, incoming);
    expect(result.visit.facilityName).toBe("St. Jude Medical Center");
    expect(result.visit.visitDate).toBe("2024-09-15");
    expect(result.visit.attendingPhysician).toBe("Dr. Sharma");
    expect(result.visit.reason).toBe("Follow-up");
    expect(result.addedFieldCount).toBe(2);
  });

  it("detects when incoming has hospital data", () => {
    expect(hasHospitalVisitData({ facilityName: "General Hospital" })).toBe(true);
    expect(hasHospitalVisitData({})).toBe(false);
  });
});
