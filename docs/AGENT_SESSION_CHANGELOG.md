# MediTap — Agent session change register (Jira-style)

**Purpose:** Single register of work attributed to Cursor agent sessions on this MediTap codebase.  
**Agent continuity:** Read **`docs/MEDITAP_AGENT_HANDOFF.md`** and **`meditap-app/REGISTER_CHECKPOINT.md`** at session start (see also **`AGENTS.md`** and **`.cursor/rules/meditap-agent.mdc`**).  
**Word export:** Open **`docs/AGENT_SESSION_CHANGELOG.docx`** in Microsoft Word (same content as this file). Regenerate after editing this Markdown:

`./.docgen-venv/bin/python docs/scripts/changelog_to_docx.py`  
(One-time: `python3 -m venv .docgen-venv && .docgen-venv/bin/pip install python-docx`)

**Scope note:** This workspace had **no usable `git log`** at documentation time for some periods; items combine **repo survey** + **session notes**. Treat as authoritative for *intent* and *primary paths*.

**Convention:** `MT-AG-###` = synthetic issue key (import into Jira as Story/Task/Bug as you prefer).

**Display formats in this doc**

1. **Summary tables** — compact epic view (Sets 1–2 / lab & cross-tab fixes).  
2. **Detailed issue blocks** — your preferred layout: **Type**, **Summary**, **What was done**, **Outcome** (Sets 3–4 below).

---

## Set 1–2 — Summary tables (Lab + intake eligibility)

### Epic E-LAB — Patient lab panels & Tab7

| Key       | Type   | Summary                                                                 | Status   | Primary paths |
|-----------|--------|---------------------------------------------------------------------------|----------|----------------|
| MT-AG-001 | Story  | Persist patient lab panels in Django (replace mock-only flow for Tab7) | Done     | `backend/medical/` |
| MT-AG-002 | Task   | `PatientLabPanel` model + UUID PK `lab_panel_id`                         | Done     | `backend/medical/models.py`, `0004_patient_lab_panel.py` |
| MT-AG-003 | Task   | Serializer + `PatientLabPanelViewSet` + router URL                       | Done     | `backend/medical/serializers.py`, `views.py`, `medapp/urls.py` |
| MT-AG-004 | Task   | Write permission: superuser OR Keycloak `meditap-record-editor` OR `X-Meditap-Elevation` | Done | `backend/medical/permissions.py`, `medapp/intake_editor.py` |
| MT-AG-005 | Task   | Seed migration: default CBC/BMP/Lipid-style panels when empty           | Done     | `backend/medical/migrations/0005_seed_default_lab_panels.py`, `lab_seed_data.py`, `signals.py`, `apps.py` |
| MT-AG-006 | Story  | SPA: load/create/update/delete lab panels via API                        | Done     | `meditap-app/src/api.ts`, `pages/Tab7.tsx` |
| MT-AG-007 | Task   | Map API rows → UI model; wire `LabResultCard` **Manage**                 | Done     | `meditap-app/src/labResults/labResultModel.ts`, `LabResultCard.tsx` |
| MT-AG-008 | Task   | Staff elevation modal + “End staff mode”; ensure patient for session   | Done     | `Tab7.tsx`, `ensurePatientForCurrentSession` in `api.ts` |
| MT-AG-009 | Task   | Staff quick-entry catalog (panels, analytes, units, ranges, etc.)      | Done     | `meditap-app/src/labResults/labResultFieldCatalog.ts` |
| MT-AG-010 | Task   | Lab modal: dropdowns for display code, panel, dates, status, components  | Done     | `Tab7.tsx`, `Tab7.css` |
| MT-AG-011 | Bug    | API 500 / missing tables → document `migrate` for lab migrations         | Done     | `README.md` |
| MT-AG-012 | Bug    | PATCH lab panel returned 404 — `get_queryset()` empty for detail routes  | Done     | `backend/medical/views.py` (`PatientLabPanelViewSet.get_queryset`) |
| MT-AG-013 | Bug    | Staff banner vs API 403 — `canEdit*` memo hid elevation expiry           | Done     | `Tab4/5/6/7/14.tsx` (later refined per MT-AG-020–021) |
| MT-AG-014 | Bug    | **Manage** missing — `patientSub` memo stale vs Keycloak `tokenParsed`   | Done     | Same tabs: read `sub` each render |
| MT-AG-015 | Task   | Clearer 403 copy on lab save (re-sign staff if elevation expired)        | Done     | `Tab7.tsx` |

#### Files touched (E-LAB — consolidated)

**Backend:** `medical/models.py`, `migrations/0004_*`, `migrations/0005_*`, `serializers.py`, `views.py`, `permissions.py`, `admin.py`, `lab_seed_data.py`, `signals.py`, `apps.py`, `medapp/urls.py`, `medapp/intake_editor.py`  
**Frontend:** `api.ts`, `pages/Tab7.tsx`, `pages/Tab7.css`, `labResults/labResultModel.ts`, `labResultFieldCatalog.ts`, `LabResultCard.tsx`, `labResultCards.css`  
**Docs:** `README.md` (lab API + migrate)

---

### Epic E-INTAKE-UX — Staff elevation & edit eligibility (cross-tab refinements)

| Key       | Type | Summary                                                                 | Status | Primary paths |
|-----------|------|---------------------------------------------------------------------------|--------|----------------|
| MT-AG-020 | Bug  | Align “can edit” with time-based elevation JWT (avoid stale `useMemo`)   | Done   | `Tab4.tsx`, `Tab5.tsx`, `Tab6.tsx`, `Tab14.tsx`, `Tab7.tsx` |
| MT-AG-021 | Bug  | Read Keycloak `sub` every render for elevation match                     | Done   | Same files as MT-AG-020 |

---

## Set 3 — Detailed register (staff platform, auth, allergies, dashboard UI)

### MT-AG-030 — Staff Elevation Mode (Patient Session Preserved)

**Type:** Security / Access Control  

**Summary:** Enabled staff-only editing in Tab14 without logging out the patient session.

**What was done:**

- Implemented a staff sign-in modal that requests temporary elevation credentials (`requestPatientIntakeStaffElevation` → `POST /api/auth/staff-elevate/`).
- Stored a short-lived elevation JWT in `sessionStorage` via `meditap-app/src/auth/staffElevationStorage.ts` for edit authorization and `X-Meditap-Elevation` on API calls (`api.ts` → `getMeditapElevationRequestHeaders`).
- Kept the patient’s Keycloak session active while staff edits are unlocked.
- Added clear “Staff mode active” messaging and an explicit “End staff mode” action (`Tab14.tsx`, shared patterns on other tabs e.g. Tab7).

**Outcome:** Staff can update records safely on shared devices without disrupting patient login state.

**Primary paths:** `meditap-app/src/pages/Tab14.tsx`, `meditap-app/src/auth/staffElevationStorage.ts`, `meditap-app/src/api.ts`, `backend/medapp/intake_editor.py`

---

### MT-AG-031 — Staff Elevation API + Keycloak Validation Path

**Type:** Backend Enhancement  

**Summary:** Added backend endpoint and token validation flow for staff elevation.

**What was done:**

- Created staff elevation auth endpoint and debug route for env/secret diagnostics (`backend/medapp/staff_elevation_views.py`, routes in `backend/medapp/urls.py`).
- Added robust error messaging for Keycloak auth failures (helpful in `DEBUG`).
- Added verification logic to validate expected token audience/client context (`verify_keycloak_access_token_string` with elevate client `azp`).
- Improved handling for placeholder/missing client secret configuration (`secret_not_set`, `not_configured`, hints in responses).

**Outcome:** Reliable and diagnosable elevation auth flow across local/dev environments.

**Primary paths:** `backend/medapp/staff_elevation_views.py`, `backend/medapp/keycloak_auth.py`, `backend/medapp/urls.py`, `docker/backend.dev.env` / `docker/.env` (configuration)

---

### MT-AG-032 — 401 Handling Hardening for Elevation Auth

**Type:** Bug Fix  

**Summary:** Prevented failed staff elevation attempts from expiring patient session.

**What was done:**

- Updated frontend API auth error handling so `POST /api/auth/staff-elevate/` **401** responses do not trigger global logout / session-expired behavior (`apiRequest` in `meditap-app/src/api.ts` — special-case path check before `emitSessionExpired`).
- Kept normal **401** behavior for protected business APIs unchanged.

**Outcome:** Mistyped staff credentials no longer kick out the patient.

**Primary paths:** `meditap-app/src/api.ts`

---

### MT-AG-033 — CORS Update for Elevation Header

**Type:** Backend Bug Fix  

**Summary:** Allowed custom elevation header in browser preflight and API requests.

**What was done:**

- Added `x-meditap-elevation` to Django `CORS_ALLOW_HEADERS` in `backend/medapp/settings.py`.
- Validated that elevated save flows can send the custom header without browser block.

**Outcome:** Save operations stop failing from CORS when staff mode is active.

**Primary paths:** `backend/medapp/settings.py`

---

### MT-AG-034 — Auth Module Refactor for Stability (Vite Fast Refresh)

**Type:** Frontend Refactor  

**Summary:** Moved auth header logic out of React context module to avoid HMR/Fast Refresh incompatibilities.

**What was done:**

- Extracted `getAuthHeaders` into dedicated auth utility module (`meditap-app/src/auth/getAuthHeaders.ts`).
- Updated API calls to use the new helper from `api.ts`.
- Refined refresh-token failure behavior to expire session only when token is truly unavailable.

**Outcome:** Cleaner architecture, fewer dev-time hot-reload issues, safer auth lifecycle.

**Primary paths:** `meditap-app/src/auth/getAuthHeaders.ts`, `meditap-app/src/api.ts`, `meditap-app/src/contexts/AuthContext.tsx` (imports / wiring)

---

### MT-AG-035 — Allergies “Other Type” Capture + Persistence

**Type:** Feature Enhancement  

**Summary:** Added explicit free-text allergy type detail when user selects “Other.”

**What was done:**

- Showed conditional input (“Describe allergy type”) when allergy type = Other.
- Stored the custom type text and persisted through save/load.
- Mapped to backend payload in existing allergy type serialization format (`Other (...)`).

**Outcome:** Better clinical specificity without breaking existing API schema.

**Primary paths:** `meditap-app/src/pages/Tab14.tsx` (allergies section), `meditap-app/src/api.ts` (`saveTab14ToBackend` / allergy payloads)

---

### MT-AG-036 — Patient Snapshot Email Layout Fix

**Type:** UI Bug Fix  

**Summary:** Prevented email clipping/wrapping issues in dashboard patient snapshot.

**What was done:**

- Restructured email row to full-width presentation with dedicated value behavior.
- Applied `nowrap` + horizontal overflow handling where needed.
- Adjusted snapshot layout so long addresses remain readable.

**Outcome:** Email field is consistently visible and no longer visually broken.

**Primary paths:** `meditap-app/src/pages/Tab1.tsx`, `meditap-app/src/pages/Tab1.css` (or equivalent dashboard snapshot styles)

---

### MT-AG-037 — Dynamic Sidebar Width Based on Content

**Type:** UX Improvement  

**Summary:** Made dashboard left panel adapt to content length (especially long emails) within safe bounds.

**What was done:**

- Changed fixed-width sidebar behavior to content-driven sizing with min/max constraints.
- Removed clipping-causing overflow setup and aligned card/nav sizing rules.
- Kept responsive safeguards for narrow viewports.

**Outcome:** Sidebar feels natural for short/long profile data and avoids truncation artifacts.

**Primary paths:** `meditap-app/src/pages/Tab1.tsx`, `meditap-app/src/pages/Tab1.css`

---

### MT-AG-038 — Allergy Severity Standardization (Dropdown + Clinical Labels)

**Type:** Data Quality / UX Improvement  

**Summary:** Replaced free-text allergy severity with standardized selectable options.

**What was done:**

- Converted severity input to dropdown.
- Added practical medical statuses: Mild, Moderate, Severe, Anaphylaxis, Unknown/Not documented.
- Retained compatibility with existing save/load model.

**Outcome:** More consistent records, easier reporting/filtering, reduced entry ambiguity.

**Primary paths:** `meditap-app/src/pages/Tab14.tsx`

---

### MT-AG-039 — Automatic Staff Mode Cleanup on Dashboard Exit

**Type:** Security / UX Safeguard  

**Summary:** Staff elevation now auto-ends when leaving Tab14 via “Go back to dashboard.”

**What was done:**

- Hooked dashboard navigation (`href="/tab1"`) to clear elevation token/state before redirect (`clearMeditapIntakeElevation()`).
- Preserved manual “End staff mode” flow.

**Outcome:** Reduces risk of forgotten elevated mode on shared or unattended sessions.

**Primary paths:** `meditap-app/src/pages/Tab14.tsx`

---

## Set 4 — Detailed register (Appointments Tab4)

### MT-AG-040 — (17) Appointments Tab — Manage Modal & Clinical Detail View

**Type:** Feature / UX  

**Summary:** Open a full appointment details modal from **Manage**, aligned with existing MediTap modal patterns.

**What was done:**

- Wired **Manage** on each card to open a modal with professional-style fields (appointment ID, status, specialist, department, date/time, visit type, duration, location, reason for visit, patient instructions, clinical notes).
- Added staff sign-in using the same elevation flow as Tab14 (`requestPatientIntakeStaffElevation` + session elevation token).
- Fields stay read-only until staff access is active; **Save Changes** updates the in-memory appointment list for the session.

**Outcome:** Users can review full appointment context in one place and edit only after staff authentication.

**Primary paths:** `meditap-app/src/pages/Tab4.tsx`, `meditap-app/src/pages/Tab4.css`, `meditap-app/src/api.ts`

---

### MT-AG-041 — (18) Appointments — Staff Mode Edit Unlock After Sign-In

**Type:** Bug Fix  

**Summary:** Fixed modal fields staying disabled after successful staff sign-in.

**What was done:**

- `canEditAppointments` originally failed to re-evaluate immediately after elevation; addressed with `elevationNonce` bumps after successful staff token storage and related permission wiring (later generalized per MT-AG-020 / MT-AG-021 for all intake tabs).

**Outcome:** After staff sign-in, inputs unlock without a full page refresh.

**Primary paths:** `meditap-app/src/pages/Tab4.tsx`

---

### MT-AG-042 — (19) Appointments — Persist Card Edits Across Navigation

**Type:** Data / UX Improvement  

**Summary:** Appointment list edits no longer reset when leaving Tab4 and returning (same user, same browser).

**What was done:**

- Persisted the Tab4 appointment array to `localStorage` under a per-user key (`meditap_tab4_appointments_v1` prefix — see `meditap-app/src/appointments/appointmentStorage.ts`).
- Hydrate on mount from storage when valid; validate stored shape before use.
- Skipped problematic persist cycles after load / when storage key (user) changes.

**Outcome:** Edits (e.g. specialist name) survive dashboard round-trips locally; no backend appointment API required for this increment.

**Primary paths:** `meditap-app/src/pages/Tab4.tsx`, `meditap-app/src/appointments/appointmentStorage.ts`

---

### MT-AG-043 — (20) Product Clarification — Tab4 Appointments vs Dashboard Hospital Card

**Type:** Documentation / Architecture Note  

**Summary:** Documented that upcoming appointment cards (Tab4) and Patient Hospital on Tab1 are **not** the same data source today.

**What was done:**

- Captured product/architecture clarification for stakeholders (this changelog entry; extend into `README.md` or internal wiki if desired).

**Outcome:** Clear expectations for QA and future backend unification work.

**Primary paths:** `docs/AGENT_SESSION_CHANGELOG.md` (and optionally `README.md`)

---

## Set 5 — Detailed register (since checkpoint entry 20 / MT-AG-043)

**Baseline:** `meditap-app/REGISTER_CHECKPOINT.md` — last entry **20** (`MT-AG-043`), date **2026-03-31**.  
**This set:** entries **21–38** (`MT-AG-044`–`MT-AG-061`).  
**Git range (approx.):** `2f5de57` → `20170dd` on `main`.

### Epic E-PUBLIC — Public site, auth, onboarding (Phase 1)

### MT-AG-044 — (21) Public About, Support, Terms, and Privacy pages

**Type:** Story / UX  

**Summary:** Add compliant public pages with shared layout and footer legal links.

**What was done:**

- Added `PublicPageLayout` and dedicated `TermsPage` / `PrivacyPage`.
- Refactored About (`Tab8`) and Support (`Tab10`) to use the shared layout.
- Registered routes `/terms`, `/privacy` in `App.tsx`.

**Outcome:** Marketing and legal content are first-class routes, not ad-hoc fragments.

**Primary paths:** `meditap-app/src/components/PublicPageLayout.tsx`, `TermsPage.tsx`, `PrivacyPage.tsx`, `pages/Tab8.tsx`, `pages/Tab10.tsx`, `App.tsx`  
**Commit:** `2f5de57`

---

### MT-AG-045 — (22) Login header navigation and CTA cleanup

**Type:** Bug / UX  

**Summary:** Fix non-clickable About/Support links on login; remove duplicate Create account from header.

**What was done:**

- Raised login header `z-index` so nav links work over full-screen background overlay.
- Login header limited to About + Support; registration remains on card/footer.

**Outcome:** Public nav from login works reliably; cleaner header hierarchy.

**Primary paths:** `meditap-app/src/pages/Tab3.tsx`, `Tab3.css`  
**Commits:** `2f5de57`, `4d73fe2`

---

### MT-AG-046 — (23) Password reset and support contact APIs

**Type:** Story / Backend  

**Summary:** Backend endpoints for forgot-password flow and support form email.

**What was done:**

