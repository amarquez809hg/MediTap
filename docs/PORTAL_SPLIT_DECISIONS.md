# Portal split decisions (ADR)

**Status:** Accepted — Phase 0  
**Date:** 2026-07-27  
**Register:** Entry 80 / `MT-AG-076`  
**Branch:** `feature/portal-split` (localhost first; do not deploy half-finished shells to meditap.ai)

## Goal

Separate **User (patient) portal** and **Admin (staff) portal** experiences while keeping **one Django API** and **one SPA** for Phase 1.

| Portal | Who | Job |
|--------|-----|-----|
| User | Patients / caregivers | Intake, chart summary, appointments, uploads, messaging (later) |
| Admin | Clinicians / ops / org admins | Review intake, staff edits, hospitals, Epic, audit, support inbox (later) |

## Locked decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Split style | **One SPA, two shells** (`UserPortalLayout` / `AdminPortalLayout`) | Faster than dual Vite apps; extract a second app later if needed |
| Staff identity | Keep **staff elevation** for kiosk chart edits; add **staff / org_admin roles** for admin-portal login | Elevation ≠ admin home; staff should not use the patient’s password as their workspace |
| URLs | Clean paths `/app/...` and `/admin-portal/...`; keep `/tabN` as **redirects** | Stable bookmarks; progressive rename without a big-bang cutover |
| Org model | Design for **hospital/org membership** (`org_ids`); v1 may be one org | Avoids a second rewrite when multi-hospital pilots start |
| Chat scope | Product goal = **support + care-team inbox**; start with support-style threads | Chat is Phase 5 — only after both shells exist |

## Elevation vs admin login

- **Staff elevation** (`X-Meditap-Elevation`): temporary unlock to edit the **logged-in patient’s** chart on a shared device (kiosk). Lives inside the **user** portal.
- **Admin portal login**: staff / org_admin account whose home is `/admin-portal/...`. Acts **on behalf of** a selected `patientId` (Phase 3), not by sharing the patient password.

## Roles (Phase 1)

| Role | How resolved (v1) | Default home |
|------|-------------------|--------------|
| `patient` | Authenticated user who is not staff/admin | `/app/dashboard` |
| `staff` | `is_staff`, `meditap-record-editor` group, or `HospitalUser` with `HOSPITAL_STAFF` | `/admin-portal/home` |
| `org_admin` | `is_superuser` or `HospitalUser` with `HOSPITAL_ADMIN` | `/admin-portal/home` |

`/api/auth/me/` returns `role`, `org_ids`, `permissions`, and `portal_home` (`user` | `admin`).

## URL map (Phase 1)

| Legacy | New |
|--------|-----|
| `/tab1` | `/app/dashboard` |
| `/tab2` | `/app/status` |
| `/tab4` | `/app/appointments` |
| `/tab5` | `/app/conditions` |
| `/tab6` | `/app/incidents` |
| `/tab7` | `/app/labs` |
| `/tab11` | `/app/settings` |
| `/tab12` | `/app/insurance` |
| `/tab14` | `/app/intake` |
| `/tab13` | `/admin-portal/panel` |
| — | `/admin-portal/home` (admin landing stub) |

Public routes (`/tab3` login, `/tab8` support, `/tab10` about, terms/privacy) stay outside portal shells.

## Phase sequence (do not reorder chat)

0. Decisions / ADR (this doc)  
1. Roles + shells + guards  
2. Carve user portal content  
3. Carve admin portal + patient context  
4. Document vault + audit + API hardening  
5. Messaging / chat (both sides)  
6. Remodel polish + cutover  

## Explicit non-goals for Phase 0–1

- Dual SPA / second Vite app  
- Removing staff elevation  
- Document vault, audit log, or chat  
- Deploying incomplete shells to production  
