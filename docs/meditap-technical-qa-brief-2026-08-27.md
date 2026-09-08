# MediTap — Technical Q&A Brief

**Document type:** Concise technical briefing (investor / partner / leadership talking points)  
**Audience:** Founders, advisors, and non-engineering stakeholders who need accurate answers  
**Status:** Reflects the product as of **August 27, 2026** (local Docker stack + `feature/portal-split` working tree)  
**Style:** Same report structure as Lomont Vista / Cargo Pulse weekly briefs; MediTap brand  
**Confidential**

---

## Executive snapshot

| Topic | One-line answer |
|--------|-----------------|
| What exists today | **Working user portal** (dashboard, appointments, meds/allergies via intake + chart, labs, insurance, conditions, incidents) + **working admin portal** (staff login, patients, charts, hospitals, document review, activity) + multi-EHR PDF intake |
| What is not done | Production EHR write-back, full HIPAA audit product, live NFC card registry |
| OCR | Yes — **Tesseract.js** in the browser (on-demand), for images and sparse PDF pages |
| LLMs | **No** — extraction is rule/heuristic parsers, not ChatGPT-style models |
| FHIR | Planned for EHR integration; not the current PDF intake path |
| Safe claims | Do **not** claim HIPAA certification, clinical-grade accuracy %, or live EHR sync yet |

**Bottom line:** MediTap today is a **working dual-portal chart product** (patient app + clinic admin) with live APIs for appointments, labs, insurance, chronic conditions, incidents, and intake — plus a PDF/CCD intake engine. It is **not** yet a certified EHR connector.

---

## 1. Current product / what we’ve built

### What have we actually built and successfully tested as of today?

**Core product (this is the main story — not only recent PDF fixtures):**

#### User portal (patient-facing — tested / in daily demo use)

| Area | What works |
|------|------------|
| **Dashboard** | Home, chart previews, next steps, staff-gated add flows |
| **Quick Status** | KPI cards and urgent next steps into the rest of the chart |
| **Appointments** | Working appointment cards + manage modal; **Django appointments API** (not localStorage-only) |
| **Chronic conditions** | API-backed condition records + staff quick-pick |
| **Incidents / hospital visits** | API-backed incident cards + staff quick-pick |
| **Lab results** | `PatientLabPanel` API + staff quick-pick catalog |
| **Insurance / payers** | API-backed insurance records + staff elevation for edits |
| **Patient information (intake)** | Full demographics + clinical sections; Save hydrates from / persists to API |
| **Medications & allergies** | Structured lists in intake/chart (import + staff edit paths) |
| **Settings** | Preferences, dark mode, logout, MediTap card status (demo) |
| **Auth / kiosk** | Patient JWT login; **staff elevation** unlocks clinical edits without kicking the patient out |

#### Admin portal (clinic staff — working shell, not a stub)

| Area | What works |
|------|------------|
| **Staff login door** | `/admin-portal/login` — patients blocked from admin routes |
| **Admin home / panel** | Dashboard shell, shortcuts, ops entry points |
| **Patient search & hub** | List/search patients; select patient context for on-behalf work |
| **Clinical charts** | Profile + open chart sections; **embedded patient view** inside admin |
| **On-behalf chart ops** | Intake, labs, appointments, insurance (and related deep links) for the selected patient |
| **Hospitals** | Create / list / edit hospital facilities |
| **Document vault / review** | Patient uploads → staff review queue and status |
| **Activity trail** | Starter admin activity log (who did what — not full HIPAA audit yet) |
| **Epic panel** | Sandbox-oriented Epic connect UI (partial; not production sync) |

#### Platform under both portals

- **Chart APIs** on Django/Postgres: demographics, allergies, medications, insurance, labs, chronic conditions, appointments, hospital visits, documents, preferences.
- **Local stack:** Docker Compose — Postgres 16, Django API (`:8080`), Ionic/Vite SPA (`:8100`).

#### Intake / PDF (important capability — supporting the chart, not the whole product)

- PDF + image upload with EHR source selector (Athena, MEDITECH, Epic, NextGen planned, Generic/Other, Auto).
- Vendor dialect parsers + Accept/Reject flagged fields before Save.
- **Fixture corpora** (Athena / MEDITECH / Epic) are a **regression training loop** for parsers — typically **≥90–95% section completeness on locked demo PDFs**. They prove parser quality; they are **not** the definition of “what MediTap is.”