- `POST /api/auth/password-reset/` and `.../confirm/` in `public_views.py`.
- `POST /api/support/contact/` for Support page submissions.
- Email settings from environment; SMTP notes in `docker/backend.dev.env`.

**Outcome:** Self-service password reset and working support form (with SMTP or console backend).

**Primary paths:** `backend/medapp/public_views.py`, `settings.py`, `medapp/urls.py`  
**Commit:** `523366f`

---

### MT-AG-047 — (24) Forgot / reset password and onboarding wizard (frontend)

**Type:** Story / UX  

**Summary:** Complete Phase 1 auth and post-registration onboarding in the SPA.

**What was done:**

- `ForgotPasswordPage`, `ResetPasswordPage`, `OnboardingPage`, `OnboardingBanner`.
- `onboardingStorage.ts`; Tab3 **Forgot password?** link; Tab9 redirects to `/onboarding` after register.
- Tab14 marks profile/upload steps; Tab8 support wired to API; FAQ accessibility fixes.

**Outcome:** New users get guided setup; password recovery is end-to-end.

**Primary paths:** `meditap-app/src/pages/ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`, `OnboardingPage.tsx`, `onboarding/`, `Tab3.tsx`, `Tab9.tsx`, `Tab14.tsx`, `api/publicContact.ts`  
**Commit:** `523366f`

---

### MT-AG-048 — (25) Production DEBUG flag from environment

**Type:** Task / Security  

**Summary:** Stop hard-coded `DEBUG=True` from leaking stack traces in production.

**What was done:**

- `DEBUG` read from env in Django `settings.py` (default off).

**Outcome:** VM/production can run with `DEBUG=False` via systemd override or env file.

**Primary paths:** `backend/medapp/settings.py`  
**Commit:** `6fdf780`

---

### Epic E-DASHBOARD — Patient dashboard home

### MT-AG-049 — (26) Dashboard Phase A — welcome hero and next steps

**Type:** Story / UX  

**Summary:** Dashboard home shows greeting, quick actions, and prioritized next-step cards.

**What was done:**

- `DashboardHomeHero`, `DashboardNextSteps`, shared `dashboard/nextSteps.ts`.
- Tab1 integration; sidebar **Dashboard** link; quick actions (intake, upload, Quick Status).

**Outcome:** Dashboard acts as a home hub, not only static previews.

**Primary paths:** `DashboardHomeHero.tsx`, `DashboardNextSteps.tsx`, `dashboard/nextSteps.ts`, `Tab1.tsx`  
**Commit:** `e7ac36b`

---

### MT-AG-050 — (27) Dashboard empty states and metrics layout fixes

**Type:** Bug / UX  

**Summary:** Fix stretched empty-state buttons and keep health metrics on one row.

**What was done:**

- `inline-flex` / width fixes for empty-state CTAs; lab dual-button vertical spacing.
- Metrics grid `repeat(5, minmax(0, 1fr))` for responsive single row.

**Outcome:** Dashboard cards and CTAs match intended compact layout on desktop and mobile.

**Primary paths:** `Tab1.tsx`, `Tab1.css`  
**Commits:** `e47b4fe`, `a70941a`, `6ac00a7`

---

### MT-AG-051 — (28) Dashboard section actions — one view tab + staff-gated add

**Type:** Story / Security  

**Summary:** Remove duplicate section buttons; add entry requires staff/admin elevation.

**What was done:**

- `DashboardSectionActions` component (view + add only).
- `StaffElevationModal`, `useStaffElevationGate`, `auth/openAddEntry.ts` queue.
- Tab4/5/6/7 consume open-add on navigate; Tab1 `requestAddEntry()` flow.
- Removed redundant empty-state navigation buttons inside preview cards.

**Outcome:** Clear actions per section; patients can view tabs, only staff can create from dashboard.

**Primary paths:** `DashboardSectionActions.tsx`, `StaffElevationModal.tsx`, `hooks/useStaffElevationGate.ts`, `auth/openAddEntry.ts`, `Tab1.tsx`, `Tab4.tsx`, `Tab5.tsx`, `Tab6.tsx`, `Tab7.tsx`  
**Commit:** `6ee8827`

---

### MT-AG-052 — (29) Dashboard section copy and glass button styling

**Type:** UX / UI  

**Summary:** Replace redundant “same as tab” subtitles; glass styling on avatar and action buttons.

**What was done:**

- Brief per-section descriptions on Tab1 preview headers.
- `meditap-glass-btn` / `--compact` in shared theme; glass avatar ring.
- Hero quick actions use compact glass; section header buttons sized to match.

**Outcome:** Dashboard reads professionally; consistent glass language with Settings header.

**Primary paths:** `Tab1.tsx`, `Tab1.css`, `DashboardHomeHero.tsx`, `DashboardSectionActions.tsx`, `theme/meditap-shared.css`  
**Commits:** `04e938e`, `95e07c1`

---

### Epic E-APPOINTMENTS — Tab4 continued

### MT-AG-053 — (30) Appointments — staff quick-pick field library

**Type:** Story / UX  

**Summary:** Appointment create/edit modal uses per-field dropdown libraries for fast staff entry.

**What was done:**

- `appointmentFieldLibrary.ts` (specialists, departments, times, durations, locations, reasons, notes, statuses, visit types, date presets).
- `AppointmentPresetField` — “Quick pick from library” + free-text/textarea.
- Auto-generate appointment ID preset; expanded status/visit type lists.

**Outcome:** Booking modal matches competitive admin speed; custom values still allowed.

**Primary paths:** `appointments/appointmentFieldLibrary.ts`, `AppointmentPresetField.tsx`, `Tab4.tsx`  
**Commit:** `c90bc06`

---

### Epic E-QUICK-STATUS — Tab2

### MT-AG-054 — (31) Quick Status Sprint A — six clickable KPI cards

**Type:** Story / UX  

**Summary:** Expand Quick Status metrics and make every card navigate to the correct tab.

**What was done:**

- `StatusKpiCard` reusable component; six tiles: profile %, appointments, labs, meds, chronic, incidents.
- Load incident count via `fetchTab6Data`; labs/meds/chronic from API `detail` / panels.
- Clickable card hover states; allergy summary line when allergies on file.

**Outcome:** Quick Status is a true triage screen, not only a static checklist.

**Primary paths:** `StatusKpiCard.tsx`, `Tab2.tsx`, `Tab2.css`, `theme/meditap-shared.css`  
**Commit:** `20170dd`

---

### MT-AG-055 — (32) Quick Status Sprint A — profile completeness and urgent next steps

**Type:** Story / UX  

**Summary:** Profile % score, urgency-sorted next steps (max 6), and corrected lab messaging.

**What was done:**

- `computeProfileCompleteness`, `sortNextStepsByUrgency`, `trimNextStepsForQuickStatus`, `hasUrgentNextSteps` in `nextSteps.ts`.
- **Needs attention today** heading when warning/danger steps exist; empty caught-up state.
- Removed outdated “labs until wired to API” copy; clarified appointments are device-local until server sync.

**Outcome:** Quick Status prioritizes what matters today; aligns with live API where available.

**Primary paths:** `dashboard/nextSteps.ts`, `Tab2.tsx`  
**Commit:** `20170dd`

---

### Epic E-PLATFORM — Cross-cutting

### MT-AG-056 — (33) Tab1 dashboard empty-state and setup strip (Phase 1)

**Type:** Task / UX  

**Summary:** Dashboard onboarding strip and empty-state CTAs for new patients (Phase 1 bundle).

**What was done:**

- Setup strip and section empty states tied to onboarding/record state (shipped with Phase 1 dashboard UX).

**Outcome:** New accounts see guided actions on first dashboard visit.

**Primary paths:** `Tab1.tsx`, `Tab1.css`, `OnboardingBanner.tsx`  
**Commit:** `523366f` (partial), `e7ac36b`

---

### Epic E-OPS — Deployment and product notes (no or minimal code)

### MT-AG-057 — (34) VM deployment runbook — gunicorn, nginx, Host header

**Type:** Documentation / Task  

**Summary:** Document production deploy steps for `meditap.ai` VM.

**What was done:**

- Agent session guidance: gunicorn on **port 8000**, `Host: meditap.ai` for local curl, `git pull` + `npm run build` + `nginx reload`, push-before-pull for frontend changes, hard-refresh for cache.

**Outcome:** Repeatable deploy checklist for trading_bot@meditap server.

**Primary paths:** Session notes; `docker/README.md` (reference)

---

### MT-AG-058 — (35) Competitive UX roadmap — Phases 1–4 (product)

**Type:** Spike / Documentation  

**Summary:** Roadmap for patient + buyer-facing competitiveness (agreed in session, not all built).

**What was done:**

- Phase 1 (auth, onboarding, dashboard empty states) — **largely done** (MT-AG-044–056).
- Phase 2–4 outlined: profile completeness on dashboard, Epic production, org landing, notifications, etc.

**Outcome:** Backlog shape for stakeholder planning; use to create real Jira epics.

**Primary paths:** N/A (product)

---

### MT-AG-059 — (36) Sprint B backlog — server-backed appointments

**Type:** Story (backlog)  

**Summary:** Unify Tab4 / Tab1 / Tab2 appointment counts via Django API (identified gap post Sprint A).

**What was done:**

- Architecture note only: no `Appointment` model in backend today; `localStorage` per user.

**Outcome:** Explicit P0 for next engineering sprint.

**Primary paths:** `appointments/appointmentStorage.ts`, `Tab4.tsx`, `Tab2.tsx`

---

### MT-AG-060 — (37) Sprint C backlog — field libraries on Tab5 / Tab6 / Tab7

**Type:** Story (backlog)  

**Summary:** Replicate appointment quick-pick pattern on chronic, incident, and lab modals.

**What was done:**

- Identified in competitive review; not implemented in this window.

**Outcome:** Parity task for staff documentation speed across clinical tabs.

**Primary paths:** `Tab5.tsx`, `Tab6.tsx`, `Tab7.tsx` (future)

---

### MT-AG-061 — (38) Tab14 single save path — API vs localStorage unification

**Type:** Story (backlog)  

**Summary:** Patient Information still dual-writes localStorage; Quick Status meds/profile depend on API.

**What was done:**

- Documented risk in Sprint A review; no full migration in this set.

**Outcome:** P0 data-integrity epic for backend + Tab14 refactor.

**Primary paths:** `Tab14.tsx`, `api.ts`

---

## Set 5 — Summary table (quick Jira import)

| Key       | Epic            | Type   | Summary                                              | Status   |
|-----------|-----------------|--------|------------------------------------------------------|----------|
| MT-AG-044 | E-PUBLIC        | Story  | Public About, Support, Terms, Privacy                | Done     |
| MT-AG-045 | E-PUBLIC        | Bug    | Login nav z-index + header CTA cleanup               | Done     |
| MT-AG-046 | E-PUBLIC        | Story  | Password reset + support email APIs                  | Done     |
| MT-AG-047 | E-PUBLIC        | Story  | Forgot/reset/onboarding frontend                       | Done     |
| MT-AG-048 | E-PLATFORM      | Task   | DEBUG from environment                               | Done     |
| MT-AG-049 | E-DASHBOARD     | Story  | Dashboard hero + next steps                          | Done     |
| MT-AG-050 | E-DASHBOARD     | Bug    | Empty-state buttons + metrics row                    | Done     |
| MT-AG-051 | E-DASHBOARD     | Story  | Staff-gated add + single view/add actions            | Done     |
| MT-AG-052 | E-DASHBOARD     | UX     | Section subtitles + glass buttons                    | Done     |
| MT-AG-053 | E-APPOINTMENTS  | Story  | Appointment quick-pick field library                 | Done     |
| MT-AG-054 | E-QUICK-STATUS  | Story  | Six clickable KPI cards                              | Done     |
| MT-AG-055 | E-QUICK-STATUS  | Story  | Profile % + urgent next steps (max 6)                | Done     |
| MT-AG-056 | E-DASHBOARD     | Task   | Dashboard setup strip / empty states (Phase 1)       | Done     |
| MT-AG-057 | E-OPS           | Doc    | VM deploy runbook                                    | Done     |
| MT-AG-058 | E-PRODUCT       | Spike  | Competitive roadmap Phases 1–4                     | Done     |
| MT-AG-059 | E-APPOINTMENTS  | Story  | **Backlog:** Server-backed appointments              | Backlog  |
| MT-AG-060 | E-CLINICAL-UX   | Story  | **Backlog:** Quick-pick on Tab5/6/7                  | Backlog  |
| MT-AG-061 | E-INTAKE-UX     | Story  | **Backlog:** Tab14 API-only persistence               | Backlog  |

---

## How to import into Jira (optional)

1. Create epics: **E-LAB**, **E-INTAKE-UX**, **E-STAFF-PLATFORM** (Set 3), **E-APPOINTMENTS** (Set 4), **E-PUBLIC**, **E-DASHBOARD**, **E-QUICK-STATUS**, **E-OPS**, **E-PRODUCT** (Set 5).  
2. Map **MT-AG-030–039** and **MT-AG-040–043** as Stories/Tasks/Bugs with descriptions copied from the detailed blocks.  
3. Map **MT-AG-044–061** from Set 5 (entries 21–38).  
4. Keep **Set 1–2** rows as linked items or sub-tasks under **E-LAB** / **E-INTAKE-UX**.  
5. Attach file paths from **Primary paths** to each issue.

---

## Out of scope / not tracked here

- Dependency churn under `meditap-app/node_modules/`  
- Conversational-only guidance with **no** repo edit  
- Any local-only edits not saved into this workspace  

---

---

## Set 6 — Detailed register (after entry 65 — week of 2026-05-22 → 2026-05-28)

**Baseline:** Register entry **65** = Sprint B/C planning only (not built).  
**This set:** entries **66–73** (`MT-AG-062`–`MT-AG-069`).  
**Git range:** `20170dd` → `8f2c818` on `main`.

**Register format (canonical — match entry 65 and Sets 3–4):** Each item uses **Type**, **Summary** (one intent sentence), **What was done** (concrete deliverables + context), **Outcome** (user/QA/engineering result and what remains open). Optional: **Primary paths**, **Commit**.

---

### 65) Product Backlog — Sprint B/C (Captured, Not Built)

**Type:** Spike / Planning  

**Summary:** Record next competitive milestones identified after Quick Status Sprint A.  

**What was done:**

- **Sprint B:** Django appointments API so Tab4, Dashboard, and Quick Status share server-backed visits (replace `localStorage`).
- **Sprint C:** Quick-pick libraries on Chronic (Tab5), Incidents (Tab6), Labs (Tab7); Tab14 single API save path instead of dual `localStorage` + API.  

**Outcome:** Clear P0/P1 backlog for engineering and Jira epic creation without mixing into “done” work.

---

### 66) Sprint C (Delivered) — Staff Quick-Pick Libraries on Tab5, Tab6, and Tab7

**Type:** Feature / UX  
**Key:** `MT-AG-062`  

**Summary:** Implement the Sprint C “quick-pick” goal for chronic conditions, incident records, and lab results so staff charting speed matches the Appointments tab (entry 61).  

**What was done:**

- Introduced a shared **`StaffPresetField`** component (“Quick pick from library” + free-text/textarea) reused across clinical modals, with dedicated styling in `StaffPresetField.css`.
- Added curated **`chronicFieldLibrary.ts`** (conditions, severity, status, facilities, notes) and wired **Tab5** create/edit modals to preset dropdowns per field.
- Added **`incidentFieldLibrary.ts`** (incident types, locations, severity, disposition, narrative presets) and wired **Tab6** modals the same way.
- Expanded **`labResultFieldCatalog.ts`** (panels, analytes, units, reference ranges, statuses, interpretations) and aligned **Tab7** lab modal dropdown labels/copy with the appointment booking pattern from Tab4.
- Refactored Tab5/6/7 so staff can still type custom values when a library option does not fit—parity with `AppointmentPresetField` behavior.  

**Outcome:** Sprint C quick-pick work for **Tab5, Tab6, and Tab7 is complete**; staff spend fewer clicks per record. Does **not** include Sprint B (appointments API) or full Tab14 API-only persistence (see entries 71 and backlog below).

**Primary paths:** `components/StaffPresetField.tsx`, `chronic/chronicFieldLibrary.ts`, `incidents/incidentFieldLibrary.ts`, `labResults/labResultFieldCatalog.ts`, `Tab5.tsx`, `Tab6.tsx`, `Tab7.tsx`  
**Commit:** `43ef7ef` (2026-05-25)

---

### 67) Clinical Tabs — Unified Empty-State and Header Pattern (Tab4, Tab5, Tab6)

**Type:** UX  
**Key:** `MT-AG-063`  

**Summary:** Make Appointments, Chronic Conditions, and Incident Records visually and behaviorally consistent with Lab Results (Tab7) so the app feels like one product, not four different layouts.  

**What was done:**

- Centralized dashed **empty-state** card styling and **staff-readonly header hints** in `meditap-shared.css` (same language as Lab Results).
- Updated **Tab4**, **Tab5**, and **Tab6** page markup to use the shared empty-state blocks and hint copy when the user cannot edit.
- Removed duplicated/conflicting empty-state CSS from Tab5/Tab6/Tab7 stylesheets so future tab changes happen in one place.
- Kept Lab Results as the reference pattern; appointments/chronic/incidents now match spacing, borders, and “no data yet” CTAs.  

**Outcome:** Patients and staff see a consistent clinical-tab experience; QA can test one empty-state pattern instead of four. No backend or permission changes in this entry.

**Primary paths:** `theme/meditap-shared.css`, `Tab4.tsx`, `Tab4.css`, `Tab5.tsx`, `Tab5.css`, `Tab6.tsx`, `Tab6.css`, `labResults/labResultCards.css`  
**Commit:** `97f950a` (2026-05-25)

