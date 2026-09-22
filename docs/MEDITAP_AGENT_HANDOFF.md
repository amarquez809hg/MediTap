# MediTap agent handoff — persistent context

**Purpose:** When a Cursor agent session restarts or opens a new chat, use this file plus `meditap-app/REGISTER_CHECKPOINT.md` and `docs/AGENT_SESSION_CHANGELOG.md` to resume MediTap work without losing continuity.

**Owner workflow:** Antonio / MediTap team — modifications tracked in numbered register entries (Jira-style), not only git commits.

---

## Register workflow (required)

### Format for every completed task

```
NN) Short title

Type: Story | Bug | Feature | UX | Spike | ...

Summary: One sentence — why this was done.

What was done:
- Concrete deliverable 1
- Concrete deliverable 2
- ...

Outcome: What improved; what is explicitly NOT included / still open.
```

### Files to update

| File | Role |
|------|------|
| `docs/AGENT_SESSION_CHANGELOG.md` | Full detailed register (Sets 1–6+) |
| `meditap-app/REGISTER_CHECKPOINT.md` | Last entry #, next `MT-AG-###`, short bullet summary |
| `docs/AGENT_SESSION_CHANGELOG.docx` | Optional Word export via `docs/scripts/changelog_to_docx.py` |

### Current checkpoint (update when you add entry 89+)

- **Last entry:** 168 (`MT-AG-164`) — staff card assignment and full tap chart
- **Next entry:** 169 (`MT-AG-165`)
- **Checkpoint date:** 2026-09-22
- **Go back matrix:** `docs/PORTAL_GO_BACK_MATRIX.md` (all tabs tracked)
- **Branch:** `feature/portal-split` (much of Set 6 still uncommitted — rely on register + working tree, not only `git log`)

---

## Session transfer — 2026-08-06 (Athena Tab14 completeness)

**Canonical home:** this MediTap repo only (`MT-AG-###`). **Not** Cargo Pulse (`CP-AG-###` at `~/Desktop/cosas xd/CargoPulse`). If a chat was mislabeled as Cargo Pulse while editing MediTap, treat the items below as already transferred into the MediTap agent register.

### Shipped today (entries 114–119)

| Entry | Key | What |
|------:|-----|------|
| 114 | `MT-AG-110` | Related Person / Care Team contacts complete (phones, email, address; gate Assessment “none recorded”) |
| 115 | `MT-AG-111` | Care Team table NPI / Member ID / Peralta completeness |
| 116 | `MT-AG-112` | Plan of Treatment labs/imaging/meds (real titles, not provider junk) |
| 117 | `MT-AG-113` | Extended entry card separation + `N# {section}` badges; drop duplicate header clutter |
| 118 | `MT-AG-114` | New **Patient Instructions** nav section + Athena parse |
| 119 | `MT-AG-115` | **Results** empty fix — Athena Results → `Tab14LabPanel[]` (`athenaResultsParse.ts`) |
| 120 | `MT-AG-116` | Results accordion titles show SureSwab/UA/… (not `N# Results`); UA/M merge + imaging Final |
| 121 | `MT-AG-117` | Problems “No Known Problems” → none checkbox + Condition Name / Notes fields |
| 122 | `MT-AG-118` | Procedures none + **Surgical History** sidebar; stop PoT Imaging/pharmacy junk |
| 123 | `MT-AG-119` | **Imaging Results** + **Procedure Notes** sidebar sections under Procedures family |
| 124 | `MT-AG-120` | Allergy ID/code/org + med Sig/status + imaging address fields |
| 125 | `MT-AG-121` | Family/medical history, immunizations, clinical notes parsers + **Past Encounters** as multiple hospital visits |
| 126 | `MT-AG-122` | Athena Medications full 16-drug list — fix hyphen/salt wrap junk rows |
| 127 | `MT-AG-123` | Vitals history dropdown — switch dated Athena readings (staff edit) |
| 128 | `MT-AG-124` | Mental Status all PHQ dates + accordion dropdowns on extended entries |
| 129 | `MT-AG-125` | **Obstetrics History** sidebar (GPAL + Gynecological) between Medical History and Immunizations |
| 130 | `MT-AG-126` | Athena multi-patient hardening — Harold Jennings + Diana dialects (allergies/meds/problems/payers/labs) |
| 131 | `MT-AG-127` | Harold **Plan of Treatment** full lab/med/vaccine orders (was only 2 rows) |
| 132 | `MT-AG-128` | Harold **Care Team** full table — Cole / Nkemelu / Rocky Mountain Eye + NPI |
| 133 | `MT-AG-129` | Athena **fixture corpus + section completeness** (training loop; gaps visible in Tab14) |
| 134 | `MT-AG-130` | Completeness scores **every left-menu** item (`TAB14_PORTABILITY_NAV`) |
| 135 | `MT-AG-131` | **Care Team Members** (early) vs **Care Team** (end NPI table) as separate tabs |