### What parts are currently functional vs. still being developed/planned?

| Functional today (shipped in demos) | In progress / partial | Planned / not claimed |
|-------------------------------------|------------------------|------------------------|
| **User portal chart surfaces** (dashboard, status, appointments, conditions, incidents, labs, insurance, intake, settings) | Portal split polish | Production multi-tenant EHR sync |
| **Admin portal** (login, patients, charts embed, hospitals, documents, activity) | Chronic/incidents on-behalf polish; work-queue heuristics | Full HIPAA audit product |
| Chart CRUD via Django REST + staff elevation | Tab14 API-only cleanup remainder | LLM-assisted understanding |
| PDF/image extract + dialect parsers | NextGen specialized parser; broader corpus | Live NFC/RFID card backend registry |
| Document vault v1 + parse snapshot | Admin apply-to-chart polish | Certified production Epic/Cerner/athena write-back |
| Epic sandbox / OAuth exploration | FHIR resource mapping | Independent clinical accuracy study |

### What programming languages are we using?

- **TypeScript / JavaScript** — frontend SPA, parsers, OCR wiring, unit/integration tests (Vitest).
- **Python** — Django backend, migrations, permissions, document APIs.
- **SQL** — via PostgreSQL / Django ORM.
- **Shell / Docker** — local and VM deployment.

### What frameworks/libraries are we using?

- **Frontend:** React 19, Ionic React 8, React Router 5, Vite, react-i18next, pdf.js (`pdfjs-dist`), Tesseract.js, Capacitor (mobile packaging path).
- **Backend:** Django, Django REST Framework, SimpleJWT, django-cors-headers, Postgres driver.
- **Tooling:** Docker Compose, Vitest, ESLint, optional Keycloak-era deploy docs (current default stack is **Django JWT**, not Keycloak).

### What is our current tech stack?

| Layer | Choice |
|-------|--------|
| Frontend | Ionic React + Vite SPA (tabs + `/app` + `/admin-portal`) |
| Backend | Django REST API (`medapp` + `medical`) |
| Database | PostgreSQL 16 |
| Auth | Native Django users + JWT; staff elevation token |
| Files | `PatientDocument` FileField (+ parse snapshot JSON) |
| Local hosting | Docker Compose (dev); GCP VM Docker notes for demos |
| External APIs | Epic on FHIR **assessed / sandbox-oriented** — not production sync |
| OCR | Tesseract.js (client-side) |
| AI/LLM | None in the intake path today |

### What does each technical team member specifically handle?

Public roster for this MediTap product build is **not fully enumerated in-repo**. Known ownership from current engineering workflow:

| Focus area | Who / note |
|------------|------------|
| Product continuity, intake UX, agent register, Tab14 dialects | **Antonio** (owner workflow in MediTap agent docs) |
| Frontend SPA / portals / parsers | Engineering on `meditap-app/` (assign names in leadership deck) |
| Backend API / models / permissions | Engineering on `backend/` (assign names in leadership deck) |
| Infra / Docker / GCP demo hosts | Ops as assigned for demos |

*Action:* replace the table above with named roles before external sharing if investors expect a full org chart.

### If someone asks, “What does your backend actually do?” what is the simplest accurate answer?

**It is the system of record and security gate for MediTap charts.** It authenticates patients and staff, stores structured chart data (appointments, labs, meds/allergies, insurance, conditions, incidents, demographics, documents), and exposes REST APIs both portals use. PDF understanding mostly runs in the browser; the backend persists the results and originals.

---

## 2. Medical record upload & processing

*(PDF intake is one capability that **feeds** the working chart — appointments, labs, insurance, etc. already exist as first-class portal features with or without an upload.)*

### Walk me through exactly what happens when someone uploads a PDF, screenshot, scan, or photo

