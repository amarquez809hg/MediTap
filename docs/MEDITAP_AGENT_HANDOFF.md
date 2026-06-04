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

### Current checkpoint (update when you add entry 74+)

- **Last entry:** 77 (`MT-AG-073`) — General intake recognition engine + Riverbend PDFs
- **Next entry:** 78 (`MT-AG-074`)
- **Checkpoint date:** 2026-05-30

---

## Architecture map

### Repo layout

| Path | Role |
|------|------|
| `meditap-app/src/` | SPA source (pages Tab1–Tab14, components, api.ts) |
| `backend/medapp/` | Django project (auth, urls, settings) |
| `backend/medical/` | Models, serializers, viewsets, migrations |
| `docker/` | Compose, env samples, Keycloak/bootstrap notes |
| `docs/` | Changelog, deploy notes, this handoff |

### Tab map (authenticated app)

| Route | Tab | Purpose |
|-------|-----|---------|
| `/tab1` | Dashboard | Home, previews, staff-gated add |
| `/tab2` | Quick Status | KPI cards, urgent next steps |
| `/tab4` | Appointments | Cards + modal; **Django API** (`patient-appointments`) |
| `/tab5` | Chronic conditions | API + staff quick-pick |
| `/tab6` | Incident records | API + staff quick-pick |
| `/tab7` | Lab results | `PatientLabPanel` API + quick-pick |
| `/tab11` | Settings | Dark mode, logout, preferences |
| `/tab12` | Patient insurance | API + staff elevation |
| `/tab13` | Admin panel | Shortcuts, add hospital (staff) |
| `/tab14` | Patient information | Intake, PDF upload, API hydrate |

Public: `/tab3` login, `/tab8` about, `/tab10` support, `/terms`, `/privacy`, onboarding, forgot/reset password.

### Staff elevation (all clinical edits)

1. Patient stays logged in (Keycloak or native JWT per build).
2. Staff uses modal → `POST /api/auth/staff-elevate/` → token in `sessionStorage`.
3. API sends `X-Meditap-Elevation`; backend `IntakeEditorWritePermission`.
4. Clear on dashboard exit from Tab14 / manual “End staff mode” where implemented.

Key files: `auth/staffElevationStorage.ts`, `api.ts` (`getMeditapElevationRequestHeaders`), `StaffElevationModal.tsx`, `hooks/useStaffElevationGate.ts`.

---

## Recent done work (entries 66–73, after planning entry 65)

**65 — Planning only:** Sprint B (appointments API), Sprint C (quick-pick + Tab14 API-only).

**66 — Done:** Quick-pick Tab5/6/7 (`StaffPresetField`, field libraries).

**67 — Done:** Tab4/5/6 empty-state layout aligned with Tab7.

**68–73 — Done:** Tab14 PDF pipeline (generic, Athena, MediTap demo parser), public page scroll, API hydrate after login (partial), demographics fields (address, race, ethnicity, language, marital status).

Full text of entries 65–73 is in **Set 6** of `AGENT_SESSION_CHANGELOG.md`.

---

## Open backlog (do not mark done until shipped)

_Sprint B (appointments API) and Sprint C Tab14 single-save are complete as of entries 75–76._

Next competitive milestones from product roadmap (entry 58): vitals/BMI, Epic FHIR import, document storage, audit log, hospital portal.

---

## Conventions for new changes

- Match glass header + `Go back to dashboard` on clinical/admin tabs (`fullAppUrl('/tab1')`).
- Staff modals: reuse Tab14/Tab4 CSS imports where existing.
- Tab14 PDF: extend `tab14DocumentParse.ts` / `meditapDemoRecordParse.ts`; add tests + fixture PDFs when adding parsers.
- Backend: migration + serializer + viewset + register entry; document `migrate` in README if new tables.
- Do not commit secrets, `.env`, or `node_modules`.

---

## Lomont Vista vs MediTap

- **MediTap:** This repository and `AGENT_SESSION_CHANGELOG.md`.
- **Lomont Vista:** Separate Jira project (`LV-*`) on Atlassian — export via JQL, not stored in this changelog unless user asks to copy items in.

---

## Recovering from a “blank” agent chat

1. Open `REGISTER_CHECKPOINT.md` and `MEDITAP_AGENT_HANDOFF.md` (this file).
2. `git log --oneline -20` for commits since checkpoint date.
3. Optional: search `~/.cursor/projects/Users-amarquez-Desktop-MediTap/agent-transcripts/` for long session (`eb74898d-...` ~2MB) — UI may not show it, disk often still has it.
4. Continue numbering from **74**; do not re-number old entries.

---

*Maintained for MediTap agent continuity. Update checkpoint file when adding register entry 74+.*