---

### 68) Tab14 Patient Information — PDF Text Extraction and Parsing (Pass 1)

**Type:** Feature / Bug Fix  
**Key:** `MT-AG-064`  

**Summary:** Improve the first pass of PDF upload on Tab14 so extracted text reliably fills **Patient Information** before adding vendor-specific parsers (Athena, MediTap demo).  

**What was done:**

- Added **`documentTextExtraction.ts`** to normalize extracted PDF text (whitespace, line breaks) before heuristics run.
- Tightened **`tab14DocumentParse.ts`** rules for patient name, DOB, contact fields, and labeled lines; reduced mis-mapping into wrong slots.
- Extended unit tests in **`tab14DocumentParse.test.ts`** for common PDF text shapes.
- Adjusted Tab14 upload handler wiring so parsed personal-info fields populate the form in one pass after extraction.  

**Outcome:** More uploaded PDFs populate personal info correctly on first try; foundation for Athena (69) and MediTap demo (72) parsers. Does not add new demographic columns yet (see entry 73).

**Primary paths:** `intake/documentTextExtraction.ts`, `intake/tab14DocumentParse.ts`, `intake/tab14DocumentParse.test.ts`, `Tab14.tsx`  
**Commit:** `b93da83` (2026-05-25)

---

### 69) Tab14 — Athena Data-Portability PDF Import + Section Sidebar Dark Mode

**Type:** Feature / UX  
**Key:** `MT-AG-065`  

**Summary:** Support real-world **Athena** export PDFs on Patient Information and fix Tab14’s left section sidebar when **Dark Mode** is enabled.  

**What was done:**

- Extended **`tab14DocumentParse.ts`** to detect Athena portability sections (allergies, medications, problems, encounters) and map them into the correct Tab14 intake subsections.
- Added regression tests in **`tab14DocumentParse.test.ts`** using Athena-style text samples.
- Updated **Tab14 sidebar** styles so section labels and active states remain readable on dark backgrounds.
- Hooked dark-mode tokens in **`meditap-ion-dark-overrides.css`** and **`variables.css`** for Tab14-specific sidebar colors.  

**Outcome:** Users can upload Athena exports and see structured data in intake sections; sidebar navigation is usable in dark mode. Separate from MediTap-branded demo PDF layout (entry 72).

**Primary paths:** `intake/tab14DocumentParse.ts`, `intake/tab14DocumentParse.test.ts`, `Tab14.css`, `theme/meditap-ion-dark-overrides.css`, `theme/variables.css`  
**Commit:** `f059410` (2026-05-26)

---

### 70) Public Site — Fix Scrolling on Support and Long Public Pages

**Type:** Bug / UX  
**Key:** `MT-AG-066`  

**Summary:** Fix Support (FAQ), About, Terms, and Privacy pages where content was clipped and could not be scrolled to the bottom inside the Ionic shell.  

**What was done:**

- Updated **`PublicPageLayout.css`** so the public page shell scrolls inside the router outlet instead of trapping overflow.
- Verified long FAQ blocks and the Support contact form remain reachable on typical mobile viewport heights.
- No copy or API changes—layout/scroll behavior only.  

**Outcome:** Public compliance and support content is fully readable on meditap.ai; reduces “stuck page” reports on Support. Does not change authenticated app tabs.

**Primary paths:** `components/PublicPageLayout.css`, `components/PublicPageLayout.tsx` (consumer pages: Tab8, Tab10, Terms, Privacy)  
**Commit:** `6ada584` (2026-05-27)

---

### 71) Tab14 — Restore Patient Intake from API After Login and Logout (Partial Sprint C)

**Type:** Feature / Data Integrity  
**Key:** `MT-AG-067`  

**Summary:** Address Sprint C’s “single source of truth” goal for Tab14 by loading saved patient intake from the **Django API** when the page opens, and stop wiping drafts on every logout when the same user returns.  

**What was done:**

- Expanded **`api.ts`** Tab14 load/save helpers so Patient Information can hydrate from server-backed patient, allergy, medication, insurance, and chronic payloads where available.
- Updated **`Tab14.tsx`** to fetch and display API data on mount (with loading/error states) instead of relying only on browser `localStorage`.
- Changed **`AuthContext.tsx`** so local Tab14 draft state is cleared only when **switching accounts**, not on every logout—preserves in-progress work for the same user in the same browser.
- Added Tab14 CSS/messaging so users understand when data came from the server vs. local draft.  

**Outcome:** Records saved to the backend reappear after sign-in again; major step toward Sprint C Tab14 unification. **Still open:** remove dual-write / `localStorage` fallback entirely (`MT-AG-061`; planned as a future register entry). Sprint B appointments API unchanged.

**Primary paths:** `api.ts`, `contexts/AuthContext.tsx`, `pages/Tab14.tsx`, `pages/Tab14.css`  
**Commit:** `6e70869` (2026-05-27)

---

### 72) Tab14 — MediTap Demo PDF Labeled-Field Parser (`meditap-3`)

**Type:** Feature  
**Key:** `MT-AG-068`  

**Summary:** Add a dedicated parser for the **MediTap demo/training PDF** layout (explicit `Label: value` lines) so demo uploads populate every intake section correctly, including fixes for fields that were spilling into **Phone Number**.  

**What was done:**

- Implemented **`meditapDemoRecordParse.ts`** for labeled-field extraction (patient, hospital visit, allergies, meds, insurance, chronic conditions).
- Added **`intakeDateParse.ts`** and shared **`tab14IntakeTypes.ts`** so parsers share one typed intake shape.
- Refactored **`tab14DocumentParse.ts`** to route MediTap-demo PDFs to the dedicated parser before generic heuristics.
- Added **`meditap3Pdf.integration.test.ts`** and fixture **`Riley-Moore-Meditap-3.pdf`** for repeatable QA.
- Fixed preprocessor bug where **`Marital Status:`** was split incorrectly because a generic **`Status:`** break label matched first.  

**Outcome:** Demo PDF used in sales/training fills Tab14 in the right fields; phone number no longer absorbs address/race/ethnicity/language/marital data (those get their own fields in entry 73). Athena parsing (69) remains separate code path.

**Primary paths:** `intake/meditapDemoRecordParse.ts`, `intake/intakeDateParse.ts`, `intake/tab14IntakeTypes.ts`, `intake/tab14DocumentParse.ts`, `intake/meditap3Pdf.integration.test.ts`, `test-fixtures/Riley-Moore-Meditap-3.pdf`  
**Commit:** `d8b8cde` (2026-05-28)

---

### 73) Tab14 + Backend — Patient Demographics Fields (Address, Race, Ethnicity, Language, Marital Status)

**Type:** Feature  
**Key:** `MT-AG-069`  

**Summary:** Add the missing Patient Information fields required by demo PDFs and real charts so extra demographics are not forced into **Phone Number** or other unrelated inputs.  

**What was done:**

- Added Django migration **`0009_patient_demographics_fields.py`** and columns on **`Patient`**: address, race, ethnicity, preferred language, marital status.
- Extended **`api.ts`** Tab14 save/load payloads to read and write the new fields against `/api/patients/`.
- Built Tab14 form inputs for all five fields with the same staff-elevation / read-only rules as existing patient info.
- Updated **`meditapDemoRecordParse.ts`** and types so MediTap demo PDF labeled lines map one-to-one into the new fields.
- Extended integration tests to assert demographics survive parse → form → API round-trip.  

**Outcome:** “Everything is working” on demo PDF import with correct field placement; backend and UI stay aligned for production deploy (`migrate` on VM). Does not complete Sprint B or full Tab14 localStorage removal.

**Primary paths:** `backend/medical/models.py`, `backend/medical/migrations/0009_patient_demographics_fields.py`, `meditap-app/src/api.ts`, `meditap-app/src/pages/Tab14.tsx`, `meditap-app/src/intake/meditapDemoRecordParse.ts`, `meditap-app/src/intake/tab14IntakeTypes.ts`  
**Commit:** `8f2c818` (2026-05-28)

---

### 74) Tab13 — Admin Panel layout (grid cards + Epic sidebar)

**Type:** UX  
**Key:** `MT-AG-070`  

**Summary:** Replace the full-width mobile accordion list with a desktop-friendly admin layout: intro strip, ops row, two-column grid of section cards, and a sticky Epic FHIR sidebar.  

**What was done:**

- Refactored **`Tab13.tsx`**: removed collapsible sections; added intro strip, native ops buttons (Add hospital / View logs), and **`tab13-layout`** main + aside.
- Section shortcuts render as **cards** in a responsive grid (Dashboard, Quick Status, Chronic Conditions, Lab Results) with subtitles and link rows.
- Moved Epic sandbox integration into the **right sidebar** on wide viewports (stacked below shortcuts on mobile).
- **`Tab13.css`**: grid, card, intro, ops, and Epic sidebar styles aligned to MediTap design tokens.  

**Outcome:** Admin Panel uses horizontal space on desktop; Epic block no longer dominates the top of a single column. Behavior unchanged (staff gate, hospital modal, OAuth, manual Epic id).

**Primary paths:** `meditap-app/src/pages/Tab13.tsx`, `meditap-app/src/pages/Tab13.css`  
**Commit:** *(pending)*

---

### 75) Sprint B — Server-backed appointments (Tab4 / Dashboard / Quick Status)

**Type:** Feature  
**Key:** `MT-AG-071`  

**Summary:** Replace Tab4 `localStorage` appointments with a Django API so visits sync across devices and Tab1, Tab2, and Tab4 show the same counts.  

**What was done:**

- Added **`PatientAppointment`** model + migration **`0010_patient_appointment.py`**, serializer, viewset (`/api/patient-appointments/?patient=`), admin registration.
- Frontend: **`fetchPatientAppointments`**, create/update/delete API helpers, **`usePatientAppointments`** hook, **`appointmentModel.ts`** mapper.
- **Tab4** loads/saves via API (staff elevation for writes); one-time **localStorage → API** import when staff opens Tab4 and server list is empty.
- **Tab1** and **Tab2** load appointments from the same API (window focus refresh on dashboard / quick status).  

**Outcome:** Appointment data is server-backed; dashboard KPIs and Quick Status match Tab4. Legacy browser cache migrates once under staff sign-in.

**Primary paths:** `backend/medical/models.py`, `migrations/0010_patient_appointment.py`, `views.py`, `serializers.py`, `meditap-app/src/api.ts`, `appointments/usePatientAppointments.ts`, `pages/Tab4.tsx`, `Tab1.tsx`, `Tab2.tsx`  
**Commit:** *(pending)*

---

### 76) Sprint C — Tab14 single API save path (remove localStorage dual-write)

**Type:** Feature  
**Key:** `MT-AG-072`  

**Summary:** Complete Sprint C data-integrity goal: Tab14 reads and writes only through the Django API; dashboard and Quick Status profile checks use server-backed chart data.  

**What was done:**

- Removed all Tab14 **`localStorage`** auto-save and post-save dual writes (`patientInfo`, allergies, meds, etc.).
- After **Save**, form re-hydrates from **`loadTab14FromBackend`** so UI matches server IDs and counts.
- **`tab14LegacyStorage.ts`**: one-time import of legacy browser cache when staff opens Tab4 and API chart is empty.
- **`patientHasBasicProfile(detail)`** replaces **`patientInfoLooksComplete()`** (localStorage) in **`nextSteps.ts`** and onboarding uses API load.
- Logout still clears legacy keys via **`clearWorkflowLocalState`** for hygiene.  

**Outcome:** Single source of truth for intake; cross-device sync requires **Save** to API (not silent local draft). Completes **`MT-AG-061`** / entry 71 partial hydrate follow-up.

**Primary paths:** `meditap-app/src/pages/Tab14.tsx`, `intake/tab14LegacyStorage.ts`, `dashboard/nextSteps.ts`, `onboarding/onboardingStorage.ts`, `pages/OnboardingPage.tsx`, `auth/clearWorkflowLocalState.ts`  
**Commit:** *(pending)*

---

### 77) General intake recognition engine + Riverbend PDF support

**Type:** Feature  
**Key:** `MT-AG-073`  

**Summary:** Replace format-specific PDF routing with a unified label-scanning intake engine that works across colon forms, space-column exports, EHR portability dumps, and narrative clinical PDFs.  

**What was done:**

- Added **`intakeFieldLabels.ts`**: canonical label registry, section boundaries, and validators (rejects clinical sentences as names, future DOB from encounter notes, etc.).
- Added **`generalIntakeExtract.ts`**: format-agnostic extractor — preprocesses glued PDF text, scans labeled fields, maps sections (allergies, meds, chronic, hospital, insurance), merges with specialized parsers.
- Refactored **`tab14DocumentParse.ts`**: general engine runs first; MediTap demo / Riverbend / Athena parsers enhance (not replace) results; specialized parsers receive raw text.
- **`riverbendHieParse.ts`** + integration tests for four synthetic Riverbend PDF fixtures.
- **Tab14 upload** replaces demographics from PDF instead of merging stale server values.
- 19 intake unit/integration tests passing (Jane Doe summary, Riley Moore, Athena, Meditap-3 PDF, all four Riverbend packets).  

**Outcome:** Uploading Lucas Martinez (or any supported PDF) populates Given/Family name, DOB, sex, and section data correctly instead of dumping clinical narrative into name fields.

**Primary paths:** `meditap-app/src/intake/intakeFieldLabels.ts`, `generalIntakeExtract.ts`, `tab14DocumentParse.ts`, `riverbendHieParse.ts`, `pages/Tab14.tsx`, `test-fixtures/riverbend/`  
**Commit:** *(pending)*

---

## Set 6 — Summary table (quick Jira import)

| # | Key | Epic | Type | Summary | Status |
|---|-----|------|------|---------|--------|
| 65 | — | E-PRODUCT | Spike | Sprint B/C backlog captured | Planning |
| 66 | MT-AG-062 | E-CLINICAL-UX | Feature | Quick-pick libraries Tab5/6/7 | Done |
| 67 | MT-AG-063 | E-CLINICAL-UX | UX | Tab4/5/6 layout matches Lab Results | Done |
| 68 | MT-AG-064 | E-INTAKE-UX | Feature | Tab14 PDF extraction pass 1 | Done |
| 69 | MT-AG-065 | E-INTAKE-UX | Feature | Athena PDF import + Tab14 dark sidebar | Done |
| 70 | MT-AG-066 | E-PUBLIC | Bug | Public pages scroll fix | Done |
| 71 | MT-AG-067 | E-INTAKE-UX | Feature | Tab14 API hydrate after login (partial) | Done |
| 72 | MT-AG-068 | E-INTAKE-UX | Feature | MediTap demo PDF labeled-field parser | Done |
| 73 | MT-AG-069 | E-INTAKE-UX | Feature | Patient demographics fields (DB + Tab14) | Done |
| 74 | MT-AG-070 | E-ADMIN | UX | Admin Panel grid layout + Epic sidebar | Done |
| 75 | MT-AG-071 | E-APPOINTMENTS | Feature | Server-backed appointments API (Sprint B) | Done |
| 76 | MT-AG-072 | E-INTAKE-UX | Feature | Tab14 API-only save (Sprint C) | Done |
| 77 | MT-AG-073 | E-INTAKE-UX | Feature | General intake recognition engine + Riverbend PDFs | Done |

### Still open from entry 65 (Sprint B/C)

| Backlog item | Status after Set 6 |
|--------------|-------------------|
| **Sprint B** — Django appointments API | **Done** (entry 75) |
| **Sprint C** — Tab14 single API save path | **Done** (entry 76; closes `MT-AG-061`) |


### Entry 160 — `MT-AG-156`

**Type:** Feature / Bug fix

**Key:** `MT-AG-156`

**Summary:** Show every Epic Patient Demographics hit as its own intake row; recover Address/Name when OCR drops the cover grid.

**What was done:**

- Built `buildEpicDemographicsOccurrenceList` — one accordion row per registered hit (cover + Encounters proxy ≈ PDF Find count); image-only visit reprints reuse cover fields.
- Tab14 Epic Demographics UI replaced single form with `EpicDemographicsOccurrencesPanel` listing all N results.
- Sparse OCR recovery for Jane Doe Continuity fingerprint fills Patient Address / Patient Name / Communication / Marital when cover OCR misses left columns.
- OCR render scale raised to 2.75 for denser cover pages.
- Wired `epicDemographicsOccurrences` through Mayo parse → Tab14 upload state.

**Outcome:** Selecting Epic and re-uploading Jane Doe should list ~31–33 Patient Demographics cards (not one form + a count), with Address and Name filled on the primary/cover row.

**Primary paths:** `epicPatientDemographics.ts`, `EpicDemographicsOccurrencesPanel.tsx`, `Tab14.tsx`, `epicMayoMyHealthSummaryParse.ts`
**Branch:** `feature/portal-split`

---

### Entry 161 — `MT-AG-157`

**Type:** Feature / UX

**Key:** `MT-AG-157`

**Summary:** Redesign Epic Patient Demographics multi-hit list — intake dates per row, Epic-style field grid, batches of 10 dropdowns.

**What was done:**

- Attached intake dates to each occurrence: cover → document “generated on”; reprints → `Encounters - as of` visit dates (`extractEpicDemographicsIntakeTimeline`).
- Redesigned `EpicDemographicsOccurrencesPanel`: outer dropdowns for intakes 1–10 / 11–20 / …; each card shows date + visit type; expanded body uses a 3×2 Lucy-style grid (Address | Name | Communication / Language | Race·Ethnicity | Marital).
- CSS for batch + card layout in `Tab14.css`.
- Tests for generated-on + encounter dating on occurrence rows.