1. User selects **EHR document source** (Athena / MEDITECH / Epic / …) on Tab14.  
2. User uploads PDF or image.  
3. **Browser** extracts text: PDF text layer via **pdf.js**; if sparse/image/cover page → **OCR** (Tesseract.js).  
4. Dialect / general parsers map text → Tab14 fields and lists (meds, allergies, labs, etc.).  
5. UI shows **flagged** imports; user **Accepts / Rejects**; completeness hints may appear.  
6. On Save (and document upload flows), structured data and/or file + **parse snapshot** go to the **Django API / Postgres**.  
7. Staff can review documents in the admin document queue; chart field edits remain staff-gated where designed.

### How are we reading/extracting information from those records?

- **Native PDF text** when the export has a text layer.  
- **OCR** for images and text-poor pages.  
- **Vendor-specific parsers** (Athena Data Portability, MEDITECH CCD, Epic My Health Summary dialects, etc.) plus a **general extract** fallback.  
- Pattern/section heuristics — **not** free-form LLM summarization.

### Are we currently using OCR? Which technology?

**Yes.** **Tesseract.js** (open-source OCR), loaded on demand in the client. Used for images and for sparse / leading PDF pages (e.g. Epic cover demographics).

### Are we currently using AI/LLMs?

**No** for understanding or organizing records today. No OpenAI/Anthropic/etc. in the intake pipeline. Future LLM assist would be a **separate, explicit** product decision (with PHI and accuracy implications).

### What types of information can we currently extract?

Depends on vendor PDF quality, but the intake surface covers (among others):

Demographics, related persons, care team, assessment, plan of treatment, reason for referral, results/labs, problems, procedures, medical equipment, allergies, medications, vitals, social / functional / mental status, family & medical history, immunizations, past encounters, goals, health concerns, advance directives, payers, notes, plus Athena-oriented extras (patient instructions, surgical history, imaging results, procedure notes, obstetrics) when present.

### How does the backend determine what each piece means and where it belongs?

**Mostly it doesn’t — the frontend parsers do.** Mapping is code: section headers, table layouts, and field labels → MediTap models/serializers. The backend validates auth/permissions and stores typed fields. Preferred EHR selection **gates which specialized parser runs**.

### How do we convert unstructured PDF/image into structured patient data?

Unstructured file → plain text (pdf.js ± OCR) → dialect/general parsers → typed objects (patient fields, arrays of allergies/meds/labs/…) → UI review → API persist.

### How and where is that structured data stored?

**PostgreSQL** via Django models (`Patient`, allergies, medications, labs, insurance, chronic, appointments, documents, etc.). Uploaded files as `PatientDocument.file`; optional `parse_snapshot` JSON for staff apply flows.

### What happens to the original uploaded PDF/image after it is processed?

It can be **retained as a PatientDocument** (vault) with status (pending review / reviewed / applied / rejected), not discarded by default after parse. Retention/deletion policy for production HIPAA ops is still a **compliance design** item.

---

## 3. Accuracy / validation

### How do we make sure MediTap extracts medical information accurately?

- Vendor-specific parsers trained against **real fixture PDFs**.  
- Automated **corpus tests** with minimum section completeness.  
- **Human Accept/Reject** on flagged fields before Save.  
- Staff elevation / admin review for chart edits and document apply.

### What if the image is blurry, incomplete, handwritten, or formatted strangely?

OCR/text quality degrades; fields stay empty or get flagged. Generic/Other + general extract is weaker than a matching dialect. Handwriting is a **known hard case** — do not promise reliable handwritten extraction.

### What if the system is unsure?

Fields are left empty or marked as PDF-import warnings for **Accept / Reject**. Unresolved warnings can block Save (review gate).

### Do we currently have or plan to have confidence scores?

- **Today:** intake / portability **completeness** scores (coverage of sections), not per-token medical confidence.  
- **Planned (optional):** true confidence / uncertainty scoring would be a later design — not shipping as clinical probability scores today.

### Is there a human/provider verification step before information would enter an EHR?

**Yes in product intent:** patient Accept/Reject + staff review before chart apply; **EHR write-back is not live**, so nothing is auto-pushed into Epic/Cerner/athena today. Future EHR send must keep a **human verification** gate.

### How would we prevent incorrect medication, dosage, diagnosis, allergy, etc.?