### Key files from this tranche

- `meditap-app/src/intake/tab14PortabilitySections.ts` (+ `.test.ts`)
- `meditap-app/src/intake/athenaResultsParse.ts` (+ `.test.ts`) — **new**
- `meditap-app/src/intake/tab14DocumentParse.ts` (wires `labPanels`)
- `meditap-app/src/intake/dianaSmithPortability.integration.test.ts`
- `meditap-app/src/pages/Tab14ExtendedSectionPanel.tsx`, `Tab14.tsx`, `Tab14.css`
- Fixture: `meditap-app/test-fixtures/dummyPDFs/diana_smith_medical_record.pdf`

### UX / verify notes for next agent

- After parse changes: **hard-refresh + re-upload** Diana PDF (stale uploads keep old empty Results / incomplete sections).
- Results is **legacy lab panels** UI (not extended clinical cards).
- Entry cards use `1# Patient Instructions`-style labels (menu section name), not free-form PDF titles as the only badge.

### Still open (unchanged backlog)

- Sprint B remainder / portal Phases 2–6 polish as listed below — **not** part of this Athena tranche.

Full write-ups: `docs/AGENT_SESSION_CHANGELOG.md` entries 114–119.

---

## Architecture map

### Repo layout

| Path | Role |
|------|------|
| `meditap-app/src/` | SPA source (pages Tab1–Tab14, portals, components, api.ts) |
| `meditap-app/src/portals/` | User/Admin portal shells (Phase 1+) |
| `backend/medapp/` | Django project (auth, urls, settings, portal_identity) |
| `backend/medical/` | Models, serializers, viewsets, migrations |
| `docker/` | Compose, env samples, Keycloak/bootstrap notes |
| `docs/` | Changelog, deploy notes, this handoff, `PORTAL_SPLIT_DECISIONS.md` |

### Tab map (authenticated app)

| Route | Tab / shell | Purpose |
|-------|-------------|---------|
| `/app/dashboard` (`/tab1`) | User portal · Dashboard | Home, previews, staff-gated add |
| `/app/status` (`/tab2`) | User portal · Quick Status | KPI cards, urgent next steps |
| `/app/appointments` (`/tab4`) | User portal · Appointments | Cards + modal; Django API |
| `/app/conditions` (`/tab5`) | User portal · Chronic | API + staff quick-pick |
| `/app/incidents` (`/tab6`) | User portal · Incidents | API + staff quick-pick |
| `/app/labs` (`/tab7`) | User portal · Labs | `PatientLabPanel` API + quick-pick |
| `/app/settings` (`/tab11`) | User portal · Settings | Dark mode, logout, preferences |
| `/app/insurance` (`/tab12`) | User portal · Insurance | API + staff elevation |
| `/app/intake` (`/tab14`) | User portal · Patient information | Intake, PDF upload, API hydrate |
| `/admin-portal/home` | Admin portal home | Staff landing (Phase 1 stub) |
| `/admin-portal/panel` (`/tab13`) | Admin portal · Admin panel | Shortcuts, hospitals, Epic |