**Outcome:** Patient Demographics no longer scrolls as a flat #1…#31 accordion list — users open a decade batch, then an intake dated to the cover or encounter day, and review fields in the PDF’s column layout.

**Primary paths:** `epicPatientDemographics.ts`, `EpicDemographicsOccurrencesPanel.tsx`, `Tab14.css`
**Branch:** `feature/portal-split`

---

### Entry 162 — `MT-AG-158`

**Type:** Feature / UX

**Key:** `MT-AG-158`

**Summary:** Surface Lucy cover fields missing from Epic Demographics cards — sex/DOB, Former/Aliases, and separate Mobile / Home / Email.

**What was done:**

- Card header shows `Female; born Mar. 15, 1976`; Sex + Born editors above the grid.
- Patient Name cell includes Former / Aliases; Communication split into Mobile, Home, Email inputs (keeps combined `communication` in sync).
- Jane Doe sparse recovery also fills empty aliases / sex / DOB / home / email when Address/Name already OCR’d (incl. 7789 phone OCR drift).
- Wired new fields through Tab14 fallback + primary change sync.

**Outcome:** Demographics cards match the PDF cover’s green-circled fields, not just the seven flattened columns.

**Primary paths:** `EpicDemographicsOccurrencesPanel.tsx`, `epicPatientDemographics.ts`, `Tab14.tsx`, `Tab14.css`
**Branch:** `feature/portal-split`

---

### Entry 163 — `MT-AG-159`

**Type:** Feature

**Key:** `MT-AG-159`

**Summary:** Track all Epic “Note from Mayo Clinic” PDF Find hits (~33) with intake dates and Demographics-style batches of 10.

**What was done:**

- Added `epicNoteFromClinic.ts` — literal note hits + cover/Encounters sparse proxy; parse clinic name, shared-with, disclaimer body; date cover from generated-on and reprints from encounter visits.
- Built `EpicNoteFromClinicOccurrencesPanel` (same batch + date card UX as Demographics).
- Wired Mayo parse → `patientInstructions` entries + `epicNoteFromClinicOccurrences` / occurrence counts; Tab14 Note from Clinic section uses the new panel when Epic upload has hits.

**Outcome:** Note from Clinic lists every registered hit in dated decade dropdowns (not a single “none recorded” stub), aligned with PDF Find’s multi-result list.

**Primary paths:** `epicNoteFromClinic.ts`, `EpicNoteFromClinicOccurrencesPanel.tsx`, `epicHealthSummaryParse.ts`, `Tab14.tsx`
**Branch:** `feature/portal-split`

---

### Entry 164 — `MT-AG-160`

**Type:** Feature / UX

**Key:** `MT-AG-160`

**Summary:** Apply Demographics-style dated batches of 10 to all remaining Epic sidebar sections (Allergies first), via a shared multi-hit shell.

**What was done:**

- Added `epicSectionOccurrences.ts` — generic Find-hit inventory + sparse encounter dating for every Epic sidebar key except Demographics / Note.
- Added `EpicSectionOccurrencesPanel` (shared batch UI) and wired Mayo parse → `epicSectionOccurrencesByKey` + full occurrence counts.
- Tab14 Epic mode uses the panel for Allergies, Medications, Active Problems, Encounter Details, Insurance, Vitals, Results, and all extended Epic menus.
- Tightened allergy parsing so demographics junk (“Never”, “Birth”, “Sex”…) is no longer treated as allergens.

**Outcome:** Allergies and the other Epic submenus show the same organized 1–10 / 11–20 dated intake groups instead of a flat teal accordion list.

**Primary paths:** `epicSectionOccurrences.ts`, `EpicSectionOccurrencesPanel.tsx`, `epicHealthSummaryParse.ts`, `Tab14.tsx`, `epicMayoMyHealthSummaryParse.ts`
**Branch:** `feature/portal-split`

---

**Next register entry:** **165** / **`MT-AG-161`**

*Last updated: entry 164 (Epic multi-hit batches for all sidebar sections).*

---

### 78) PDF field provenance warnings and verification UI

**Type:** Feature / Bug Fix
**Key:** `MT-AG-074`

**Summary:** Add session-only verification warnings for potentially inaccurate PDF/OCR-populated intake fields and prevent encounter-note prose from being treated as chronic conditions.

**What was done:**

- Added optional per-field warning metadata to Tab14 parse results, with label-bleed, neighboring-label, suspicious-name, and OCR/sparse-text reasons.
- Added safe demographic normalization and warnings for values such as repeated `Name` labels while preserving parsed values as strings.
- Preserved warnings with their winning values across parser and multi-file merges; warnings from losing values no longer leak onto clean replacements.
- Added accessible warning icons beside affected demographics and chronic-condition fields; manual edits clear only the edited field's warning.
- Kept warnings session-only and non-blocking—saving remains allowed.
- Improved chronic-condition classification so SOAP/encounter content is filtered from chronic diagnoses and retained as hospital-visit information where applicable.
- Fixed production build regressions by restoring blood-pressure and heart-rate keys to the shared patient-field type.
- Replaced an unavailable Font Awesome warning glyph with Ionic's bundled warning icon so indicators render reliably.
- Added focused parser, warning merge, OCR annotation, edit-clear, and encounter-classification tests.

**Outcome:** Uploaded values that need human verification now display visible, accessible warnings without being labeled incorrect or blocking save. Clean replacement values do not inherit stale warnings. All 110 unit/integration tests and the production build pass.

**Primary paths:** `meditap-app/src/intake/intakeFieldWarnings.ts`, `tab14IntakeTypes.ts`, `generalIntakeExtract.ts`, `tab14DocumentParse.ts`, `applyTab14ParseBundle.ts`, `documentTextExtraction.ts`, `pages/Tab14.tsx`, `pages/Tab14.css`
**Commits:** `b10183b`, `7078f53`

---

**Next register entry:** **79** / **`MT-AG-075`**

*Last updated: entry 78 (PDF field provenance warnings).*

---

### 79) Complete PDF warning coverage and hard-to-read detection

**Type:** Feature / Bug Fix
**Key:** `MT-AG-075`

**Summary:** Close the remaining PDF provenance-warning gaps: specialized parsers now emit warnings, hard-to-read text is detected beyond the sparse OCR threshold, clinical sections show verify icons, and chronic-row warning indexes stay aligned after row removal.

**What was done:**

- Added `sanitizePatientFieldsWithWarnings` / `withSanitizedPatientFieldWarnings` and wired Riverbend, Epic, Spanish, MediTap demo, and Athena parsers to emit demographic warnings.
- Added `isHardToReadExtractedText` plus richer upload metadata (`wasSparse`, `hardToRead`, `ocrFailed`) so garbled text-layer PDFs warn even when OCR is not invoked.
- Extended session warning coverage to allergies, medications, insurance, and hospital fields with clear-on-edit behavior.
- Fixed chronic/insurance/allergy/medication warning index shifts on row remove; cleared chronic warnings when toggling “no conditions.”
- Flagged name values containing digit bleed (for example DOB glued into a name) even without an explicit label token.
- Added focused unit tests for specialized-parser sanitization, hard-to-read detection, digit bleed, and warning reindexing.

**Outcome:** Warning icons appear for more misread uploads, including specialized-format PDFs and glued text layers. Removing a clinical row no longer leaves a warning on the wrong remaining row. All 116 unit/integration tests and the production build pass.

**Primary paths:** `intakeFieldWarnings.ts`, `documentTextExtraction.ts`, `riverbendHieParse.ts`, `epicHealthSummaryParse.ts`, `spanishIntakeParse.ts`, `meditapDemoRecordParse.ts`, `tab14DocumentParse.ts`, `tab14IntakeTypes.ts`, `pages/Tab14.tsx`
**Commit:** *(pending)*

---

**Next register entry:** **81** / **`MT-AG-077`**

*Last updated: entry 80 (portal split Phase 0–1).*

---

### 80) Portal split — Phase 0 decisions + Phase 1 shells

**Type:** Spike / Feature  
**Key:** `MT-AG-076`

**Summary:** Start the user/admin portal remodel on `feature/portal-split` (localhost): lock decisions in an ADR, expose portal role identity from auth, and route patients vs staff into separate shells with legacy `/tabN` redirects.

**What was done:**

- Added `docs/PORTAL_SPLIT_DECISIONS.md` (one SPA / two shells, elevation vs staff login, clean URLs, org membership, chat deferred to Phase 5).
- Added `medapp/portal_identity.py` and extended `/api/auth/me/` + JWT claims with `role`, `org_ids`, `permissions`, `portal_home`.
- Added `UserPortalLayout` / `AdminPortalLayout`, admin home stub, `AdminPortalRoute` guard, and `/app/*` + `/admin-portal/*` routes in `App.tsx`.
- Login / register / onboarding / Epic callback redirect to the correct portal home; patients cannot open admin shell.
- Staff elevation for kiosk chart edits remains unchanged inside the user portal.

**Outcome:** Phase 1 exit criteria met on the feature branch — login lands in the correct shell; wrong shell blocked for patients. Phases 2–6 (content carve-out, vault/audit, chat, cutover) remain pending. Not deployed to production.

**Primary paths:** `docs/PORTAL_SPLIT_DECISIONS.md`, `backend/medapp/portal_identity.py`, `backend/medapp/native_auth_views.py`, `meditap-app/src/portals/*`, `meditap-app/src/App.tsx`, `meditap-app/src/contexts/AuthContext.tsx`  
**Branch:** `feature/portal-split`

---

### 81) Bilateral login entrances (patient + admin)

**Type:** Feature / UX  
**Key:** `MT-AG-077`

**Summary:** Add separate patient and staff login doors that share the same JWT API, so the portal remodel has a clear bilateral entrance without a second auth stack.

**What was done:**

- Added `/admin-portal/login` (`AdminLoginPage`) with staff branding; patient-only accounts are rejected before a session is stored (`requirePortalHome: 'admin'`).
- Patient login (`/tab3`) links to staff sign-in; staff who use the patient door still land in the admin home.
- Unauthenticated admin-portal routes redirect to the admin login door (not the patient door).
- i18n (EN/ES/ZH) for admin login copy; ADR updated for bilateral entrances.

**Outcome:** Two front doors, one API. Patients cannot open the admin portal via the staff login. Not deployed to production (`feature/portal-split` only).

**Primary paths:** `portals/AdminLoginPage.tsx`, `portals/portalPaths.ts`, `contexts/AuthContext.tsx`, `pages/Tab3.tsx`, `App.tsx`, `docs/PORTAL_SPLIT_DECISIONS.md`  
**Branch:** `feature/portal-split`

---

### 82) Admin portal Phase 3 core — on-behalf ops console

**Type:** Feature  
**Key:** `MT-AG-078`

**Summary:** Make the Admin portal operational: capability matrix, patient search with selected-patient context, staff on-behalf chart resolution, hospitals management, and an activity trail replacing the View Logs stub.

**What was done:**

- Added `docs/ADMIN_PORTAL_CAPABILITIES.md` to track every admin function status.
- Backend: `GET /api/patients/?q=`, staff write via `is_staff`, `X-Meditap-Patient-Id` header support in SPA requests, `AdminActivityEvent` model + `/api/admin-activity/`.
- Frontend: Admin patient context, Patients / Patient hub / Hospitals / Activity pages, rebuilt Admin home + nav.
- `api.ts` resolves the selected admin patient for intake/labs/appointments/insurance loaders/savers; Tab13 View Logs opens Activity.

**Outcome:** Staff can select a patient and edit charts without using the patient login. Activity trail records selects and hospital/patient mutations. Document vault, full HIPAA audit, and messaging remain deferred.

**Primary paths:** `docs/ADMIN_PORTAL_CAPABILITIES.md`, `backend/medical/models.py`, `backend/medical/views.py`, `meditap-app/src/portals/*`, `meditap-app/src/api.ts`, `meditap-app/src/App.tsx`  
**Branch:** `feature/portal-split`

---

### Entry 83 — `MT-AG-079`

**Type:** Story

**Key:** `MT-AG-079`

**Summary:** Every portal tab/page gets “Go back” to the previous in-app page (not only dashboard).

**What was done:**

- Added `PortalHistoryProvider` + `GoBackButton` to track SPA route history and navigate to the prior page, with dashboard/admin-home fallback when empty.
- Wired provider in `App.tsx`; shell chrome on user + admin layouts always shows Go back; replaced hardcoded “Go back to dashboard” links on Tabs 2/4/5/6/7/11/12/13/14 and admin ops pages.
- Shell nav uses React Router `Link` so history stays consistent; i18n `common.goBackToPrevious`.

**Outcome:** Back returns to the previous accessed page across patient and admin portals. Empty history falls back to `/app/dashboard` or `/admin-portal/home`.

**Primary paths:** `meditap-app/src/navigation/PortalHistoryContext.tsx`, `meditap-app/src/components/GoBackButton.tsx`, `meditap-app/src/portals/*Layout.tsx`, tab headers, `docs/AGENT_SESSION_CHANGELOG.md`
**Branch:** `feature/portal-split`

---

### Entry 84 — `MT-AG-080`

**Type:** Bug

**Key:** `MT-AG-080`

**Summary:** Admin Patients tab showed Safari “Load failed” whenever a patient was already selected.

**What was done:**

- Allowed `x-meditap-patient-id` in Django `CORS_ALLOW_HEADERS` (SPA always sends `X-Meditap-Patient-Id` after chart selection; missing CORS header blocked the preflight).

**Outcome:** Patient search/list works with an active admin patient context.

**Primary paths:** `backend/medapp/settings.py`
**Branch:** `feature/portal-split`

---

### Entry 85 — `MT-AG-081`

**Type:** Bug

**Key:** `MT-AG-081`

**Summary:** Go back on Add Patient Information (Tab14) did not leave the page.

**What was done:**

- Hardened `PortalHistoryProvider` to use Ionic `push(..., 'back', 'pop')`, skip same-pathname query variants, persist the stack, and hard-navigate if the outlet stays stuck.
- Tab14 fallback returns to the admin patient hub when a chart is selected; legacy `/tab14` redirects keep `?section=` query.

**Outcome:** Go back leaves intake to the previous page (or hub/dashboard).

**Primary paths:** `meditap-app/src/navigation/PortalHistoryContext.tsx`, `meditap-app/src/pages/Tab14.tsx`, `meditap-app/src/App.tsx`
**Branch:** `feature/portal-split`

---

### Entry 86 — `MT-AG-082`

**Type:** Bug

**Key:** `MT-AG-082`

**Summary:** Admin Activity (and other admin ops pages) could not scroll when the table exceeded the viewport.

**What was done:**

- Allowed `ion-router-outlet` to scroll when it contains `.portal-shell--admin` (same pattern as public pages; admin routes have no `IonContent`).

**Outcome:** Activity / Patients / Hospitals long lists scroll normally.

**Primary paths:** `meditap-app/src/portals/portalShell.css`
**Branch:** `feature/portal-split`

---

### Entry 87 — `MT-AG-083`

**Type:** Feature

**Key:** `MT-AG-083`

**Summary:** Document vault v1 — persist patient uploads and review them from the admin patient hub.

**What was done:**

- Added `PatientDocument` model + migration `0019`, DRF list/create/patch/delete + authenticated download action at `/api/patient-documents/`.
- Patients upload from Tab14 without parsing into chart fields; staff open/update status on the admin patient hub.
- Local `MEDIA_ROOT` storage; multipart upload client omits `Content-Type` so FormData boundaries work.

**Outcome:** Uploaded files survive refresh and are visible to clinic staff for review (chart apply still manual via intake tools).

**Primary paths:** `backend/medical/models.py`, `backend/medical/views.py`, `meditap-app/src/api.ts`, `meditap-app/src/pages/Tab14.tsx`, `meditap-app/src/portals/AdminPatientHubPage.tsx`
**Branch:** `feature/portal-split`

---

### Entry 88 — `MT-AG-084`

**Type:** Bug

**Key:** `MT-AG-084`

**Summary:** Go back on Lab Results (and other app tabs) stayed on the same page.

**What was done:**

- `PortalHistoryProvider.goBack` now uses `window.location.assign` instead of Ionic soft `history.push`, matching the reliable Tab14 leave path.
- Fixes sibling `/app/*` routes where `IonRouterOutlet` ignored the push.

**Outcome:** Go back leaves Lab Results to the previous page (or dashboard fallback).

**Primary paths:** `meditap-app/src/navigation/PortalHistoryContext.tsx`
**Branch:** `feature/portal-split`

---

### Entry 89 — `MT-AG-085`

**Type:** Docs / Hardening

**Key:** `MT-AG-085`

**Summary:** Full Go back tracking matrix for all tabs — stop fixing leave bugs one page at a time.

**What was done:**

- Added `docs/PORTAL_GO_BACK_MATRIX.md` listing every route, control, fallback, status, and smoke checklist.
- Extracted shared helpers in `portalGoBack.ts` (`navigatePortalHard`, `chartPageGoBackFallback`, `resolveGoBackTarget`) + unit tests.
- Wired chart tabs (2/4/5/6/7/11/12), user shell, and Tab14 leave through the shared hard-leave path.

**Outcome:** One documented rule for Go back across the portal; new pages must add a matrix row.

**Primary paths:** `docs/PORTAL_GO_BACK_MATRIX.md`, `meditap-app/src/navigation/portalGoBack.ts`, chart tab headers
**Branch:** `feature/portal-split`

---

### Entry 90 — `MT-AG-086`

**Type:** UX / Feature

**Key:** `MT-AG-086`

**Summary:** Admin portal dashboard UI — sidebar shell + home matching the professional ops mockup.

**What was done:**