- Prefer structured vendor exports over photos when possible.  
- Dialect parsers over generic OCR mush.  
- Flag + human confirm.  
- Staff-only clinical edits.  
- Future: FHIR validation, terminology (RxNorm/SNOMED/LOINC), and never silent overwrite of EHR gold data without review.

### Have we measured extraction accuracy yet? What can I safely mention?

**Safe to say:** On locked **demo fixtures**, section-completeness gates are typically **≥90–95%** for Athena / MEDITECH / Epic training PDFs (automated tests).  

**Do not say:** “95% clinical accuracy,” “FDA-cleared,” or “matches physician charting quality” — those studies are **not** published from this codebase.

---

## 4. EHR integration / future development

### Since we are not currently integrated with an EHR, what still needs to be built?

- Production OAuth / SMART on FHIR (or vendor APIs) per customer.  
- FHIR client + token lifecycle on the **MediTap backend**.  
- Resource mapping (Patient, AllergyIntolerance, MedicationRequest, Observation, Condition, Encounter, …).  
- Sync policy, conflict rules, provenance (`external_id`, last sync).  
- Legal: BAAs, customer enablement, scopes.  
- Write-back only where allowed; UI for “sent to EHR” / errors.

*(See also `docs/epic-fhir-meditap-integration-report.md`.)*

### Once MediTap structures the information, how would we eventually transfer it into a physician’s EHR?

Authenticated API calls from **MediTap’s server** to the practice’s EHR FHIR (or vendor) endpoint — not by emailing PDFs. Prefer create/update of discrete resources after review.

### Are we planning to use FHIR?

**Yes** as the primary interoperability path (especially Epic on FHIR / SMART).

### Explain FHIR in simple terms

**FHIR is a shared language for health data over the web** — like standardized JSON “forms” for patient, meds, labs, allergies — so apps and EHRs can exchange pieces of the chart without inventing a new private format each time.

### Other healthcare standards we expect to use?

| Standard | Role |
|----------|------|
| FHIR R4 (primary) | API resources |
| SMART on FHIR / OAuth 2.0 | Authorization |
| CCD / C-CDA (already in intake) | Document exports we **parse today** |
| Terminology (RxNorm, SNOMED, LOINC) | Coding meds/problems/labs (planned hardening) |
| HIPAA / BAA process | Compliance (ops/legal), not a wire protocol |

### Would MediTap convert extracted information into FHIR resources before sending?

**Yes for FHIR-based EHRs** — map MediTap models → FHIR resources, then POST/PUT as permitted. Intake today maps PDF → **MediTap models**, not FHIR first.

### Would integration require permission/API access from the practice or EHR company?

**Yes.** Sandbox ≠ production. Each health system / EHR customer enables apps, scopes, and endpoints. BAAs and operational approval apply.

### Separate integrations for Epic, Oracle Health/Cerner, athenahealth?

**Shared architecture** (OAuth + FHIR client + mapping), **per-vendor adapters** and capability differences. Not one magical universal plug with zero work — but not a full rewrite per logo either.

### Biggest technical barriers to EHR integration?

Customer-by-customer enablement; scope limits; identity binding; write permissions; version/capability variance; PHI security; liability for automated writes; rate limits / ops.

### “Why can’t Epic (or another EHR) already do this?”

EHRs optimize **inside their network**. Patients still arrive with **outside** PDFs/CCDs from other systems. MediTap targets **patient-mediated portability** and structured intake **before** or **beside** the destination EHR — not replacing Epic’s internal charting.

### “How is MediTap different from simply uploading a PDF into an EHR?”

Uploading a PDF usually leaves a **file attachment**. MediTap aims to turn that file into **discrete, reviewable fields** (meds, allergies, labs, …) ready for chart use and, later, FHIR exchange — with Accept/Reject and staff gates — not a blob sitting unparsed in the media tab.

---

## 5. Security / patient data

### How is patient medical information currently protected?

AuthN/AuthZ on APIs; staff elevation for privileged edits; portal separation (user vs admin); CORS/host controls in deploy configs. **Dev Docker uses demo secrets** — production must rotate everything.

### Is data encrypted in transit and at rest?

