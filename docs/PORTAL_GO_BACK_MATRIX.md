# Portal Go back — route matrix (do not rediscover tab-by-tab)

**Purpose:** Permanent checklist of every MediTap route and how **Go back** must behave.  
**Rule:** Leaving a page via Go back **or switching patient tabs** uses **hard navigation** (`window.location.assign`) through `navigatePortal` / `PortalNavLink`. Soft `history.push` / react-router `<Link>` is **not** reliable under `IonRouterOutlet` for sibling `/app/*` routes.

**Updated:** 2026-07-29 · **Register:** `MT-AG-084`–`MT-AG-085`, `MT-AG-089`  
**Code:** `src/navigation/portalGoBack.ts`, `PortalNavLink.tsx`, `PortalHistoryContext.tsx`, `GoBackButton.tsx`

## Status legend

| Status | Meaning |
|--------|---------|
| `ok` | Uses shared `GoBackButton` → `goBack()` → hard assign |
| `ok-special` | Custom leave (unsaved prompt, etc.) but still hard assign |
| `n/a` | No Go back control (home, login, public) |
| `shell-only` | Only chrome shell Go back (no page header button) |
| `verify` | Needs a manual smoke after a navigation change |

## How Go back must work

1. **Control:** Prefer `<GoBackButton>` / `<PortalNavLink>` — do not invent per-tab soft `history.push` or react-router `<Link>` for `/app/*` switches.
2. **Mechanism:** `navigatePortal(href)` → resolve legacy `/tabN` → hard assign.
3. **Target (back):** Previous in-app stack entry if different pathname; else `fallback`.
4. **Chart fallback:** `chartPageGoBackFallback()` = admin patient hub if selected, else `/app/dashboard`.
5. **Admin ops fallback:** `ADMIN_PORTAL_HOME` (`/admin-portal/home`).
6. **Never** rely on browser `history.goBack()` or soft `<Link>` alone inside the Ionic outlet for patient tabs.

## User portal (authenticated)

| Route | Legacy | Page | Go back control | Fallback | Status |
|-------|--------|------|-----------------|----------|--------|
| `/app/dashboard` | `/tab1` | Dashboard | Shell chrome only | `/app/dashboard` | shell-only |
| `/app/status` | `/tab2` | Quick Status | Header + shell | `chartPageGoBackFallback()` | ok |
| `/app/appointments` | `/tab4` | Appointments | Header + shell | `chartPageGoBackFallback()` | ok |
| `/app/conditions` | `/tab5` | Chronic | Header + shell | `chartPageGoBackFallback()` | ok |
| `/app/incidents` | `/tab6` | Incidents | Header + shell | `chartPageGoBackFallback()` | ok |
| `/app/labs` | `/tab7` | Lab Results | Header + shell | `chartPageGoBackFallback()` | ok |
| `/app/settings` | `/tab11` | Settings | Header + shell | `chartPageGoBackFallback()` | ok |
| `/app/insurance` | `/tab12` | Insurance | Header + shell | `chartPageGoBackFallback()` | ok |
| `/app/intake` | `/tab14` | Patient information | Custom header leave (+ unsaved modal) | `chartPageGoBackFallback()` via portal `goBack` | ok-special |

Shell chrome (`UserPortalLayout`): always shows Go back with fallback `/app/dashboard` (or chart hub when we pass chart fallback — currently dashboard; page headers use chart fallback).

## Admin portal

| Route | Page | Go back control | Fallback | Status |
|-------|------|-----------------|----------|--------|
| `/admin-portal/home` | Admin home | Shell chrome (sidebar + top bar) | `/admin-portal/home` | shell-only |
| `/admin-portal/patients` | Patients list | Page + top-bar Go back | Admin home | ok |
| `/admin-portal/patients/:id` | Patient hub | Page + top-bar Go back | Admin home | ok |
| `/admin-portal/charts` | Clinical charts | Page + top-bar Go back | Admin home | ok |
| `/admin-portal/patient-view` (+ sections) | Embedded patient UI | Banner + subnav; page Go back | Charts / hub / home | ok |
| `/admin-portal/hospitals` | Hospitals | Page + top-bar Go back | Admin home | ok |
| `/admin-portal/activity` | Activity | Page + top-bar Go back | Admin home | ok |
| `/admin-portal/panel` (`/tab13`) | Epic & facility ops | Header + top-bar Go back | Admin home | ok |
| `/admin-portal/login` | Staff login | None | — | n/a |

Admin shell UI: sidebar layout in `AdminPortalLayout` + `adminDashboard.css` (dashboard mock v1).

## Public / auth (no portal Go back required)

| Route | Page | Status |
|-------|------|--------|
| `/tab3` | Patient login | n/a |
| `/tab8` | About | n/a |
| `/tab9` | Register | n/a |
| `/tab10` | Support | n/a |
| `/terms`, `/privacy` | Legal | n/a |
| `/forgot-password`, `/reset-password` | Auth recovery | n/a |
| `/onboarding` | Onboarding | n/a |
| `/epic-callback` | OAuth return | n/a (redirects to panel) |

## Manual smoke checklist (run after any nav / Ionic / shell change)

Walk as patient (`AntonioMarquez`):

1. Dashboard → Labs → **Go back** → lands previous (dashboard or prior) — not stuck on labs.
2. Dashboard → Intake → **Go back** → leaves intake.
3. Dashboard → Appointments → Conditions → Incidents → **Go back** each time leaves.
4. Settings → Insurance → **Go back** leaves.

Walk as staff (`MrWayne`):

5. Admin home → Patients → open hub → Labs (on behalf) → **Go back** → previous or patient hub.
6. Hub → Intake → **Go back** → hub or previous (unsaved prompt if dirty).
7. Admin Activity / Hospitals / Panel → **Go back** → admin home or previous.

## When adding a new tab/page

1. Add a row to this matrix.
2. Use `GoBackButton` + `chartPageGoBackFallback()` or `ADMIN_PORTAL_HOME`.
3. Do **not** call `history.push` / `history.goBack` for leave.
4. Tick the smoke checklist above.
5. Add a register note if behavior changed.

## Unit tests

```bash
cd meditap-app && npm run test.unit -- src/navigation/portalGoBack.test.ts
```

Covers stack resolution only; Ionic leave is covered by the smoke checklist.