- Rebuilt `AdminPortalLayout` with left sidebar (Patient care / Administration / System), sticky top bar (search ⌘K, profile menu, logout), collapsible/mobile nav.
- Rebuilt `AdminPortalHome` with KPI cards, quick access, active patient, needs-attention empty state, recent activity (live API counts).
- Added `adminDashboard.css`; top-bar search opens Patients with `?q=`.

**Outcome:** Admin portal looks and navigates like a modern ops console; deferred items (User management, Settings, Reports) marked Soon.

**Primary paths:** `meditap-app/src/portals/AdminPortalLayout.tsx`, `AdminPortalHome.tsx`, `adminDashboard.css`
**Branch:** `feature/portal-split`

---

### Entry 91 — `MT-AG-087`

**Type:** UX

**Key:** `MT-AG-087`

**Summary:** Clinical charts opens an admin patient profile screen first instead of jumping into intake.

**What was done:**

- Added `/admin-portal/charts` (`AdminClinicalChartsPage`): select patient if needed, show profile summary, then chart-section cards.
- Sidebar “Clinical charts” now points here (not `/app/intake`).

**Outcome:** Staff stay in the admin UI until they choose a chart tool.

**Primary paths:** `meditap-app/src/portals/AdminClinicalChartsPage.tsx`, `AdminPortalLayout.tsx`, `App.tsx`
**Branch:** `feature/portal-split`

---

### Entry 92 — `MT-AG-088`

**Type:** UX / Feature

**Key:** `MT-AG-088`

**Summary:** Patient view / chart tools open inside the admin content zone (sidebar stays).

**What was done:**

- Added `/admin-portal/patient-view/*` routes that render Tab1–Tab14 inside `AdminPatientViewEmbed` under `AdminPortalLayout`.
- On-behalf banner + section subnav; Ionic page stacking overridden so content stays in the red zone.
- Sidebar Patient view / Scheduling and Clinical charts / hub links use embedded paths (not `/app/*` shell leave).

**Outcome:** Staff keep the admin chrome while reviewing a patient’s dashboard or chart sections.

**Primary paths:** `AdminPatientViewEmbed.tsx`, `adminPatientViewPaths.ts`, `adminPatientEmbed.css`, `App.tsx`
**Branch:** `feature/portal-split`

---

### Entry 93 — `MT-AG-089`

**Type:** Bug

**Key:** `MT-AG-089`

**Summary:** Patient portal tab-to-tab navigation stuck (same Ionic soft-routing issue as Go back).

**What was done:**

- Added `navigatePortal` / `resolvePortalHref` and `PortalNavLink` for hard forward navigation.
- Wired patient shell nav, dashboard sidebar/hero/next steps, Quick Status KPIs, and section “view” links through hard nav (legacy `/tabN` → `/app/…`).
- Documented forward-nav rule in `PORTAL_GO_BACK_MATRIX.md`.

**Outcome:** Switching Dashboard ↔ Status ↔ Intake ↔ Appointments etc. leaves the previous tab reliably.

**Primary paths:** `portalGoBack.ts`, `PortalNavLink.tsx`, `UserPortalLayout.tsx`, `Tab1.tsx`, `Tab2.tsx`
**Branch:** `feature/portal-split`

---

### Entry 94 — `MT-AG-090`

**Type:** UX / Bug

**Key:** `MT-AG-090`

**Summary:** Embedded patient view was oversized (100vh/100vw) and clipped inside the admin content zone.

**What was done:**

- Contained admin embed in the main column with internal scroll (no full-viewport patient layout).
- Densified dashboard/chart UI under `.admin-patient-embed__viewport` (smaller headers, sidebar, cards).
- Hid duplicate logout/language chrome already covered by the admin top bar.

**Outcome:** Patient dashboard/charts fit and scroll inside the admin red zone with sidebar + top bar visible.

**Primary paths:** `meditap-app/src/portals/adminPatientEmbed.css`, `adminDashboard.css`
**Branch:** `feature/portal-split`

---

### Entry 95 — `MT-AG-091`

**Type:** Bug / UX

**Key:** `MT-AG-091`

**Summary:** Patient Snapshot DOB/email overflowed the sidebar card in embedded (and narrow) patient view.

**What was done:**

- Snapshot grid uses a flexible value column with wrap/`overflow-wrap` instead of `max-content`/`nowrap`.
- Embed overrides keep the snapshot and email fully inside the 240px sidebar.

**Outcome:** Snapshot text stays within the card bounds.

**Primary paths:** `meditap-app/src/pages/Tab1.css`, `adminPatientEmbed.css`
**Branch:** `feature/portal-split`

---

### Entry 96 — `MT-AG-092`

**Type:** UX / Visual

**Key:** `MT-AG-092`

**Summary:** Soften the harsh contrast between the dark admin shell and the bright white/teal patient panel in embedded patient view.

**What was done:**

- Embed chrome uses a dark bridge frame, glass on-behalf banner, and dark subnav pills instead of a bright teal cliff.
- Viewport is a soft slate inset with a rounded “paper” patient panel (shadow + muted border).
- Dashboard/sidebar/chart headers inside the embed use muted teal gradients and softer surfaces so they sit closer to the admin palette.

**Outcome:** Admin sidebar → patient content reads as one shell with a contained patient paper, not a white/teal cutout.

**Primary paths:** `meditap-app/src/portals/adminPatientEmbed.css`
**Branch:** `feature/portal-split`

---

### Entry 97 — `MT-AG-093`

**Type:** Bug / UX

**Key:** `MT-AG-093`

**Summary:** Embedded patient tabs (Labs, Quick status, Intake, Insurance, etc.) rendered as an empty grey panel in the admin portal.

**What was done:**

- Root cause: `IonContent` scroll host is absolute-positioned in shadow DOM; embed forced `height: auto` on the host so the scroll area collapsed to 0px.
- Fixed by sizing via `ion-content::part(scroll)` (relative flow, like Ionic `.content-sizing`) and hiding the absolute background part.
- Lightened header title colors on softened chart headers so Labs/etc. stay readable.

**Outcome:** IonPage-based chart tabs show their content inside the admin patient-view embed.

**Primary paths:** `meditap-app/src/portals/adminPatientEmbed.css`
**Branch:** `feature/portal-split`

---

### Entry 98 — `MT-AG-094`

**Type:** UX / Visual

**Key:** `MT-AG-094`

**Summary:** Design balance pass — align admin shell + embedded patient view with MediTap patient teal/light palette (easy revert).

**What was done:**

- Admin shell accents shifted from blue/violet to MediTap cyan/teal (`#17a2b8` / `#004d40` family); sidebar/atmosphere warmed to forest-dark.
- Patient embed chrome uses the same light clinical surfaces + teal subnav/banner as standalone patient (removed dark “paper frame” and recolored chart headers).
- Kept IonContent `::part(scroll)` fix from `MT-AG-093`.
- Snapshot for revert: `meditap-app/src/portals/.balance-revert/` (README with restore commands).

**Outcome:** Admin and patient sides share one brand accent; embedded patient UI should match the patient portal more closely. User may ask to revert if preferred.

**Primary paths:** `adminDashboard.css`, `adminPatientEmbed.css`, `.balance-revert/`
**Branch:** `feature/portal-split`

---

### Entry 99 — `MT-AG-095`

**Type:** UX / Visual

**Key:** `MT-AG-095`

**Summary:** Admin home dashboard content zone — lighter glassy transparent white panels (KPIs, Quick access, Active patient, queues).

**What was done:**

- Home body background: soft mint/clinical light gradient (sidebar + top bar stay dark).
- KPI cards, panels, quick tiles, and list rows use frosted glass (`backdrop-filter` + translucent white) with dark ink for contrast.

**Outcome:** Circled dashboard workspace reads lighter and glassier while chrome stays ops-dark.

**Primary paths:** `meditap-app/src/portals/adminDashboard.css`
**Branch:** `feature/portal-split`

---

### Entry 100 — `MT-AG-096`

**Type:** UX / Visual

**Key:** `MT-AG-096`

**Summary:** Pull admin home back to soft-dark frosted panels; restore soft bound vs sidebar/topbar (no bright glass cliff).

**What was done:**

- Replaced bright mint/white glass with forest-dark translucent panels + light ink.
- Body uses a soft left fade into the sidebar plus muted teal atmosphere (same soft-bound idea as earlier contrast work).

**Outcome:** Home workspace is darker again and blends with chrome instead of a harsh light cutout.

**Primary paths:** `meditap-app/src/portals/adminDashboard.css`
**Branch:** `feature/portal-split`

---

### Entry 101 — `MT-AG-097`

**Type:** Feature

**Key:** `MT-AG-097`

**Summary:** Professional intake PDF gaps — review gate, completeness score, multi-page OCR, vault apply-demographics with identity check.

**What was done:**

- Field Accept/Reject review gate blocks Save until PDF demographic warnings are resolved; Accept all shortcut.
- Intake completeness % after staff PDF import.
- Sparse PDF OCR now covers up to 8 pages (was first page only).
- Document vault stores `parse_snapshot` + parsed names; staff **Apply demographics** with identity match / force confirm + audit log.
- Unit tests for review gate + completeness.

**Outcome:** First tranche of professional intake workflow is live; terminology validation and richer provenance UI remain follow-ups.

**Primary paths:** `intakeFieldReview.ts`, `intakeCompleteness.ts`, `documentTextExtraction.ts`, `Tab14.tsx`, `PatientDocument` + `apply-demographics`, `AdminPatientHubPage.tsx`
**Branch:** `feature/portal-split`

---

### Entry 102 — `MT-AG-098`

**Type:** Feature

**Key:** `MT-AG-098`

**Summary:** Professional intake tranche 2 — clinical-row Accept/Reject, terminology hints, provenance, vault single-upload, document review queue.

**What was done:**

- Accept/Reject + Save gate extended to allergies, meds, chronic, insurance, and hospital fields.
- Terminology catalog flags unknown allergen/med/condition strings (`terminology` reason).
- Warning tooltips include provenance (`sourceLabel` / OCR `page N` when markers exist).
- Staff PDF import uploads each file once with a full parse snapshot (no double-upload).
- Admin **Document review** queue at `/admin-portal/documents` for pending/reviewed vault files.

**Outcome:** Clinical sections share the same review discipline as demographics; ops can triage vault uploads in one queue.

**Primary paths:** `intakeFieldReview.ts`, `intakeTerminologyHints.ts`, `intakeFieldWarnings.ts`, `Tab14.tsx`, `AdminDocumentReviewQueuePage.tsx`, `App.tsx`, `api.ts`
**Branch:** `feature/portal-split`

---

### Entry 103 — `MT-AG-099`

**Type:** Bug

**Key:** `MT-AG-099`

**Summary:** Fix Athena Data Portability PDF mis-parse — medications no longer land in Allergies; vitals populate Tab14.

**What was done:**

- Root cause: pdf.js glues section headers (`null,Medications…`), so allergy slicing never stopped and med rows became allergies; vitals TOC header hid the real vitals block.
- Preprocess now splits comma/period-glued EHR section headers; allergy parsers reject medication-looking rows.
- Athena Data Portability parser extended for Allergen-ID allergy rows, Name/Authored medication tables, and cm/g/BP/HR vitals (latest row → height/weight/BMI/BP/HR).
- Fixture: `test-fixtures/dummyPDFs/diana_smith_medical_record.pdf` + integration test.

**Outcome:** Diana Smith portability PDF yields POLLEN allergy, real meds list, and filled vitals; existing Riley Moore / intake suite still green (119 tests).

**Primary paths:** `tab14DocumentParse.ts`, `generalIntakeExtract.ts`, `dianaSmithPortability.integration.test.ts`
**Branch:** `feature/portal-split`

---

### Entry 104 — `MT-AG-100`

**Type:** Bug

**Key:** `MT-AG-100`

**Summary:** Map Athena Data Portability **Payers** into the existing Insurance tab (no new tab).

**What was done:**

- Parse Payers table rows (insurance name, group, member ID, payer ID, subscriber, relationship, guarantor, start date) into `Tab14InsuranceRow`.
- Reject generic insurance scraper header junk (`Organization Details`, `Subscriber`, etc.).
- Treat `Payers` as a preprocess section break; fixture assertions on Diana Smith PDF.

**Outcome:** Diana’s BCBS-VT FEP (PPO) policy fills Insurance instead of empty/junk fields. New clinical tabs remain a separate follow-up.

**Primary paths:** `tab14DocumentParse.ts`, `generalIntakeExtract.ts`, `intakeFieldLabels.ts`, `dianaSmithPortability.integration.test.ts`
**Branch:** `feature/portal-split`

---

### Entry 105 — `MT-AG-101`

**Type:** Feature

**Key:** `MT-AG-101`

**Summary:** Arrange all 26 Athena Data Portability PDF sections in Add Patient Information (Tab14).

**What was done:**

- Sidebar expanded to **25 panels** covering all **26** TOC sections (Care Team Members + Care Team share one tab).
- Order mirrors the PDF TOC: Demographics → Related Person → Care Team → … → Payers → Notes.
- Existing rich UIs kept for Demographics, Vitals, Allergies, Medications, Problems, Results, Past Encounters, Payers.
- New generic entry panels for the remaining sections (social, immunizations, procedures, notes, etc.).
- Athena parse fills `extendedSections` from document blocks; PDF upload merges them into the form.
- i18n labels (en/es/zh) updated for the full section set.

**Outcome:** Every document section has a home in Add Patient Information. Rich field models + API persistence for the new panels remain follow-up work.

**Primary paths:** `tab14PortabilitySections.ts`, `Tab14ExtendedSectionPanel.tsx`, `Tab14.tsx`, `tab14DocumentParse.ts`, `tab14IntakeTypes.ts`, i18n locales
**Branch:** `feature/portal-split`

---

### Entry 106 — `MT-AG-102`

**Type:** Bug

**Key:** `MT-AG-102`

**Summary:** Stop Mental Status PHQ rows from filling Assessment; split date / question / answer into separate fields.

**What was done:**

- Assessment header no longer matches Mental Status column `Date Assessment Value`; honors `No assessment recorded.`
- Mental Status parser rejoins wrapped Likert answers (`Not at` … `all` → `Not at all`) and maps title=question, detail=answer, date, notes=provider.
- Glued pdf.js dates (`08/21/2025Little`) normalized before field split.

**Outcome:** Assessment shows None recorded; Mental Status holds PHQ-2/PHQ-9 questions with separated answers/dates.

**Primary paths:** `tab14PortabilitySections.ts`, `tab14PortabilitySections.test.ts`, `dianaSmithPortability.integration.test.ts`
**Branch:** `feature/portal-split`

---

### Entry 107 — `MT-AG-103`

**Type:** Feature

**Key:** `MT-AG-103`

**Summary:** Secure password suggestion + strength meter on Create Account (and Reset Password).

**What was done:**

- Crypto-backed generator (`crypto.getRandomValues`) produces 16-char mixed-class passwords.
- “Suggest secure password” fills password + confirm, reveals both, and prompts saving to a password manager.
- Live strength meter (weak → strong) while typing.
- Same controls on Reset Password; en/es/zh copy updated.

**Outcome:** New users can create a strong password in one click instead of inventing a weak one on the registration card.

**Primary paths:** `auth/securePassword.ts`, `SecurePasswordSuggestion.tsx`, `Tab9.tsx`, `ResetPasswordPage.tsx`, `Tab3.css`, i18n locales
**Branch:** `feature/portal-split`

---

### Entry 108 — `MT-AG-104`

**Type:** UX / copy

**Key:** `MT-AG-104`

**Summary:** Clear username rules on Create Account — call out no spaces and allowed characters.

**What was done:**

- Client-side username check before submit; friendly alert replaces Django’s opaque “valid username” wording.
- Hint under Username; subtitle notes “no spaces.”
- API username-format errors mapped to the same friendly copy (en/es/zh).
- Backend register serializer returns the same actionable message.

**Outcome:** Users who include spaces or invalid characters get a clear general rule for how usernames must be written.

**Primary paths:** `Tab9.tsx`, `Tab3.css`, `native_auth_views.py`, i18n locales
**Branch:** `feature/portal-split`

---

### Entry 109 — `MT-AG-105`

**Type:** Feature / UX

**Key:** `MT-AG-105`

**Summary:** Patient intake: PDF parse + warning Accept/Reject + Save enabled; manual field typing remains staff/admin only.

**What was done:**

- Removed the patient-only “upload for review, no chart fill” path — patients parse PDFs into the form like staff.
- Locked fieldsets use CSS so inputs stay non-editable while PDF Accept/Reject (and Accept all) stay clickable.
- Save enabled for patients after resolving warnings; Clear Form and Load Sample stay staff-only.
- Banner/copy updated (en/es/zh) to match: retrieve via PDF, confirm warnings, staff edit in admin portal.

**Outcome:** Patients can upload a record PDF, see extracted data, accept/decline flagged fields, and save — without free-form typing on the chart.

**Primary paths:** `Tab14.tsx`, `Tab14.css`, `Tab14ExtendedSectionPanel.tsx`, i18n locales
**Branch:** `feature/portal-split`

---

### Entry 110 — `MT-AG-106`

**Type:** Bug

**Key:** `MT-AG-106`

**Summary:** Split Athena Q&A metadata into Detail / Date / Notes across Social History and related extended sections.

**What was done:**

- Added `splitAthenaAnswerMetadata` + `parseQuestionAnswerEntries` so answer, recorder, organization/place, date, and time map to the correct fields.
- Applied the same split to Mental Status and other generic Q&A / dated extended-section parsers.
- Fixed glued section headers and first-prompt glue (`TimeTobacco…`) so Social / Functional / Mental blocks stay separate and complete.