- **In transit:** HTTPS required for real deployments (browser secure context). Local Docker may use HTTP on localhost only.  
- **At rest:** Postgres/files rely on **host/disk encryption and cloud provider controls** when configured — app-level field encryption is **not** the headline feature today. Say “TLS in production; storage encryption via hosting,” not “we encrypt every column with HSM.”

### What patient information does MediTap actually store?

Account identity + structured chart (demographics, clinical lists, appointments, preferences) + uploaded documents and parse metadata. Prefer **minimum necessary** for the product.

### Where is that information stored?

Application database and media storage attached to the MediTap backend (Postgres + file storage). Not on the physical card.

### How would authentication work for patients/providers?

- **Patients:** MediTap account (JWT session).  
- **Staff:** admin portal login and/or **staff elevation** inside the patient session for kiosk-style unlock.  
- **Future EHR:** separate SMART/OAuth to the EHR — does not replace MediTap login.

### How would we make sure only authorized people can access a patient’s information?

Object-level permissions (patient owns their chart; staff roles for elevation/admin); future: org membership, break-glass, session timeouts, MFA for production.

### Audit logs?

**Starter** `AdminActivityEvent` trail exists — **not** a full HIPAA audit product. Plan richer immutable audit (who viewed/changed what, when).

### If someone’s account or MediTap card is compromised?

- Account: password reset, revoke JWT/sessions, staff review.  
- Card: Settings supports **report lost / inactive** (currently **front-end demo** — not a live card registry). Production needs backend card revoke + re-issue.

### Does PHI live on the physical NFC/RFID card?

**Design intent: no.** The card should **identify/authenticate** the patient; PHI lives on **secured servers**. Current card UI is largely **demo status**, not a shipped secure element chart.

### Designing for HIPAA-compliant handling of PHI?

TLS, authz, least privilege, BAAs with hosting, audit roadmap, retention/deletion, no PHI in client logs, subprocessors inventory. **Building toward** HIPAA-ready operations ≠ “we are HIPAA certified.”

### Claims you should specifically NOT make yet

- “HIPAA certified / compliant” without counsel + controls attestation.  
- “Fully integrated with Epic/Cerner/athena” (production).  
- “AI diagnoses” or “LLM clinical decision support.”  
- Published **clinical extraction accuracy %** beyond fixture completeness.  
- “PHI encrypted on the NFC card.”  
- “Live card kill-switch across all clinics” (demo only today).

---

## 6. Competitive / technical moat

### What is technically difficult or unique?

- **Multi-vendor PDF/CCD dialect engineering** (Athena vs MEDITECH vs Epic layouts differ radically).  
- **Patient-mediated intake** with Accept/Reject + staff elevation, not clinic-only scanning.  
- Bridging **document portability → structured chart → future FHIR** in one product path.  
- Training loop: fixture corpora that fail loudly when a parser regresses.

### What would be hardest for another company to replicate?

The **accumulated vendor-specific parsers + regression corpora + UX gates**, not the generic “run OCR on a PDF” idea. Replicating surface OCR is easy; surviving real hospital export chaos is not.

### Anything proprietary about architecture, extraction, mapping, or workflow?

Implementation is **custom MediTap IP** (parsers, portals, elevation model). Not a patented black-box claim in this brief — moat is **execution depth + workflow**, not a single secret algorithm.

### Biggest technical advantage (engineering view)

**A working dual portal (patient + admin) with live chart APIs**, plus the ability to **bootstrap that chart from messy real EHR exports** across major vendors — with humans in the loop and a path to FHIR. That is harder than either “another PDF vault” or “another FHIR hello-world.”

---

## Closing talking points (30 seconds)

1. MediTap is a **working user portal + working admin portal** today — appointments, labs, insurance, conditions, incidents, meds/allergies, intake — not only slides or fixtures.  
2. PDF intake **feeds** that chart: upload → **pdf.js + Tesseract** → **vendor parsers** → Accept/Reject → **Postgres**.  
3. **No LLMs** in extraction today; **FHIR** is the planned EHR bridge.  
4. Accuracy is guarded by **fixtures + humans**, not by marketing percentages.  
5. Be precise: demo completeness ≠ clinical certification; sandbox ≠ production EHR.

---

*Generated for MediTap leadership use — August 27, 2026. Update when production EHR, audit, or card registry land.*
