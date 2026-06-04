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

### 77) Riverbend HIE PDF parser (synthetic test packets)

**Type:** Bug  
**Key:** `MT-AG-073`  

**Summary:** Fix Tab14 PDF extraction for Riverbend Health Information Exchange synthetic exports (pediatric, oncology, cardiology, mixed-provider test PDFs).  

**What was done:**

- Added **`riverbendHieParse.ts`**: detects Riverbend / MediTap synthetic records, splits glued single-space column text from pdf.js, maps demographics (`Child Name`, `Name`, `DOB`, `Sex`, `Phone`, `Blood Type`, `Address`, etc.), problems/diagnosis, medications, allergies, and hospital/urgent-care visits.
- Wired into **`tab14DocumentParse.ts`** after MediTap demo check, before generic/Athena parsers.
- Bounded generic **`parsePatientFields`** name capture to stop greedy runs into the rest of the document.
- Integration tests for all four **`test-fixtures/riverbend/`** PDFs (Lucas Martinez, Amina Hassan, Rafael Santos, Tessa Robinson).  

**Outcome:** Uploading the Riverbend test PDFs populates Given/Family name, DOB, sex, and section data correctly instead of dumping the whole document into one field.

**Primary paths:** `meditap-app/src/intake/riverbendHieParse.ts`, `tab14DocumentParse.ts`, `test-fixtures/riverbend/`, `riverbendHiePdf.integration.test.ts`  
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
| 77 | MT-AG-073 | E-INTAKE-UX | Bug | Riverbend HIE synthetic PDF parser | Done |

### Still open from entry 65 (Sprint B/C)

| Backlog item | Status after Set 6 |
|--------------|-------------------|
| **Sprint B** — Django appointments API | **Done** (entry 75) |
| **Sprint C** — Tab14 single API save path | **Done** (entry 76; closes `MT-AG-061`) |

**Next register entry:** **78** / **`MT-AG-074`**

---

*Last updated: entry 77 (Riverbend HIE PDF parser); Set 6 entries 65–77.*