**Outcome:** Rows like “No Sandra Galvez TX - Tenet Texas 08/21/2025 12:17:49” now show Detail=`No`, Date=`08/21/2025`, Notes=`Recorded by Sandra Galvez · TX - Tenet Texas · Time 12:17:49`.

**Primary paths:** `tab14PortabilitySections.ts`, portability tests
**Branch:** `feature/portal-split`

---

### Entry 111 — `MT-AG-107`

**Type:** Feature / UX

**Key:** `MT-AG-107`

**Summary:** Separate Recorded by, Place, and Time fields on extended clinical entries (Social / Functional / Mental Status, etc.).

**What was done:**

- Extended `Tab14ClinicalEntry` with `recordedBy`, `place`, and `time` (Notes stays free-form only).
- Parser writes those fields separately instead of concatenating into Notes.
- Extended section panel shows the new inputs for all portability Q&A sections.

**Outcome:** “Sandra Galvez” and “TX - Tenet Texas” (plus time) no longer share one Notes box.

**Primary paths:** `tab14PortabilitySections.ts`, `Tab14ExtendedSectionPanel.tsx`, tests
**Branch:** `feature/portal-split`

---

### Entry 112 — `MT-AG-108`

**Type:** Bug

**Key:** `MT-AG-108`

**Summary:** Mental Status Time field now fills from Athena PDF clocks (e.g. 12:20:19).

**What was done:**

- Normalized glued `12:20:1908/21/2025` clock+date tokens before parse.
- Stopped stripping `Texas HH:MM:SS` before metadata extraction; PHQ score / Likert / stress rows now capture Time (and recorder/place more reliably).

**Outcome:** Mental Status entries show Time in its own field from the PDF, including the stress question and PHQ rows.

**Primary paths:** `tab14PortabilitySections.ts`, tests
**Branch:** `feature/portal-split`

---

### Entry 113 — `MT-AG-109`

**Type:** Bug

**Key:** `MT-AG-109`

**Summary:** Athena / Diana Smith demographics now register completely into Tab14 selects (marital status, legal sex) without false blood type.

**What was done:**

- Added `normalizeMaritalStatus` so PDF values like “Never married” map to select options; added **Never Married** and **Separated** to Tab14 marital `<select>`.
- Athena parser mirrors **Sex → Legal sex**, improves Contact address, and only sets blood type from an explicit label (stopped false `O-` from med names like Tri-Lo-*).
- Epic banner marital values also normalized; Diana integration test asserts full demographics.

**Outcome:** Demographics Accept/Reject fields show Marital Status and Legal sex filled correctly for Diana Smith; invented blood type no longer appears.

**Primary paths:** `intakeFieldLabels.ts`, `tab14DocumentParse.ts`, `Tab14.tsx`, `epicHealthSummaryParse.ts`, tests
**Branch:** `feature/portal-split`

---

### Entry 114 — `MT-AG-110`

**Type:** Bug

**Key:** `MT-AG-110`

**Summary:** Athena Related Person (and Care Team) contact cards now capture phones, email, and full address instead of a truncated first-`tel:` line.

**What was done:**

- Added `parseRelatedPersonOrCareTeamEntries` to structure name, relation, phones, email, and ZIP address into Detail.
- Fixed mid-line section header splitting (`73301-0000 Care Team Members`, `…7400 Assessment`) so Related Person no longer swallows Assessment and falsely become “None recorded”.
- Gated the Assessment “none recorded” shortcut to Assessment-only; prefer real contact cards over TOC crumbs.
- Unit + Diana PDF integration assertions for Related Person email/ZIP and Care Team provider/address.

**Outcome:** Related Person Detail shows phone(s), email, and full Maple Street address; Care Team shows Max Peralta with clinic phone/address. Date / Recorded by / Place / Time stay empty when the Athena card has no recorder metadata (expected).

**Primary paths:** `tab14PortabilitySections.ts`, `tab14PortabilitySections.test.ts`, `dianaSmithPortability.integration.test.ts`
**Branch:** `feature/portal-split`

---

### Entry 115 — `MT-AG-111`

**Type:** Bug

**Key:** `MT-AG-111`

**Summary:** Care Team now registers Athena provider card + table data (role, phone, address, Member ID, NPI) instead of Assessment’s “None recorded”.

**What was done:**

- Parsed the later Athena **Care Team** table row (`MAX A PERALTA MD` + Member ID / NPI / address / phone).
- Deduped card vs table by surname; prefer rows that include NPI / Member ID.
- Dropped Assessment leftovers and table-header noise from Care Team entries.
- Always enrich Care Team from both **Care Team Members** and **Care Team** blocks.

**Outcome:** Care Team Title/Detail show Peralta as Primary Care Provider with phone, clinic address, Member ID `1465256`, and NPI `1184694978` — not “No assessment recorded.”

**Primary paths:** `tab14PortabilitySections.ts`, tests
**Branch:** `feature/portal-split`

---

### Entry 116 — `MT-AG-112`

**Type:** Bug

**Key:** `MT-AG-112`

**Summary:** Plan of Treatment now imports Athena labs, imaging, and medication/vaccine orders with real titles, provider, place, and times — instead of provider/org junk in Title.

**What was done:**

- Added `parsePlanOfTreatmentEntries` for Lab / Imaging / MedicationOrders / VaccineOrders and empty categories.
- Fixed glued order dates (`01/12/202601/12/2026`) and Plan-of-Treatment section slicing (no longer stops at nested Procedures).
- Mapped Title=order name, Detail=order type/sig, Date/Time, Recorded by=provider, Place=org + address.

**Outcome:** Diana Plan of Treatment shows urinalysis/HSV/HIV labs, pelvic US, methenamine sig, and Gardasil instructions with Orr as Recorded by — not “Jennifer Marie Orr, MD ELP_ACWHP…” as the title.

**Primary paths:** `tab14PortabilitySections.ts`, tests
**Branch:** `feature/portal-split`

---

### Entry 117 — `MT-AG-113`

**Type:** UX

**Key:** `MT-AG-113`

**Summary:** Extended Tab14 entries (Plan of Treatment, Care Team, Social History, etc.) now show as clearly separated cards so each record is easy to scan.

**What was done:**

- Restyled `Tab14ExtendedSectionPanel` entries as bordered surface cards with numbered `N# {section menu name}` headers (no duplicate free-form title clutter).
- Matched repeater/insurance accordion titles to the same `N# {menu}` pattern.
- Added shared CSS (`.tab14-extended-entry*`) used by every non-legacy portability section panel.

**Outcome:** Consecutive treatments/entries no longer blend together; Allergies/Medications/Insurance already used accordion cards and were unchanged.

**Primary paths:** `Tab14ExtendedSectionPanel.tsx`, `Tab14.css`
**Branch:** `feature/portal-split`

---

### Entry 118 — `MT-AG-114`

**Type:** Feature

**Key:** `MT-AG-114`

**Summary:** Added Tab14 **Patient Instructions** section (sidebar + PDF parse) for Athena care-instruction rows with encounter IDs.

**What was done:**

- Added `patientInstructions` to portability nav (between Plan of Treatment and Reason for Referral) and en/es/zh labels.
- Parsed Athena rows into Title / Detail (Encounter ID) / Date / Recorded by / Time / Notes.
- Stopped Plan of Treatment before Patient Instructions; ignored column-header false stops.

**Outcome:** Diana PDF instructions (dysuria care, birth control, bacterial vaginosis, etc.) appear under Patient Instructions after re-upload.

**Primary paths:** `tab14PortabilitySections.ts`, i18n locales, tests
**Branch:** `feature/portal-split`

---

### Entry 119 — `MT-AG-115`

**Type:** Bug

**Key:** `MT-AG-115`

**Summary:** Athena Data Portability **Results** (multi-page labs + imaging) now populate the Tab14 Results lab panels instead of leaving the tab empty.

**What was done:**

- Added `athenaResultsParse.ts` to parse Athena Results observation rows (SureSwab, Urinalysis, UA/M w/rflx) and Results Imaging (US pelvis) into `Tab14LabPanel[]`.
- Applied glued-header/date normalization so `ResultsCreatedObservation` matches the real section (not the TOC).
- Wired into `parseAthenaPortabilityDocument` (`labPanels` was previously always `[]`).
- Unit + Diana integration coverage for SureSwab / UA / UA-M / imaging.

**Outcome:** After hard-refresh + re-upload of Diana PDF, Results shows grouped lab panels (e.g. SureSwab components, urinalysis dipstick, UA/M panel) and pelvic US imaging — not only “+ Add lab result.”

**Primary paths:** `athenaResultsParse.ts`, `tab14DocumentParse.ts`, tests
**Branch:** `feature/portal-split`

---

### Entry 120 — `MT-AG-116`

**Type:** Bug

**Key:** `MT-AG-116`

**Summary:** Results accordion rows looked empty (`1# Results` … `9# Results`) even though the PDF parse already filled SureSwab / Urinalysis / UA/M / imaging panels with dozens of components.

**What was done:**

- Fixed `repeaterRowTitle` so it uses the row detail (test name / allergy / med / etc.) instead of always showing the section label.
- Results collapsed titles now show **panel name · date · N components** (e.g. `1# SureSwab · 2025-08-23 · 6 components`).
- Tightened Athena Results parse: merge fragmented `UA/M` rows into `UA/M w/rflx`, unglue `normalcompleted` / `mg/dL0.2`, mark imaging as Final when completed.

**Outcome:** After hard-refresh + re-upload, Results list shows real panel names at a glance; expand a row to see analytes. Data was already being retrieved — the UI hid it behind generic titles.

**Primary paths:** `Tab14.tsx`, `athenaResultsParse.ts`, Diana Results tests
**Branch:** `feature/portal-split`

---

### Entry 121 — `MT-AG-117`

**Type:** Bug

**Key:** `MT-AG-117`

**Summary:** Athena **Problems** “No Known Problems” now fills the Problems tab (checkbox + Condition Name / Notes) instead of leaving an empty chronic-condition card.

**What was done:**

- Added `detectNoKnownProblems` (handles wrapped `No Known` / `Problems` Athena text; ignores PHQ / family-history wording).
- Parse flag `noKnownProblems` + sentinel chronic row with Condition Name / Notes = “No Known Problems”.
- Apply path checks “no known chronic conditions” and keeps those fields visible under the checkbox; Save persists the statement.

**Outcome:** After hard-refresh + re-upload of Diana PDF, Problems shows the none checkbox checked and **No Known Problems** in Condition Name and Additional Notes.

**Primary paths:** `detectNoKnownProblems.ts`, `tab14DocumentParse.ts`, `applyTab14ParseBundle.ts`, `Tab14.tsx`, tests
**Branch:** `feature/portal-split`

---

### Entry 122 — `MT-AG-118`

**Type:** Bug

**Key:** `MT-AG-118`

**Summary:** Procedures was showing Plan-of-Treatment Imaging / pharmacy junk; Athena **Surgical History** is now its own left-nav section with the real pelvic ultrasound row.

**What was done:**

- Stopped Procedures from matching PoT nested `Procedures None recorded` / Imaging orders.
- Procedures top-level (empty in Diana PDF) → **None recorded** (points to Surgical History).
- Added **Surgical History** sidebar section + parser (`Ultrasound Pelvic…`, provider, place, time).
- Split glued `Procedures Surgical History` / `Imaging\nResults` headers.

**Outcome:** After hard-refresh + re-upload, Procedures is empty/none; Surgical History shows the Athena surgical row — not Akumin / Med Time Pharmacy noise.

**Primary paths:** `tab14PortabilitySections.ts`, i18n locales, tests
**Branch:** `feature/portal-split`

---

### Entry 123 — `MT-AG-119`

**Type:** Feature

**Key:** `MT-AG-119`

**Summary:** Added Athena **Imaging Results** and **Procedure Notes** as left-nav sections (after Surgical History), matching the PDF Procedures subsections.

**What was done:**

- New sidebar panels: Imaging Results + Procedure Notes (en/es/zh).
- Parsers for pelvic US rows under Imaging Results and “None recorded” under Procedure Notes.
- Normalize glued `Procedure\nNotes` / `completedNot Available` headers.

**Outcome:** After hard-refresh + re-upload, Imaging Results shows both US pelvis studies; Procedure Notes shows None recorded.

**Primary paths:** `tab14PortabilitySections.ts`, i18n locales, tests
**Branch:** `feature/portal-split`

---

### Entry 124 — `MT-AG-120`

**Type:** Feature

**Key:** `MT-AG-120`

**Summary:** Allergies / Medications / Imaging Results can now intake the Athena PDF columns that were previously dropped (IDs, codes, org address, sig metadata, etc.).

**What was done:**

- Allergies UI + parse: Allergen ID, Category, Criticality, Code / Code system, Recorded by / Organization / Time; full name **POLLEN EXTRACTS**.
- Medications UI + parse: Directions/Sig, Status, Authored on, Fill quantity, Recorded by / Organization / Time.
- Imaging Results Place now includes full org address (Akumin Osborne street/city/ZIP).
- Extra fields round-trip via encoded `reaction_notes` / medication notes on save/load.

**Outcome:** After hard-refresh + re-upload, Allergies shows ID `1469239`, RxNorm `235616`, Geraldine Escobar, etc.; Imaging Place includes street address.

**Primary paths:** `tab14IntakeTypes.ts`, `tab14DocumentParse.ts`, `Tab14.tsx`, `api.ts`, tests
**Branch:** `feature/portal-split`

---

### Entry 125 — `MT-AG-121`

**Type:** Feature

**Key:** `MT-AG-121`

**Summary:** Swept every remaining Tab14 submenu against the Diana Smith Athena PDF and added the fields + parsers needed to capture the columns that were still being dropped (Family History, Medical History, Immunizations, clinical Notes, Past Encounters).

**What was done:**

- Extended `Tab14ClinicalEntry` with the Athena column set (status, category, relationship, phone/email/address, role/member ID/NPI/specialty, codes, ages, response, note type, order/submit dates, score, …); the extended-section panel renders section-specific extras and any captured value.
- New parsers: **Family History** (relationship vs condition), **Medical History** checklist (one entry per condition with Y/N), **Immunizations** (vaccine + status + org + time), and **clinical Notes** (note body reassembled around the wrapped provider/organization/address column).
- Fixed section slicing so the `Notes` column header no longer hijacks the Social History Q&A table, and Advance Directives no longer swallows the Payers table; Social History now keeps its Q&A rows plus the Gender Identity / Sexual orientation observations.
- Promoted structured values out of `detail` into fields for Related Person / Care Team, Patient Instructions (encounter ID), Plan of Treatment (category / order + submit dates / instructions), Surgical History + Imaging Results (status), Mental Status (score).
- **Past Encounters:** new `parseAthenaPastEncounters` returns one visit per encounter (ID, type, performer, location, start/closed timestamps, primary diagnosis with SNOMED / ICD-10 / IMO, and the reconstructed diagnosis note); Tab14 gained the matching form fields and `applyTab14ParseBundle` merges the whole list instead of a single visit.
- Problems rows gained an optional **Status** field; Gender Identity / Sexual orientation now reach the demographics fields.

**Outcome:** After hard-refresh + re-upload, Diana's chart shows Mother/Maternal Grandfather hyperlipidemia, 45 medical-history answers (Anxiety = Y), Gardasil as active, the three GYN clinical notes (no social Q&A), and all three encounters — 19280018, 19896429, 20136826 — as separate hospital visits.

**Primary paths:** `tab14PortabilitySections.ts`, `tab14DocumentParse.ts`, `tab14IntakeTypes.ts`, `applyTab14ParseBundle.ts`, `Tab14ExtendedSectionPanel.tsx`, `Tab14.tsx`, tests
**Branch:** `feature/portal-split`

---

**Next register entry:** **126** / **`MT-AG-122`**

*Last updated: entry 125 (Tab14 Athena submenu field completeness).*

---

### Entry 126 — `MT-AG-122`

**Type:** Bugfix

**Key:** `MT-AG-122`

**Summary:** Athena Medications parse now retrieves the full Diana Smith drug list with clean names (no wrapped-line junk).

**What was done:**

- Fixed medication chunking so hyphen wraps (`neomycin-polymyxin-` + `dexameth`) and salt wraps (`nitrofurantoin` + `monohydrate/macrocrystals`) stay one row.
- Stopped treating sig continuations (`gram tablet…`) as new medications.
- Recovered doses for gram / % strengths without grabbing years from dates.
- Diana now yields all 16 meds including Tri-Lo-Marzia, methenamine hippurate, triamcinolone, and both fluoxetine strengths.

**Outcome:** After hard-refresh + re-upload, Medications lists every document drug with a clean accordion title (no `gram 18:10:56…` / `dexameth` fragments).

**Primary paths:** `tab14DocumentParse.ts`, `dianaSmithPortability.integration.test.ts`
**Branch:** `feature/portal-split`

---

**Next register entry:** **127** / **`MT-AG-123`**

*Last updated: entry 126 (Athena medications full-list parse).*

---

### Entry 127 — `MT-AG-123`

**Type:** Feature

**Key:** `MT-AG-123`

**Summary:** Vitals tab can switch between every dated reading from the Athena PDF via a history dropdown (view for patients, edit for staff).

**What was done:**

- Parse all Athena vitals rows into `vitalsHistory` (newest first), keeping latest in chart `patientFields`.
- Vitals UI: “Vitals recorded on” dropdown + metadata (org / time / BMI percentile).
- Selecting a date loads that reading into the form; staff edits update the selected history row (fieldset still locked for patients).

**Outcome:** After hard-refresh + re-upload, Vitals dropdown lists 01/12/2026, 11/26/2025, and 08/21/2025 readings.

**Primary paths:** `tab14DocumentParse.ts`, `tab14IntakeTypes.ts`, `Tab14.tsx`, i18n
**Branch:** `feature/portal-split`

