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

### Current checkpoint (update when you add entry 81+)

- **Last entry:** 80 (`MT-AG-076`) — Portal split Phase 0–1 (ADR + shells) on `feature/portal-split`
- **Next entry:** 81 (`MT-AG-077`)
- **Checkpoint date:** 2026-07-27

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

Portal remodel Phases **2–6** (user/admin content carve-out, document vault, audit log, messaging, cutover). Competitive milestones: Epic FHIR depth, EHR write-back.

---

## Conventions for new changes

- Match glass header + `Go back to dashboard` on clinical/admin tabs (`fullAppUrl('/tab1')` or `/app/dashboard`).
- Staff modals: reuse Tab14/Tab4 CSS imports where existing.
- Tab14 PDF: extend `tab14DocumentParse.ts` / `meditapDemoRecordParse.ts`; add tests + fixture PDFs when adding parsers.
- Backend: migration + serializer + viewset + register entry; document `migrate` in README if new tables.
- Portal remodel: work on `feature/portal-split`; do not deploy half-finished shells to live.
- Do not commit secrets, `.env`, or `node_modules`.

---

## Lomont Vista vs MediTap vs Cargo Pulse

- **MediTap:** This repository and `AGENT_SESSION_CHANGELOG.md`.
- **Cargo Pulse:** Separate repo at `~/Desktop/cosas xd/CargoPulse` (`cargopulse.mx`) — `AGENTS.md`, `REGISTER_CHECKPOINT.md`, `docs/CARGOPULSE_AGENT_HANDOFF.md`, register `CP-AG-###`.
- **Lomont Vista:** Separate Jira project (`LV-*`) on Atlassian — export via JQL, not stored in this changelog unless user asks to copy items in.

---

## Recovering from a “blank” agent chat

1. Open `REGISTER_CHECKPOINT.md` and `MEDITAP_AGENT_HANDOFF.md` (this file).
2. `git log --oneline -20` for commits since checkpoint date.
3. Optional: search `~/.cursor/projects/Users-amarquez-Desktop-MediTap/agent-transcripts/` for long session (`eb74898d-...` ~2MB) — UI may not show it, disk often still has it.
4. Continue numbering from **74**; do not re-number old entries.

---

*Maintained for MediTap agent continuity. Update checkpoint file when adding register entry 74+.*
