import { describe, expect, it } from "vitest";
import {
  dedupeAllergyRows,
  mergeAllergiesFromPdf,
  normalizeAllergyName,
} from "./mergeTab14Allergies";
import type { Tab14AllergyRow } from "./tab14IntakeTypes";

const penicillin: Tab14AllergyRow = {
  allergyName: "Penicillin",
  allergyType: "Drug",
  allergyTypeOther: "",
  severity: "Severe",
  reactionNotes: "Hives",
  lastObserved: "2024-01-01",
};

const peanuts: Tab14AllergyRow = {
  allergyName: "Peanuts",
  allergyType: "Food",
  allergyTypeOther: "",
  severity: "Moderate",
  reactionNotes: "",
  lastObserved: "",
};

const emptyRow: Tab14AllergyRow = {
  allergyName: "",
  allergyType: "",
  allergyTypeOther: "",
  severity: "",
  reactionNotes: "",
  lastObserved: "",
};

describe("normalizeAllergyName", () => {
  it("is case-insensitive and trims whitespace", () => {
    expect(normalizeAllergyName("  Penicillin ")).toBe("penicillin");
  });

  it("strips trailing punctuation and allergy suffix", () => {
    expect(normalizeAllergyName("Penicillin.")).toBe("penicillin");
    expect(normalizeAllergyName("Penicillin allergy")).toBe("penicillin");
  });
});

describe("dedupeAllergyRows", () => {
  it("removes duplicate rows already on the form", () => {
    const dup: Tab14AllergyRow = { ...penicillin, severity: "Mild" };
    expect(dedupeAllergyRows([penicillin, dup])).toHaveLength(1);
    expect(dedupeAllergyRows([penicillin, dup])[0].severity).toBe("Severe");
  });

  it("treats punctuation variants as duplicates", () => {
    const variant: Tab14AllergyRow = {
      ...penicillin,
      allergyName: "Penicillin allergy",
    };
    expect(dedupeAllergyRows([penicillin, variant])).toHaveLength(1);
  });
});

describe("mergeAllergiesFromPdf", () => {
  it("appends new allergies without removing existing", () => {
    const result = mergeAllergiesFromPdf([penicillin], [peanuts], false);
    expect(result.allergies).toHaveLength(2);
    expect(result.allergies.map((r) => r.allergyName)).toEqual([
      "Penicillin",
      "Peanuts",
    ]);
    expect(result.addedCount).toBe(1);
    expect(result.noAllergies).toBe(false);
  });

  it("dedupes against existing (case-insensitive)", () => {
    const dup: Tab14AllergyRow = { ...peanuts, allergyName: "PEANUTS" };
    const result = mergeAllergiesFromPdf([peanuts], [dup], false);
    expect(result.allergies).toHaveLength(1);
    expect(result.addedCount).toBe(0);
  });

  it("dedupes within the incoming PDF batch", () => {
    const dup: Tab14AllergyRow = {
      ...penicillin,
      allergyName: "PENICILLIN",
      reactionNotes: "Rash",
    };
    const result = mergeAllergiesFromPdf([], [penicillin, dup], false);
    expect(result.allergies).toHaveLength(1);
    expect(result.allergies[0].reactionNotes).toBe("Hives");
    expect(result.addedCount).toBe(1);
  });

  it("dedupes existing duplicates before merging", () => {
    const dup: Tab14AllergyRow = { ...penicillin, severity: "Mild" };
    const result = mergeAllergiesFromPdf(
      [penicillin, dup],
      [peanuts],
      false
    );
    expect(result.allergies).toHaveLength(2);
    expect(result.allergies[0].severity).toBe("Severe");
    expect(result.addedCount).toBe(1);
  });

  it("skips placeholder empty rows on the form", () => {
    const result = mergeAllergiesFromPdf([emptyRow], [peanuts], false);
    expect(result.allergies).toHaveLength(1);
    expect(result.allergies[0].allergyName).toBe("Peanuts");
    expect(result.addedCount).toBe(1);
  });

  it("NKDA on empty form sets NKDA", () => {
    const result = mergeAllergiesFromPdf([emptyRow], [], true);
    expect(result.allergies).toEqual([]);
    expect(result.noAllergies).toBe(true);
    expect(result.addedCount).toBe(0);
  });

  it("NKDA on form with existing allergies does not clear them", () => {
    const result = mergeAllergiesFromPdf([penicillin], [], true);
    expect(result.allergies).toHaveLength(1);
    expect(result.noAllergies).toBe(false);
    expect(result.addedCount).toBe(0);
  });

  it("leaves form unchanged when PDF has no allergy data", () => {
    const result = mergeAllergiesFromPdf([penicillin], [], false);
    expect(result.allergies).toEqual([penicillin]);
    expect(result.addedCount).toBe(0);
  });
});
