# MediTap — Opportunity areas (PDF intake + portal)

**Document type:** Product / planning (opportunity areas)  
**Key:** `MT-AG-202`  
**Type:** Product / Planning  
**Audience:** Product, engineering, and clinical stakeholders  
**Status:** Opportunity brief — prioritized; not implemented in this document  
**Date:** 2026-11-11  
**Language:** English (companion to Spanish brief)  
**Branch / workspace:** `feature/portal-split` · `/Users/amarquez/Desktop/MediTap`  
**Scope:** Gaps and improvements for PDF recognition (Tab14) and portal/site features to make MediTap more competitive and complete  
**Out of scope:** Security vendor implementation (see `MT-AG-200` / `MT-AG-201`); code changes in this delivery

**Related:** `docs/ATHENA_INTAKE_TRAINING.md`, `docs/MEDITAP_AGENT_HANDOFF.md`, Tab14 pipeline (`tab14DocumentParse.ts`, Athena / Epic / MEDITECH dialects)

**Spanish original:** `docs/MEDITAP_OPPORTUNITY_AREAS_PDF_PORTAL_2026-11-11.md`

---

## Register entry

**Type:** Product / Planning

**Key:** `MT-AG-202`

**Summary:** Document MediTap PDF intake and portal opportunity areas, site benefits, and a three-sprint packaging.

**What was done:**

- Inventory of real PDF intake gaps (dialects, OCR, NextGen stub, legacy Results, misleading scores).
- P0–P2 proposals for PDF and portal (messaging, FHIR, review queue, audit).
- Three-sprint packaging with business / competitiveness benefit per area.
- Word/PDF export of the brief for stakeholder review (Spanish + English).

**Outcome:** Clear roadmap: close corpus and OCR gaps first; unify Results + review queue; then messaging and FHIR. Treat the current dialect engine as an asset, not something to replace.

**Primary paths:** `docs/MEDITAP_OPPORTUNITY_AREAS_PDF_PORTAL_2026-11-11.md` (+ `_EN.md`, `.docx`, `.pdf`)  
**Branch:** `feature/portal-split`

---

## 1. Executive summary

MediTap already has a **differentiating asset**: PDF intake on Tab14 with Athena, Epic, and MEDITECH dialects, OCR fallback, provenance warnings, and API persistence. That is non-trivial compared with portals that only say “upload your PDF” without clinical structure.

What is still missing to look **complete and competitive** (MyChart-class / serious clinical import) is not a rewrite of the engine, but:

1. **Raise accuracy** where the corpus and OCR still fail.  
2. **Close product promises** (NextGen in the selector, second-class Results).  
3. **Add portal capabilities** that PDF alone cannot solve: messaging, FHIR sync, staff review queue, and usable audit.

| Question | Short answer |
|----------|--------------|
| Is PDF intake weak? | No — strong on Athena/Epic/MEDITECH; fragile at the edges (OCR cover, gaps, NextGen). |
| What benefits the site most? | Perceived accuracy + staff trust + patient flow (messages / visits / labs). |
| What not to do first? | Generic AI with no human in the loop, or a rewrite of the dialect parser. |

---

## 2. Current state (asset)

| Capability | Status |
|------------|--------|
| pdf.js extract + Tesseract OCR (sparse pages) | Live in local / Tab14 pipeline |
| Athena Data Portability, Epic My Health / Mayo, MEDITECH CCD dialects | Mature with corpora and tests |
| NextGen in EHR selector | **Stub** — falls through to generic extract |
| Accept/Reject warnings + Save API | Done |
| Appointments / chronic / labs / incidents with API + quick-pick | Done (Sprint B/C) |
| Patient–clinic messaging | No |
| Production FHIR write-back | No (sandbox / roadmap) |
| RxNorm / SNOMED / LOINC validation | No (hints / free text only) |

---

## 3. Gaps and opportunity areas — PDF recognition

### 3.1 Gap inventory

| # | Gap | Impact on the site |
|---|-----|--------------------|
| F1 | Dialect gaps (e.g. Harold `pastEncounters`; Epic **Payers**) — **closed `MT-AG-203`** | Staff sees empty sections after a “successful” parse; trust drops |
| F2 | Thin training corpus (few PDFs per vendor) | Each new clinic reopens regressions |
| F3 | **NextGen** advertised but not implemented | Broken product promise in the selector |
| F4 | Fragile OCR on scanned covers; ~8-page cap — **improved `MT-AG-204`** (12 pages, cover scale 3.5, chrome-only) | Incomplete Epic/Mayo demographics or dirty phone numbers |
| F5 | Bleed / junk rows (med wrap, imaging junk) when vendor/Auto fails | Contaminated clinical data in the chart |
| F6 | **Results** on legacy UI vs extended cards — **closed `MT-AG-205`** | Labs feel second-class vs the rest of intake |
| F7 | “100% core” score with empty Care Team | Misleading metric for product and demos |
| F8 | No Document AI / LLM fallback with threshold + human review | Odd PDFs unrecoverable without more rule engineering |
| F9 | No EHR write-back | MediTap imports; does not close the loop with the clinic EHR |

### 3.2 PDF proposals and site benefit