Public: `/tab3` login, `/tab8` about, `/tab10` support, `/terms`, `/privacy`, onboarding, forgot/reset password.

### Staff elevation (all clinical edits)

1. Patient stays logged in (Keycloak or native JWT per build).
2. Staff uses modal → `POST /api/auth/staff-elevate/` → token in `sessionStorage`.
3. API sends `X-Meditap-Elevation`; backend `IntakeEditorWritePermission`.
4. Clear on dashboard exit from Tab14 / manual “End staff mode” where implemented.
5. Elevation is **kiosk unlock inside the user portal** — not the same as admin-portal staff login.

Key files: `auth/staffElevationStorage.ts`, `api.ts` (`getMeditapElevationRequestHeaders`), `StaffElevationModal.tsx`, `hooks/useStaffElevationGate.ts`.

---

## Recent done work (entries 66–80)

**65 — Planning only:** Sprint B (appointments API), Sprint C (quick-pick + Tab14 API-only) — later delivered.

**66–79:** Quick-pick, Tab14 PDF pipeline, appointments API, Tab14 API-only, PDF provenance warnings.

**80 — In progress on branch:** Portal split Phase 0–1 (`feature/portal-split`). See `docs/PORTAL_SPLIT_DECISIONS.md`.

Full text of entries is in **Set 6** of `AGENT_SESSION_CHANGELOG.md`.

---

## Open backlog (do not mark done until shipped)

Portal remodel Phases **2–6** (user/admin content carve-out, **document vault v1 done**, stronger audit, messaging, cutover). Next: admin review-queue polish, patient portal view-only cleanup. Competitive milestones: Epic FHIR depth, EHR write-back.

---

## Conventions for new changes

- Match glass headers; use shared `GoBackButton` (previous page, not only dashboard) via `PortalHistoryProvider`. **Hard leave only** — see `docs/PORTAL_GO_BACK_MATRIX.md` (do not soft `history.push` for Go back).
- Staff modals: reuse Tab14/Tab4 CSS imports where existing.
- Tab14 PDF: extend `tab14DocumentParse.ts` / `meditapDemoRecordParse.ts`; add tests + fixture PDFs when adding parsers.
- Backend: migration + serializer + viewset + register entry; document `migrate` in README if new tables.
- Portal remodel: work on `feature/portal-split`; do not deploy half-finished shells to live.
- Do not commit secrets, `.env`, or `node_modules`.

---

## Lomont Vista vs MediTap vs Cargo Pulse

- **MediTap:** This repository and `AGENT_SESSION_CHANGELOG.md`.
- **Cargo Pulse:** Separate repo at `~/Desktop/cosas xd/CargoPulse` (`cargopulse.mx`) — `AGENTS.md`, `REGISTER_CHECKPOINT.md`, `docs/CARGOPULSE_AGENT_HANDOFF.md`, register `CP-AG-###`.
- **Lomont Vista:** Separate Jira project (`LV-*`) on Atlassian — export via JQL, not stored in this changelog unless user asks to copy items in. Workflow / UI / deploy map for agent sessions: [`docs/LOMONT_VISTA_WORKFLOW.md`](LOMONT_VISTA_WORKFLOW.md).

---

## Recovering from a “blank” agent chat

1. Open `REGISTER_CHECKPOINT.md` and `MEDITAP_AGENT_HANDOFF.md` (this file) — especially **Session transfer — 2026-08-06**.
2. `git status` / `git log --oneline -20` (note: Athena tranche may still be uncommitted on `feature/portal-split`).
3. Optional: MediTap transcripts under `~/.cursor/projects/Users-amarquez-Desktop-MediTap/agent-transcripts/` (e.g. Results session `4036e115-...`).
4. Continue numbering from **129** (`MT-AG-125`); do not re-number old entries.
5. Do **not** append MediTap work to Cargo Pulse’s `CP-AG-###` register.

---

*Maintained for MediTap agent continuity. Update checkpoint file when adding register entry 120+.*
