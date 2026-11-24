# Athena PDF intake — training loop (before Document AI)

MediTap does **not** train a neural net when you upload Diana or Harold.  
What we *do* train is a **regression corpus**: real PDFs + minimum section expectations + completeness scoring.

## Pieces already in the repo

| Piece | Path | Role |
|-------|------|------|
| Section scorer | `meditap-app/src/intake/athenaPortabilityCompleteness.ts` | Scores every left-menu section (`filled` / `thin` / `missing` / `none_recorded`) |
| Fixture corpus | `meditap-app/src/intake/athenaFixtureCorpus.ts` | Locked PDFs + must-fill ids + known gaps |
| Corpus tests | `meditap-app/src/intake/athenaFixtureCorpus.integration.test.ts` | CI fails if a fixture regresses |
| Upload UI signal | `Tab14.tsx` notice | Shows Athena % + gap labels after parse |

Run the training lock:

```bash
cd meditap-app && npx vitest run src/intake/athenaFixtureCorpus.integration.test.ts
```

## When a new Athena PDF fails intake

1. Drop the PDF under `meditap-app/test-fixtures/dummyPDFs/`.
2. Add an entry to `ATHENA_PORTABILITY_FIXTURE_CORPUS` with:
   - `patient` name expectations
   - `minScorePercent` (start realistic; raise over time)
   - `mustBeFilled` for sections that already work
   - `knownGaps` for sections still thin/missing (training backlog)
3. Fix parsers for the **structure** (column headers / dialects), not the patient name.
4. Re-run corpus tests + Diana/Harold integration tests — both must stay green.
5. Register the work (`MT-AG-###`) and bump `mustBeFilled` / `minScorePercent` when a gap is closed.

**Rule:** a bad upload becomes a fixture + raised bar — not a one-off silent patch.

## How to read scores

- **Core intake completeness** (older banner) ≈ demographics + allergies + meds + problems + insurance. Can say 100% while Care Team is empty.
- **Athena section completeness** walks the full left menu. Prefer this for portability PDFs.

Current locked baselines (raise when parsers improve):

- Diana Smith — target high (near-full menu).
- Harold Jennings — `pastEncounters` closed (Date/Type/Performer/Notes); locked in `mustBeFilled` (`MT-AG-203`).

## What this is *not*

- Not Google Document AI (optional later for scans / unknown EHRs).
- Not LLM fine-tuning (optional later: schema-constrained fill when Athena score is low).
- Uploading in the browser does not update model weights.

## Next upgrades (product)

1. ~~Close Harold `pastEncounters`~~ — done (`MT-AG-181` parser + `MT-AG-203` corpus lock).
2. Add a third clinic Athena PDF to the corpus (when available).
3. Add a second Meditech CCD PDF to `MEDITECH_CCD_FIXTURE_CORPUS` when available.
4. ~~Close Epic Jane Doe **Payers**~~ — done (`MT-AG-203`).
5. Only then: Document AI / LLM fallback when `shouldScoreAthenaPortability` is false or score stays low.  
   **Deferred:** NextGen dialect until a real NextGen test PDF exists.

## Other EHR formats (not Athena)

| Format | Detector | Notes |
|--------|----------|-------|
| Athena Data Portability | `isAthenaPortabilityDocument` | Requires `Data Portability for …` |
| MEDITECH MyHealth CCD | `isMeditechCcdDocument` | `MEDITECH` + CCD / Patient Health Summary; **do not** loosen Athena detector |
| Epic My Health Summary | `isEpicHealthSummaryDocument` | **Canonical Epic upload:** Mayo `- as of DATE` (`epicMayoMyHealthSummaryParse.ts`) + Centralus Summary of Care |

### Epic training lock (Jane Doe Mayo)

Canonical large export: `EPIC Jane Doe My_Health_Summary.pdf` (540 pages).  
CI uses truncated snapshot text (pages 2 + 98–120):

`meditap-app/test-fixtures/dummyPDFs/epic_jane_doe_my_health_summary.snapshot.txt`

Full PDF is gitignored (~28MB) — keep a local copy under that dummyPDFs name for re-probing.

```bash
cd meditap-app && npx vitest run src/intake/epicFixtureCorpus.integration.test.ts
```

**Payers on Jane Doe:** closed (`MT-AG-203`) via Mayo note lines `Primary insurance:` / `Secondary insurance:` → Tab14 Payers (`parseEpicMayoInsurance`). Cover demographics come from **cover OCR** (`MT-AG-204`: up to 12 pages, sharper page-1 scale, chrome-only covers without Patient Name/Address also trigger OCR) + `parseEpicMayoCoverDemographics`. Baseline ≥90%. Joanna Smith remains in `updHealthSummary.integration.test.ts` (Centralus `BLUE CROSS` table).

Meditech reuses Athena TOC/section parsers where headers match; dialects live in `meditechCcdParse.ts`.

**Meditech training lock:**

```bash
cd meditap-app && npx vitest run src/intake/meditechFixtureCorpus.integration.test.ts
```

Jordan sample baseline: ≥95% left-menu completeness (same scorer as Athena).

**Upload UI:** Tab14 requires selecting Athena / MEDITECH / Epic / NextGen (or Auto-detect) before file upload (`ehrDocumentTypes.ts`, `MT-AG-138`).