| Priority | Proposal | Benefit to the site |
|----------|----------|---------------------|
| **P0** | ~~Close Athena/Epic gaps~~ Harold Past Encounters + Epic Payers (`MT-AG-203`). Still open: 3rd Athena PDF + 2nd MEDITECH CCD | Higher % of filled sections in demos and real clinics → fewer “the PDF did not work” moments |
| **P0** | NextGen dialect + fixtures — **deferred** (no test PDF yet) | Selector keeps its promise; multi-EHR sales stay honest |
| **P0** | ~~Stronger OCR~~ (`MT-AG-204`) — finer adaptive DPI / Document AI still open | Usable demographics on scanned exports (common Epic case) |
| **P1** | LLM/Document AI fallback when dialect score &lt; threshold + human review | Competitive vs “magic” import without losing clinical control |
| **P1** | RxNorm / SNOMED / LOINC validation | Clinical differentiator; less ambiguous free text |
| **P1** | ~~Unify Results with extended cards~~ (`MT-AG-205`); per-field confidence still open | One intake experience; labs at the same level |
| **P2** | Stronger auto-vendor + “extracted / missing” report per section | Staff trains the corpus faster; fewer tickets |
| **P2** | Multi-PDF merge for the same patient (dedupe) | Real case: several exports in one visit |

---

## 4. Opportunity areas — portal / site

| Priority | What is missing | Benefit to the site |
|----------|-----------------|---------------------|
| **P0** | Patient ↔ clinic **messaging** | Parity with competitor portals; retention and support |
| **P0** | **Admin review** queue for PDF intake (Accept/Reject at scale) | Provenance exists; daily staff work product does not |
| **P1** | **FHIR** read/write sync with a human gate | From “PDF hero” to “connected chart” with hospitals |
| **P1** | Usable HIPAA audit (who viewed/edited PHI) | B2B / compliance trust; more than an activity trail |
| **P1** | One alert truth (visits, labs, incidents) on Dashboard + Quick Status | Fewer fragmented demos; clearer clinical workflow |
| **P2** | Patient view-only portal (no staff chrome) | Clarity and trust for the end user |
| **P2** | Notifications (new lab, visit, document ready) | Engagement without relying only on login |
| **P2** | CCD/FHIR export + security narrative (vendors) | Stronger hospital / partner conversation |

---

## 5. How this makes the site more competitive

| Front | Today | With these proposals |
|-------|-------|----------------------|
| **Clinical import** | Strong on 3 vendors; broken edges | Credible multi-EHR + OCR/AI with a human |
| **Staff trust** | Per-field warnings | Review queue + per-section report + terminology |
| **Patient experience** | Chart + status + visits | + messages + notifications + clean view |
| **B2B story** | PDF + JWT + local hardening | + FHIR + audit + clinical code validation |
| **Sales demo** | Antonio fixtures / Diana / Jane Doe | Fewer visible gaps; Results at the same visual level |

**Product message:** MediTap is not competing only as “another appointments app.” It competes as a **clinical portability layer** (PDF → structured chart → portal). This brief strengthens that thesis: import accuracy, staff operations, and EHR ecosystem connection.

---

## 6. Recommended three-sprint packaging

### Sprint A — PDF accuracy (P0)

- Close known dialect gaps.  
- Real NextGen, or remove it from the selector until fixtures exist.  
- Improve cover / demographics OCR.

**Benefit:** each upload “fails less” on first impression — the metric that hurts most in demos.

### Sprint B — Intake product (P1 PDF)

- Unified Results.  
- Staff review queue.  
- Terminology (start RxNorm/SNOMED/LOINC).  
- Optional: threshold → Document AI with mandatory Accept/Reject.

**Benefit:** intake stops being “parser + form” and becomes a **clinical workflow**.

### Sprint C — Complete portal (P0–P1 site)

- Messaging.  
- FHIR read (then write-back with a gate).  
- Audit pack.  
- Unified Dashboard / Quick Status alerts.

**Benefit:** the site feels like continuous care software, not only a PDF importer.

---

## 7. What this document does not include

- New parser or UI code.  
- Date commitments or vendor pricing.  
- A claim of clinical accuracy percentage (today the bar is *section completeness*, not “% correct diagnosis”).  
- Replacing the dialect engine with LLM-only.

---

## 8. Next actions

| # | Action | Suggested owner |
|---|--------|-----------------|
| 1 | Pick Sprint A: Athena/Epic gaps **or** NextGen **or** cover OCR | Product + engineering |
| 2 | Keep corpora (`ATHENA_INTAKE_TRAINING.md`) as the quality gate | Engineering |
| 3 | Decide: implement NextGen or hide it from the selector until fixtures | Product |
| 4 | Design the review queue (reuse provenance UI) | Product + UX |
| 5 | Keep the security validation track in parallel (`MT-AG-200`) | Ops / compliance |

---

## 9. Internal references

- Handoff and backlog: `docs/MEDITAP_AGENT_HANDOFF.md`  
- Athena training / gaps: `docs/ATHENA_INTAKE_TRAINING.md`  
- Parse router: `meditap-app/src/intake/tab14DocumentParse.ts`  
- OCR: `meditap-app/src/intake/documentTextExtraction.ts`  
- Portability nav: `meditap-app/src/intake/tab14PortabilitySections.ts`  
- Security vendors: `docs/MEDITAP_SECURITY_VALIDATION_OPTIONS_2026-11-05.md`
