# Admin portal capabilities matrix

**Branch:** `feature/portal-split`  
**Updated:** 2026-07-27  
**Register:** MT-AG-078+

Status legend: `done` | `partial` | `missing` | `deferred`

## Access & shells

| Function | Status | Notes |
|----------|--------|-------|
| Staff / admin login door (`/admin-portal/login`) | done | Rejects patient-only accounts |
| Patient login door (`/tab3`) | done | Cross-link to staff sign-in |
| Admin shell chrome + dark theme | done | `.portal-shell--admin` |
| Route guards (`AdminPortalRoute`) | done | Patients blocked from admin routes |
| Return to admin from patient view (staff) | done | Nav pill on user shell |
| Staff elevation (kiosk on patient session) | done | Kept for shared-device workflow |

## Patient operations (on-behalf)

| Function | Status | Notes |
|----------|--------|-------|
| Patient search / list | done | `/admin-portal/patients` + `GET /api/patients/?q=` |
| Selected patient context | done | `AdminPatientContext` + `X-Meditap-Patient-Id` |
| Patient chart hub | done | `/admin-portal/patients/:id` |
| Intake / demographics on behalf | done | Uses selected patient in `api.ts` |
| Labs on behalf | done | Same patient resolution |
| Appointments on behalf | done | Same |
| Insurance on behalf | done | Same |
| Chronic / incidents on behalf | partial | Via deep links + shared patient resolution |
| Epic connect/sync for selected patient | partial | Panel still primary; header scopes when set |
| Work queue (incomplete intake) | partial | Heuristics on admin home |

## Org / facilities

| Function | Status | Notes |
|----------|--------|-------|
| Create hospital | done | API + admin hospitals UI |
| List / edit hospitals | done | `/admin-portal/hospitals` |
| Hospital staff membership UI | deferred | Django admin / `HospitalUser` only |

## Ops / tracking

| Function | Status | Notes |
|----------|--------|-------|
| Admin activity log | done | `AdminActivityEvent` + `/admin-portal/activity` |
| Immutable HIPAA audit product | deferred | Phase 4 full audit |
| Document vault | deferred | Phase 4 |
| Messaging / support inbox | deferred | Phase 5 |
| View Logs stub in Tab13 | done | Routes to activity page |

## Integrations

| Function | Status | Notes |
|----------|--------|-------|
| Epic sandbox OAuth (session/patient) | partial | Tab13 panel; expand with patient context |
| Org-level Epic admin config UI | deferred | |

## How to keep this current

When shipping an admin feature: flip the row status here and add a register entry in `docs/AGENT_SESSION_CHANGELOG.md`.