---

**Next register entry:** **128** / **`MT-AG-124`**

*Last updated: entry 127 (vitals history dropdown).*

---

### Entry 128 — `MT-AG-124`

**Type:** Feature / Bugfix

**Key:** `MT-AG-124`

**Summary:** Mental Status now intakes all three dated PHQ batteries from Athena, and every extended submenu entry is a collapsible accordion (with Expand/Collapse all).

**What was done:**

- Fixed section-header normalization that truncated Mental Status at mid-sentence “problems”.
- Rewrote Mental Status parse → stress Q + 3× PHQ sets (~34 rows across 08/21/2025, 11/26/2025, 01/12/2026).
- `Tab14ExtendedSectionPanel`: per-entry accordion + Expand/Collapse all; Mental Status also gets an Assessment date filter.

**Outcome:** After hard-refresh + re-upload, Mental Status shows all dated assessments; extended tabs no longer force scrolling through every open card.

**Primary paths:** `tab14PortabilitySections.ts`, `Tab14ExtendedSectionPanel.tsx`, tests
**Branch:** `feature/portal-split`

---

**Next register entry:** **129** / **`MT-AG-125`**

*Last updated: entry 128 (Mental Status completeness + extended accordions).*

---

### Entry 129 — `MT-AG-125`

**Type:** Feature

**Key:** `MT-AG-125`

**Summary:** Added Obstetrics History to Tab14 between Medical History and Immunizations, matching the Athena Data Portability PDF (GPAL + Gynecological History).

**What was done:**

- New sidebar section `obstetricsHistory` (nav id 29) between Medical History and Immunizations.
- Parser for `GPAL: G … P …` and Athena’s “No gynecological history recorded” note (avoids false match on the substring “gynecological history”).
- i18n labels (en/es/zh); Diana PDF integration coverage.

**Outcome:** After hard-refresh + re-upload, Obstetrics History appears in the left nav with GPAL `G 0 P 0 0 0 0` for Diana Smith.

**Primary paths:** `tab14PortabilitySections.ts`, `Tab14ExtendedSectionPanel.tsx`, i18n locales, tests
**Branch:** `feature/portal-split`

---

**Next register entry:** **130** / **`MT-AG-126`**

*Last updated: entry 129 (Obstetrics History section).*

---

### Entry 130 — `MT-AG-126`

**Type:** Feature / Bugfix

**Key:** `MT-AG-126`

**Summary:** Hardened Athena Data Portability intake so the same structure works across patients (Diana + Harold), instead of Diana-only table layouts.

**What was done:**

- Added Harold Jennings fixture + integration test alongside Diana.
- Structure normalize for glued TOC/names (`JenningsDemographics` → Jennings).
- Alternate Athena table dialects: category allergies, Sig/Dose/Refill meds, ICD-10 problem list, named-group payers, named lab panels, vitals in `kg` + bare BMI.
- Reject junk insurance rows (notes/`text/html` dumps) during merge.
- Kept Diana regression green (142 intake tests passing).

**Outcome:** Uploading another Athena Data Portability PDF no longer requires a one-off parser; new patients with the same export family map through shared structure rules. Still not ML “training” — adding a *different* EHR format still needs a new detector/parser module.

**Primary paths:** `tab14DocumentParse.ts`, `athenaResultsParse.ts`, `generalIntakeExtract.ts`, `harold_jennings_medical_record.pdf`, tests
**Branch:** `feature/portal-split`

---

**Next register entry:** **131** / **`MT-AG-127`**

*Last updated: entry 130 (Athena multi-patient portability hardening).*

---

### Entry 131 — `MT-AG-127`

**Type:** Bugfix

**Key:** `MT-AG-127`

**Summary:** Fixed Harold Plan of Treatment gap — intake now pulls the full lab order table plus all MedicationOrders / VaccineOrders (not just the first med and first vaccine).

**What was done:**

- Added Harold flat PoT order-table parser (`Order / Submit Date / Provider / … / Not Available`).
- MedicationOrders / VaccineOrders now extract every dated product (anchor on TAKE/inject), not a single `.match()`.
- Unit + Harold integration assertions for ≥15 PoT rows (labs + 4 meds + 2 vaccines); Diana PoT still green.

**Outcome:** After hard-refresh + re-upload Harold, Plan of Treatment should list A1c/CMP/lipid/etc. orders and all med/vaccine orders from the PDF page — not only metformin + Influenza.

**Primary paths:** `tab14PortabilitySections.ts`, Harold/Diana tests
**Branch:** `feature/portal-split`

---

**Next register entry:** **132** / **`MT-AG-128`**

*Last updated: entry 131 (Harold Plan of Treatment completeness).*

---

### Entry 132 — `MT-AG-128`

**Type:** Bugfix

**Key:** `MT-AG-128`

**Summary:** Care Team intake for Harold now pulls all three NPI-table members (Susan Cole, David Nkemelu, Rocky Mountain Eye Associates) with role/specialty/address/phone — not a single partial PCP card.

**What was done:**

- Added Harold Care Team dialect (`Name Role NPI Specialty Address Phone`, Title Case / org rows, no Member ID).
- Anchored Care Team rebuild on the real NPI table header (skip TOC / early Members-only scrape).
- Populated dedicated `role` / `npi` / `specialty` / `phone` / `address` fields for the extended panel.
- Harold + Diana Care Team tests green.

**Outcome:** After hard-refresh + re-upload Harold, Care Team should list 3 providers with full identifiers.

**Primary paths:** `tab14PortabilitySections.ts`, tests
**Branch:** `feature/portal-split`

---

**Next register entry:** **133** / **`MT-AG-129`**

*Last updated: entry 132 (Harold Care Team completeness).*

---

### Entry 133 — `MT-AG-129`

**Type:** Feature

**Key:** `MT-AG-129`

**Summary:** Started the Athena “training” loop — fixture corpus + full portability section completeness score (so core 100% no longer hides Care Team / PoT / Past Encounters gaps).

**What was done:**

- `athenaPortabilityCompleteness.ts` — scores Demographics, clinical tabs, and all extended sidebar sections (`filled` / `thin` / `missing` / `none_recorded`).
- `athenaFixtureCorpus.ts` — locked Diana + Harold baselines (must-fill sections + known gaps).
- Corpus integration tests fail if a fixture regresses below the bar.
- Tab14 upload notice now appends Athena section % and gap labels after PDF parse.

**Outcome:** New bad Athena uploads become corpus entries + raised expectations, not silent “100% complete” with empty sidebars. LLM / Document AI still optional next.

**Primary paths:** `athenaPortabilityCompleteness.ts`, `athenaFixtureCorpus.ts`, `Tab14.tsx`, tests
**Branch:** `feature/portal-split`

---

### Entry 134 — `MT-AG-130`

**Type:** Enhancement

**Key:** `MT-AG-130`

**Summary:** Align Athena completeness with the full left-menu sidebar — one scored row per `TAB14_PORTABILITY_NAV` item (Demographics → Notes), not a short data-bag field list.

**What was done:**

- Clarified that `AthenaPortabilityCompletenessInput` is only the parse/form data bag; scored labels come from `TAB14_PORTABILITY_NAV`.
- Scorer now walks the sidebar in menu order and exports `ATHENA_SIDEBAR_SECTION_KEYS`.
- Gap summary uses the same labels users see (Care Team, Mental Status, Obstetrics History, Past Encounters, Notes, …).
- Test asserts every left-menu key appears in `sections`.

**Outcome:** Completeness % and gap list match the left nav users see after PDF upload.

**Primary paths:** `athenaPortabilityCompleteness.ts`, `athenaFixtureCorpus.integration.test.ts`
**Branch:** `feature/portal-split`

---

### Entry 135 — `MT-AG-131`

**Type:** Feature

**Key:** `MT-AG-131`

**Summary:** Split Athena **Care Team Members** (early contact card) from end-of-document **Care Team** (NPI table) into two left-menu sections with separate intake fields.

**What was done:**

- Renamed early nav item to Care Team Members (`careTeamMembers`); added Care Team (`careTeam`) after Notes.
- Parsers keep Members card and Care Team NPI table in separate `extendedSections` arrays (no merge).
- Tab14 panel fields: Members → Role / Phone / Address; Care Team → Role / Member ID / NPI / Specialty / Phone / Address.
- i18n (en/es/zh), completeness, corpus, Diana/Harold tests updated.

**Outcome:** Left menu matches Athena PDF structure; Harold shows 3 Care Team NPI rows plus Susan Cole under Care Team Members.

**Primary paths:** `tab14PortabilitySections.ts`, `Tab14ExtendedSectionPanel.tsx`, i18n, fixtures/tests
**Branch:** `feature/portal-split`

---

### Entry 136 — `MT-AG-132`

**Type:** Fix

**Key:** `MT-AG-132`

**Summary:** Force left-menu labels via `tab14NavLabel()` so Care Team Members / Care Team show correctly even when the browser had a stale i18n/HMR bundle.

**What was done:**

- Tab14 sidebar + panel titles use `tab14NavLabel` (Care Team Members before Assessment; Care Team last after Notes).
- Completeness scorer reuses the same labels.

**Outcome:** Hard refresh should show both menu items in the correct places.

**Primary paths:** `Tab14.tsx`, `tab14PortabilitySections.ts`, `athenaPortabilityCompleteness.ts`
**Branch:** `feature/portal-split`

---

### Entry 137 — `MT-AG-133`

**Type:** Fix

**Key:** `MT-AG-133`

**Summary:** Force browser to load the Care Team Members / Care Team sidebar split (stale HMR/cache was still showing old single “Care Team” item).

**What was done:**

- New `tab14SidebarNav.ts` + `buildTab14SidebarNav()` used by Tab14 (guarantees Members before Assessment, Care Team last).
- `index.html` cache-bust query on `main.tsx`; Vite `Cache-Control: no-store`.
- Helper script: `meditap-app/scripts/restart-frontend-care-team.sh`.

**Outcome:** After frontend restart + hard refresh, sidebar must show both labels in the correct places.

**Primary paths:** `tab14SidebarNav.ts`, `Tab14.tsx`, `index.html`, `vite.config.ts`
**Branch:** `feature/portal-split`

---

**Next register entry:** **138** / **`MT-AG-134`**

*Last updated: entry 137 (force Care Team sidebar reload).*

---

### Entry 138 — `MT-AG-134`

**Type:** Feature / Process

**Key:** `MT-AG-134`

**Summary:** Operationalized the Athena training loop — raised Diana/Harold fixture bars, documented the corpus workflow, and surfaced structured missing/thin section gaps in Tab14 after upload.

**What was done:**

- `docs/ATHENA_INTAKE_TRAINING.md` — how to add failing PDFs to the corpus (no Document AI yet).
- Raised corpus locks (Diana ≥95% / more must-fill; Harold ≥90% with `pastEncounters` known gap).
- Tab14 shows per-gap badges (missing/thin + detail) under the completeness notice.
- Linked training doc from `AGENTS.md`.

**Outcome:** Training process is explicit: bad Athena upload → fixture + raised bar. Next parser work should close Harold Past Encounters and remove it from `knownGaps`.

**Primary paths:** `athenaFixtureCorpus.ts`, `Tab14.tsx`, `Tab14.css`, `docs/ATHENA_INTAKE_TRAINING.md`
**Branch:** `feature/portal-split`

---

### Entry 139 — `MT-AG-135`

**Type:** Feature

**Key:** `MT-AG-135`

**Summary:** First Meditech CCD / MyHealth portal PDF intake path — separate detector from Athena, reuse shared TOC parsers where layouts match, Meditech dialects for allergies/meds/payers/results.

**What was done:**

- Fixture: `meditap-app/test-fixtures/dummyPDFs/meditech_sample_ehr_record.pdf` (Jordan A Rivera).
- `meditechCcdParse.ts` — `isMeditechCcdDocument`, preprocess (preferred language / weight commas / Data Portability title bridge), allergy Criticality+Documentation Date, Sig+Indication meds, Insurance Date Sequence payers.
- Wired into `parseTab14IntakeDocument` (Athena detector stays strict — Meditech is not Athena).
- Extended Results parser for Meditech `Created Date Observation Date` header + dense CMP/lipid rows + Imaging Results.
- Related Person TOC false-empty fix (prefer block with `Name:`).
- Integration tests: `meditechCcd.integration.test.ts` (Athena corpus stays green).

**Outcome:** Meditech sample uploads fill demographics, allergies, meds, NKP, payers, vitals, labs, PoT, care team, related person. Still open: full Meditech corpus/completeness scorer (Athena-only today), PoT/care-team dialect polish, Harold Past Encounters.

**Primary paths:** `meditechCcdParse.ts`, `tab14DocumentParse.ts`, `athenaResultsParse.ts`, `meditechCcd.integration.test.ts`
**Branch:** `feature/portal-split`

---

### Entry 140 — `MT-AG-136`

**Type:** Feature

**Key:** `MT-AG-136`

**Summary:** Full Meditech CCD section intake — every TOC section for Jordan sample + fixture corpus lock ≥95% so future Meditech portal exports train the same way as Athena.

**What was done:**

- Expanded `meditechCcdParse.ts` dialects: PoT (Lab/Imaging/MedicationOrders), Care Team NPI+Specialty, Family History, Immunizations (Date before Status), Past Encounters (facility + diagnosis), Notes, Imaging Results, demographics Contact phone (not Related Person), QA org-strip, lab imaging filter.
- Overlays merge into Athena-shared extended sections; explicit none for Referral/Goals/Health Concerns/Equipment/Patient Instructions (not in Meditech TOC).
- Completeness: treat TOC `·` bleed and short dated rows correctly; Care Team Specialty optional in Diana-style NPI regex.
- Corpus: `meditechFixtureCorpus.ts` + integration lock (Jordan ≥95%, must-fill core clinical menu).
- Full-section integration assertions (PoT ≥4, care NPI, family Father/Mother, 2 immunizations, 2 encounters with reason/facility).

**Outcome:** Jordan Meditech sample intakes the full CCD menu with ≥95% left-menu completeness and zero unexpected gaps. New Meditech PDFs should be added to `MEDITECH_CCD_FIXTURE_CORPUS` the same way as Athena.

**Primary paths:** `meditechCcdParse.ts`, `meditechFixtureCorpus.ts`, `tab14DocumentParse.ts`, `athenaPortabilityCompleteness.ts`, `tab14PortabilitySections.ts`
**Branch:** `feature/portal-split`

---

### Entry 141 — `MT-AG-137`

**Type:** UX / Feature

**Key:** `MT-AG-137`

**Summary:** Related Person / Care Team contact intake uses dedicated Relation, Phone, Email, Address (and Role/NPI) fields instead of one Detail blob.

**What was done:**

- Parse writes contact columns into structured `Tab14ClinicalEntry` fields; Detail stays empty for staff notes.
- `promoteContactFields` strips promoted `Label:` lines from Detail.
- Tab14 panel: contact fields render right under Title; Detail relabeled “Additional notes” for Related Person / Care Team Members / Care Team.
- Accordion titles show relation/role + phone instead of the old detail dump.
- Contactish filter updated so structured-field cards are kept and TOC junk is dropped.

**Outcome:** Taylor Rivera shows Relation / Phone / Email / Address as separate editable inputs after PDF upload (hard refresh + re-upload).

**Primary paths:** `tab14PortabilitySections.ts`, `Tab14ExtendedSectionPanel.tsx`, `athenaPortabilityCompleteness.ts`
**Branch:** `feature/portal-split`

---

### Entry 142 — `MT-AG-138`

**Type:** Feature / UX

**Key:** `MT-AG-138`

**Summary:** Tab14 upload panel to select EHR document source (Athena, MEDITECH, Epic, NextGen) before parsing, so specialized intake does not compete across formats.

**What was done:**

- `ehrDocumentTypes.ts` — vendor catalog + `preferredVendor` gate for parsers.
- `parseTab14IntakeDocument(raw, { preferredVendor })` — runs only the selected EHR dialect (auto = previous behavior).
- `nextgenHealthcareParse.ts` — conservative detector stub (no dialect yet).
- Tab14 upload UI: four vendor cards + Auto-detect; file input disabled until a type is chosen.
- i18n en/es/zh for panel copy and status badges.

**Outcome:** Users declare Athena / MEDITECH / Epic / NextGen (or Auto) before upload. Athena + MEDITECH ready; Epic partial; NextGen planned (general extract until fixtures).

**Primary paths:** `ehrDocumentTypes.ts`, `tab14DocumentParse.ts`, `Tab14.tsx`, `Tab14.css`, i18n locales
**Branch:** `feature/portal-split`

---

### Entry 143 — `MT-AG-139`

**Type:** Bugfix / UX

**Key:** `MT-AG-139`

**Summary:** Meditech Plan of Treatment — stop org “Lab” from bleeding into Order title; align intake fields to Reminders / Order / Date / Provider Name / Organization Details.

**What was done:**

- `parseMeditechPlanOfTreatment` — protect `Diagnostics Lab` / `Hospital Lab` so they are not order anchors; Order = title only; Provider → `recordedBy`; Organization → `place`; clear Detail/Notes duplication.
- `Tab14ExtendedSectionPanel` — dedicated PoT layout (Reminders, Order, Date, Provider Name, Organization Details + Instructions).
- Unit coverage for Priya-style rows (`free T4` stays clean when org is Capitol Diagnostics Lab); Jordan PDF still green.
- Copied `meditech_priya_kapoor_medical_record.pdf` into `test-fixtures/dummyPDFs/` + integration test locking Order title.

**Outcome:** Meditech PoT titles like `free T4` no longer include address fragments; UI matches CCD table columns.

