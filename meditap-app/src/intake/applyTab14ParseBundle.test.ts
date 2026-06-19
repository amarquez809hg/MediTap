import { describe, expect, it } from "vitest";
import { applyTab14ParseBundle, mergePdfPatientFields } from "./applyTab14ParseBundle";
import type { Tab14IntakeParseResult } from "./tab14IntakeTypes";

const emptySnapshot = {
  allergies: [],
  noAllergies: false,
  insurances: [],
  medications: [],
  noMedications: false,
  chronicConditions: [],
  noChronicConditions: false,
  hospitalVisits: [],
};

const metforminBundle: Tab14IntakeParseResult = {
  patientFields: {},
  noKnownDrugAllergies: false,
  insurances: [],
  allergies: [],
  medications: [
    {
      genericName: "Metformin",
      brandName: "",
      dosage: "500 mg",
      route: "Oral",
      frequency: "Daily",
      startDate: "",
      endDate: "",
      purpose: "",
      prescribingPhysician: "",
      notesMedication: "",
    },
  ],
  chronicConditions: [],
  hospitalVisit: {},
};

const lisinoprilBundle: Tab14IntakeParseResult = {
  ...metforminBundle,
  medications: [
    {
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
    },
  ],
};

describe("mergePdfPatientFields", () => {
  it("accumulates demographics and later uploads override", () => {
    let acc = mergePdfPatientFields({}, { givenName: "Riley", familyName: "Moore" });
    acc = mergePdfPatientFields(acc, { givenName: "Rafael", familyName: "Santos", bloodType: "AB+" });
    expect(acc).toEqual({
      givenName: "Rafael",
      familyName: "Santos",
      bloodType: "AB+",
    });
  });
});

describe("applyTab14ParseBundle", () => {
  it("merges two bundles sequentially into one snapshot", () => {
    const first = applyTab14ParseBundle(emptySnapshot, metforminBundle);
    const second = applyTab14ParseBundle(first.snapshot, lisinoprilBundle);
    expect(second.snapshot.medications).toHaveLength(2);
    expect(second.stats.medicationMergeAdded).toBe(1);
  });
});
