# MediTap — Agent session change register (Jira-style)

**Purpose:** Single register of work attributed to Cursor agent sessions on this MediTap codebase.  
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

*Last updated: added Set 5 (MT-AG-044–061, register entries 21–38) since checkpoint entry 20.*