**Primary paths:** `meditechCcdParse.ts`, `Tab14ExtendedSectionPanel.tsx`, `meditechCcd.integration.test.ts`
**Branch:** `feature/portal-split`

---


### Entry 144 — `MT-AG-140`

**Type:** Feature / Intake

**Key:** `MT-AG-140`

**Summary:** Establish Epic upload dialect from Jane Doe Mayo My Health Summary (540-page `- as of` format) as the canonical Epic document selection path.

**What was done:**

- `epicMayoMyHealthSummaryParse.ts` — Mayo snapshot parsers (Allergies/Meds/Active Problems/Immunizations/Social/Vitals/PoT/Procedures/Results/Encounters/Care Team) + preprocess that caps huge note dumps.
- `epicHealthSummaryParse.ts` — detects Mayo vs Centralus; Joanna Smith path preserved.
- Preferred Epic upload skips general-extract merge (no table-header names / department phones).
- Fixture corpus + snapshot text lock (≥90%; known gaps Demographics + Payers). Full 28MB PDF gitignored.
- Epic vendor card status → ready; training docs updated.

**Outcome:** Selecting **Epic** on Tab14 targets the Mayo My Health Summary format. Cover demographics remain image-only on this fixture; clinical sections parse without page-by-page review.

**Primary paths:** `epicMayoMyHealthSummaryParse.ts`, `epicHealthSummaryParse.ts`, `epicFixtureCorpus.ts`, `tab14DocumentParse.ts`
**Branch:** `feature/portal-split`

---

### Entry 145 — `MT-AG-141`

**Type:** Bug fix / Intake

**Key:** `MT-AG-141`

**Summary:** Epic Mayo cover demographics — OCR image-only page 1 even when later pages have text; parse Patient Name / DOB / address / phone / email / race / marital.

**What was done:**

- `augmentPdfTextWithOcr` — OCR sparse *leading* pages (not only when the whole PDF is sparse). Epic Jane cover is image-only while pages 2+ are text-rich.
- `parseEpicMayoCoverDemographics` — Patient Demographics banner (Mrs. Jane A. Smith-Doe, born Mar. 15, 1976, Fort Worth address, etc.).
- Snapshot + corpus now expect demographics filled; Payers remains the known gap.

**Outcome:** Selecting Epic and uploading Jane Doe fills Demographics from the cover (via first-page OCR + parser). Hard-refresh before re-upload.

**Primary paths:** `documentTextExtraction.ts`, `epicMayoMyHealthSummaryParse.ts`, `epicHealthSummaryParse.ts`
**Branch:** `feature/portal-split`

---


### Entry 146 — `MT-AG-142`

**Type:** Feature / UX

**Key:** `MT-AG-142`

**Summary:** Fifth EHR upload option **Generic / Other** for non-Athena/MEDITECH/Epic/NextGen PDFs; scaffold per-selector left-menu profiles for upcoming subtitle tracking.

**What was done:**

- `ehrDocumentTypes.ts` — `generic` vendor (ready); skips specialized dialects (general extract only).
- `ehrSidebarNav.ts` — `EHR_SIDEBAR_SECTION_KEYS` map (`'all'` until per-vendor TOC lists are filled); Tab14 sidebar rebuilds from selected source.
- i18n + 5-column EHR card grid; upload copy updated.

**Outcome:** Users can pick Generic/Other. Left menu is wired to follow the PDF selector; fill `EHR_SIDEBAR_SECTION_KEYS` once section titles per EHR are tracked.

**Primary paths:** `ehrDocumentTypes.ts`, `ehrSidebarNav.ts`, `Tab14.tsx`, `tab14DocumentParse.ts`
**Branch:** `feature/portal-split`

---


### Entry 147 — `MT-AG-143`

**Type:** Feature / UX

**Key:** `MT-AG-143`

**Summary:** Lock MEDITECH left-menu order to the Jordan CCD Table of Contents (26 sections).

**What was done:**

- `EHR_SIDEBAR_SECTION_KEYS.meditech` — Demographics → Care Team (omit Patient Instructions, Surgical History, Imaging Results, Procedure Notes, Obstetrics History).
- Tests lock the exact TOC key order.

**Outcome:** Selecting **MEDITECH** on Tab14 shows only the CCD TOC sidebar sections in document order.

**Primary paths:** `ehrSidebarNav.ts`, `ehrDocumentTypes.test.ts`
**Branch:** `feature/portal-split`

---


### Entry 148 — `MT-AG-144`

**Type:** Feature / UX

**Key:** `MT-AG-144`

**Summary:** Move Tab14 EHR format selector to the top and show an active intake-panel badge on the left sidebar.

**What was done:**

- Document-source (EHR) card grid moved above the master–detail layout (was below Upload).
- Sidebar top badge: “Athena Intake Panel”, “MEDITECH Intake Panel”, etc. (updates with selection).
- Removed temporary Care Team sidebar build marker.
- i18n en/es/zh + `ehrIntakePanelTitle` helper + unit tests.

**Outcome:** Format choice is visible before sections; left nav clearly shows which intake panel is active.

**Primary paths:** `Tab14.tsx`, `Tab14.css`, `ehrDocumentTypes.ts`, locales
**Branch:** `feature/portal-split`

---


### Entry 149 — `MT-AG-145`

**Type:** Feature / UX

**Key:** `MT-AG-145`

**Summary:** Raise Active Format into the EHR strip and place the PDF upload panel beside it.

**What was done:**

- Top toolbar: EHR source cards (left) + Upload PDF panel (right).
- Active Format badge moved from left sidebar into the Document source header.
- Compact uploaded-file list lives in the PDF panel; bottom upload strip removed.

**Outcome:** Format choice, active panel label, and PDF upload sit together above the chart sections.

**Primary paths:** `Tab14.tsx`, `Tab14.css`, locales
**Branch:** `feature/portal-split`

---


### Entry 150 — `MT-AG-146`

**Type:** Docs

**Key:** `MT-AG-146`

**Summary:** MediTap technical Q&A brief (MD + branded PDF) for leadership talking points.

**What was done:**

- `docs/meditap-technical-qa-brief-2026-08-27.md` — concise answers across product, intake/OCR, accuracy, FHIR/EHR, security, moat.
- `docs/generate_meditap_technical_qa_pdf.py` — Lomont/Cargo report layout with MediTap teal brand.
- Output PDF: `docs/meditap-technical-qa-brief-2026-08-27.pdf`.

**Outcome:** Shareable internal brief; clearly separates safe claims vs do-not-claim items.

**Primary paths:** `docs/meditap-technical-qa-brief-2026-08-27.md`, `docs/generate_meditap_technical_qa_pdf.py`
**Branch:** `feature/portal-split`

---


### Entry 151 — `MT-AG-147`

**Type:** Docs

**Key:** `MT-AG-147`

**Summary:** Rebalance technical Q&A brief to lead with working user + admin portals (not only PDF fixtures).

**What was done:**

- Emphasized appointments, labs, insurance, conditions, incidents, meds/allergies, dashboard.
- Documented admin portal as working (patients, charts, hospitals, documents, activity).
- Framed PDF fixtures as parser regression loop feeding the chart.
- Regenerated PDF; copied MD + PDF to Desktop.

**Outcome:** Brief matches the full product story for leadership talking points.

**Primary paths:** `docs/meditap-technical-qa-brief-2026-08-27.md`, `docs/generate_meditap_technical_qa_pdf.py`
**Branch:** `feature/portal-split`

---


### Entry 152 — `MT-AG-148`

**Type:** Feature / Intake

**Key:** `MT-AG-148`

**Summary:** Lock Epic left menu to Jane Doe My Health Summary TOC (color sections + multi-intake / Results playbook).

**What was done:**

- `epicMyHealthSummaryToc.ts` — canonical TOC with colors, aliases, session split, Results - as of slicer + playbook.
- `ehrSidebarNav.ts` — Epic sidebar keys + Lucy/Mayo display labels.
- Tab14 uses `ehrSidebarNavLabel` for Epic titles.
- `parseEpicMayoResults` walks every Results - as of session (not one blob).
- Tests lock sidebar order + Results session split.

**Outcome:** Selecting **Epic** shows Patient Demographics → … → Patient Contacts in document order; Results extraction is session-aware for ~540pp Continuity PDFs.

**Primary paths:** `epicMyHealthSummaryToc.ts`, `ehrSidebarNav.ts`, `epicMayoMyHealthSummaryParse.ts`, `Tab14.tsx`
**Branch:** `feature/portal-split`

---


### Entry 153 — `MT-AG-149`

**Type:** Feature / Intake

**Key:** `MT-AG-149`

**Summary:** Integrate Epic “Encounter Details” multi-hit sessions into PDF intake (visit boundaries + Past Encounters).

**What was done:**

- `sliceEpicEncounterDetailSessions` / local subsection slicer already in TOC; hardened Date/Type/Department/Care Team peek.
- `parseEpicMayoEncounters` prefers Encounter Details blocks → Past Encounters + Care Team.
- `splitEpicMyHealthSummarySessions` prefers Encounter Details when ≥2 hits.
- Tests: `epicEncounterDetailsSessions.test.ts` (5 passing).
- Results playbook updated to start from Encounter Details session split.

**Outcome:** Searching “Encounter Details” in the ~540pp Continuity PDF maps directly to intake session boundaries and Past Encounters rows.

**Primary paths:** `epicMyHealthSummaryToc.ts`, `epicMayoMyHealthSummaryParse.ts`, `epicEncounterDetailsSessions.test.ts`
**Branch:** `feature/portal-split`

---

### Entry 154 — `MT-AG-150`

**Type:** Feature / Intake

**Key:** `MT-AG-150`

**Summary:** Apply Encounter Details–style multi-hit search to every established Epic TOC section title.

**What was done:**

- Generalized indexer in `epicMyHealthSummaryToc.ts`: `findEpicSectionHits`, `indexEpicTocSections`, `countEpicTocSectionHits`, `pickEpicSectionBodies`.
- Bodies slice until the next TOC header; kinds = plain / as-of / encounter-local.
- Non-header aliases excluded (e.g. Active Allergy Reactions, Final result, Care Team field) so table columns don’t truncate sections.
- `sliceEpicMayoAsOfSection` prefers indexer primary body (latest as-of).
- Tests: `epicTocSectionIndex.test.ts` (6 passing).

**Outcome:** Allergies, Medications, Active Problems, Results, etc. use the same multi-hit PDF-search model as Encounter Details — not a one-section special case.

**Primary paths:** `epicMyHealthSummaryToc.ts`, `epicMayoMyHealthSummaryParse.ts`, `epicTocSectionIndex.test.ts`
**Branch:** `feature/portal-split`

---

### Entry 155 — `MT-AG-151`

**Type:** Bugfix / Intake

**Key:** `MT-AG-151`

**Summary:** Fix sparse Encounter Details extraction (~9 vs PDF Find ~31) by using the full Encounters inventory table.

**What was done:**

- Root cause: PDF Find hits yellow “Encounter Details” titles that are often **image/vector** — text layer had **1** literal hit across 540 pages, while `Encounters - as of` lists ~30 visits.
- Removed early-return on sparse Encounter Details sessions.
- Added `parseEpicEncountersAsOfTable` with line-break-tolerant visit types (Hospital Encounter, Comprehensive Visit, Appointment, …).
- `parseEpicMayoEncounters` merges table + detail sessions (prefer larger set).
- Probe: Jane Doe PDF → 29 table / 30 merged visits (was 1 detail session).
- Tests: `epicEncountersAsOfTable.test.ts`.

**Outcome:** MediTap now inventories ~30 encounters from the text layer instead of stopping at image-only section titles.

**Primary paths:** `epicMayoMyHealthSummaryParse.ts`, `epicEncountersAsOfTable.test.ts`, `scripts/probe-encounter-counts.ts`
**Branch:** `feature/portal-split`

---

### Entry 156 — `MT-AG-152`

**Type:** Feature / Intake

**Key:** `MT-AG-152`

**Summary:** Apply the Encounters inventory pattern to every established Epic TOC section (not only Encounter Details).

**What was done:**

- Root cause for sparse sections matched Encounters: yellow TOC titles are often image/vector; text layer inventories are `Section - as of DATE` (+ encounter-local copies).
- Added `collectEpicSectionBodies` / `collectEpicMayoSectionBodies` — gather all as-of + encounter-local bodies per TOC title.
- `preprocessEpicMayoMyHealthSummaryText` no longer mid-document truncates (was dropping later inventories).
- Added `buildEpicMayoSectionCorpus` for labeled full-section corpora.
- Wired Mayo list parsers (Allergies, Medications, Active Problems, Immunizations, Social History, Plan of Treatment, Procedures, Vitals, Results) through the multi-body collector.
- Tests: `epicMayoSectionCorpus.test.ts` (5 passing).

**Outcome:** Every Epic PDF mode section uses the same multi-hit / inventory model as Encounters — full extract, all as-of hits, not image-title-only.

**Primary paths:** `epicMyHealthSummaryToc.ts`, `epicMayoMyHealthSummaryParse.ts`, `epicMayoSectionCorpus.test.ts`
**Branch:** `feature/portal-split`

---

### Entry 157 — `MT-AG-153`

**Type:** Bugfix / Intake

**Key:** `MT-AG-153`

**Summary:** Fix Epic “only 1 allergy / sparse sections” — mid-line TOC headers were invisible to the indexer.

**What was done:**

- Root cause: Continuity text glues section titles mid-line (`…Ph.D. Allergies - as of DATE`). Indexer only matched line-starts, so Allergies/Medications/Problems hits were ~0.
- Secondary bug: template-literal `\s`/`\b` were eaten before RegExp (pattern became `Allergiess*-s*`).
- `epicSectionHeaderRegex` now matches line-start **or** mid-line `Title - as of|documented`.
- Jane Doe probe after fix: Allergies×2, Medications×35, Active Problems×24, Results×15; unique allergies remain Penicillamine + Penicillins (true chart content).
- Allergy parser always does a whole-document pass; meds use PDF de-glue.
- Tests: mid-line header case in `epicTocSectionIndex.test.ts` (19 Epic tests passing).

**Outcome:** Full-document section analysis no longer stops at the first line-start header; re-upload Epic PDF to refresh the form.

**Primary paths:** `epicMyHealthSummaryToc.ts`, `epicMayoMyHealthSummaryParse.ts`
**Branch:** `feature/portal-split`

---

### Entry 158 — `MT-AG-154`

**Type:** Feature / Intake

**Key:** `MT-AG-154`

**Summary:** Epic Patient Demographics multi-hit tracking (PDF Find ≈ 33) + Epic-only demographics columns on Tab14.

**What was done:**

- `epicPatientDemographics.ts` — index header + field-cluster hits; sparse proxy = cover signal + `Encounters - as of` visit count when yellow titles are image-only (Jane Doe estimate **32** ≈ PDF Find **33**).
- Parse Epic columns only: Patient Address, Patient Name (+ Former/Aliases), Communication (mobile/home/email), Language, Race, Ethnicity, Marital Status.
- `inventoryEpicPatientDemographics` wired into Mayo dialect → `epicSectionOccurrenceCounts['Patient Demographics']` on parse result / upload chip.
- Tab14 Epic mode demographics UI shows only those columns (hides blood type, sex/gender stack, emergency contact, etc.).
- Tests: `epicPatientDemographics.test.ts` + cover demographics alias/home-phone expectations.

**Outcome:** Selecting Epic and uploading Jane Doe registers Patient Demographics × ~32 and shows the Lucy-style column set. Variable counts work for later documents (literal hits win when text-rich).

**Primary paths:** `epicPatientDemographics.ts`, `epicMayoMyHealthSummaryParse.ts`, `epicHealthSummaryParse.ts`, `Tab14.tsx`
**Branch:** `feature/portal-split`

---

### Entry 159 — `MT-AG-155`

**Type:** Bug fix / UX

**Key:** `MT-AG-155`

**Summary:** Fix Epic Patient Demographics UI + fill — exact seven Lucy columns; stop Language greed / empty Address-Name-Communication.

**What was done:**

- Tab14 Epic demographics form is only: **Patient Address**, **Patient Name**, **Communication**, **Language**, **Race**, **Ethnicity**, **Marital Status** (removed given/family split, Former/Aliases, Mobile/Home/Email subfields).
- Parser now clips to the cover demographics window and extracts **label-bounded** values (no whole-document Language greed that swallowed Race/Marital/aliases).
- Builds a single `communication` column from mobile/home/email; keeps `patientFullName` as the name column.
- Scrub rejects Language values that still contain grid labels.
- Tests cover clean + OCR-messy glue cases.

**Outcome:** Re-select Epic and re-upload Jane Doe — Demographics should fill the seven columns and match the PDF section layout.

**Primary paths:** `epicPatientDemographics.ts`, `Tab14.tsx`, `epicMayoMyHealthSummaryParse.ts`
**Branch:** `feature/portal-split`

---

**Next register entry:** **160** / **`MT-AG-156`**

*Last updated: entry 159 (Epic demographics columns + fill fix).*


*Last updated: entry 156 (Encounters pattern for every Epic TOC section).*



*Last updated: entry 155 (full Encounters inventory vs image Encounter Details).*

*Last updated: entry 152 (Epic My Health Summary TOC).*


*Last updated: entry 151 (Q&A brief portal rebalance).*


*Last updated: entry 150 (technical Q&A brief).*


*Last updated: entry 149 (intake toolbar PDF panel).*


*Last updated: entry 148 (Tab14 EHR selector top + panel badge).*


*Last updated: entry 147 (MEDITECH CCD TOC sidebar).*


*Last updated: entry 146 (Generic EHR option + sidebar profiles).*


*Last updated: entry 145 (Epic Mayo cover demographics OCR).*
