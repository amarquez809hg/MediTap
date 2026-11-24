# MediTap — Local Security Pass Report

**Document type:** Security assessment (free-tool pass)  
**Key:** `MT-AG-182`  
**Type:** Security / Assessment  
**Audience:** Engineering, product, and compliance stakeholders  
**Status:** Findings recorded; **Phase 1–2 remediation shipped in `MT-AG-183` (2026-10-16)**  
**Date:** 2026-10-14 (assessment) · 2026-10-16 (remediation)  
**Branch / workspace:** `feature/portal-split` · `/Users/amarquez/Desktop/MediTap`  
**Scope:** Django API (`backend/`), Ionic/React SPA (`meditap-app/`), dependency lockfiles, auth/config review  
**Out of scope:** Paid Black Duck Coverity / Polaris enterprise SAST (no org credentials yet)

---

## Register entry

**Type:** Security / Assessment  

**Key:** `MT-AG-182`  

**Summary:** Ran a free local security pass (Bandit, pip-audit, npm audit, Django settings/auth review) and documented Critical/High findings and a secure-website checklist for MediTap.

**What was done:**

- Bandit SAST on `backend/medapp` + `backend/medical` (excluding migrations).  
- pip-audit against `backend/requirements.txt`.  
- npm audit against `meditap-app/package-lock.json`.  
- Manual review of `SECRET_KEY`, `SECURE_*`, DRF defaults, password policy, AllowAny surfaces, and XSS sinks.  
- Produced this report plus an interactive canvas summary for the team.

**Outcome:** Prioritized backlog for secure-website hardening without Coverity. Top actions: env-only `SECRET_KEY`, production `SECURE_*` headers/cookies, upgrade `python-jose` + `@capacitor/ios`, tighten DRF default auth.

**Primary paths:** `docs/MEDITAP_LOCAL_SECURITY_PASS_REPORT_2026-10-14.md`, `backend/medapp/settings.py`, `backend/requirements.txt`, `meditap-app/package.json`  
**Branch:** `feature/portal-split`

---

## 1. Executive summary

MediTap was assessed with **free local tools** that cover the same secure-website controls expected for a patient portal (transport, secrets, authN/authZ, headers, dependencies, SAST basics). This is **not** a substitute for Black Duck Coverity once credentials are available; it is a practical baseline while Coverity remains blocked on licensing.

| Metric | Result |
|--------|--------|
| Bandit (Python) | High **3** · Medium **5** · Low **16** |
| pip-audit | **3** vulns in **2** packages (`python-jose`, `ecdsa`) |
| npm audit | Critical **4** · High **29** · Moderate **6** · Low **2** (**41** total) |
| XSS (`dangerouslySetInnerHTML`) | **None** found under `meditap-app/src/` |
| Local DB in git | `backend/db.sqlite3` **gitignored** (good) |

**Conclusion:** Proceed with remediation in severity order below. Re-run this pass after each batch; add Coverity CI when org credentials exist.

---

## 2. Objectives and scope

| Topic | Condition assessed | Outcome |
|--------|---------------------|--------|
| **Code SAST (Python)** | Bandit medium+ on API apps | **Findings** — urlopen / bind / PyCrypto fallback |
| **Python dependencies** | pip-audit on requirements | **Findings** — jose / ecdsa |
| **JS/TS dependencies** | npm audit on SPA | **Findings** — Capacitor, vitest, cypress tree, etc. |
| **Django production hardening** | SECRET_KEY, DEBUG, SECURE_*, cookies | **Gaps** — hardcoded key; no SECURE_* block |
| **API authZ for PHI** | DRF defaults + patient scoping | **Partial** — scoping returns empty for anonymous; default permission too open |
| **Frontend XSS** | `dangerouslySetInnerHTML` | **Met** — none in src |
| **Coverity / Black Duck CI** | Enterprise SAST | **Blocked** — no server credentials |

---

## 3. Tools and method

| Tool | Command / method | Target |
|------|------------------|--------|
| **Bandit** | `bandit -r medapp medical -x '*/migrations/*' -ll` | Django apps |
| **pip-audit** | `pip-audit -r requirements.txt` | Python deps |
| **npm audit** | `npm audit --json` | `meditap-app` lockfile |
| **Config review** | Grep / read `settings.py`, permissions, views | Prod hardening |
| **Secret patterns** | Ripgrep for keys/passwords (excl. node_modules) | Leakage check |

---

## 4. Prioritized findings

### 4.1 Critical

| ID | Area | Finding | Evidence | Recommended fix |
|----|------|---------|----------|-----------------|
| **SEC-001** | Django config | Hardcoded `SECRET_KEY` in source | `backend/medapp/settings.py` (`django-insecure-…`) | Load only from env/secret store; rotate on meditap.ai; never commit production key |
| **SEC-002** | Mobile (npm) | `@capacitor/ios` critical remote-content-at-origin class | npm audit: `@capacitor/ios` 7.0.0–7.6.8 | Bump `@capacitor/ios` (+ CLI sync) past fixed range; rebuild iOS |

### 4.2 High

| ID | Area | Finding | Evidence | Recommended fix |
|----|------|---------|----------|-----------------|
| **SEC-003** | Django config | No `SECURE_*` / HSTS / secure cookie flags | No matches in `settings.py` | When `DEBUG` is false: `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_CONTENT_TYPE_NOSNIFF` (behind nginx TLS) |
| **SEC-004** | Auth / PHI API | Global + `BaseViewSet` use `IsAuthenticatedOrReadOnly` | `settings.REST_FRAMEWORK`, `medical/views.py` | Default to `IsAuthenticated`; keep explicit `AllowAny` only on public auth/card routes |
| **SEC-005** | AuthN | Registration skips Django password validators by default | `MEDITAP_REGISTER_SKIP_PASSWORD_VALIDATORS` defaults to on | Set `MEDITAP_REGISTER_SKIP_PASSWORD_VALIDATORS=0` on production |
| **SEC-006** | pip | `python-jose` CVE-2026-85394; transitive `ecdsa` timing | pip-audit | Upgrade/replace `python-jose`; re-run pip-audit |
| **SEC-007** | Bandit / crypto | PyCrypto fallback import (deprecated) | `medical/sun_crypto.py` B413 | Prefer `cryptography` only; drop `Crypto` fallback in prod |
| **SEC-008** | npm tree | 41 audit issues (4 critical / 29 high) | npm audit | `npm audit fix`; bump vitest / Capacitor CLI / cypress; treat prod vs dev risk separately |

### 4.3 Medium

| ID | Area | Finding | Evidence | Recommended fix |
|----|------|---------|----------|-----------------|
| **SEC-009** | Bandit / SSRF | `urllib.urlopen` without scheme allow-list | `epic_fhir_client.py`, `epic_oauth_http.py`, `epic_views.py` | Allow only `https://` to trusted Epic hosts |
| **SEC-010** | Surface | Public `AllowAny` endpoints | `card_views`, `public_views`, native auth | Rate-limit auth; keep public card payloads minimal; no PHI |

### 4.4 Low / informational

| ID | Area | Finding | Notes |
|----|------|---------|-------|
| **SEC-011** | Frontend | No `dangerouslySetInnerHTML` in `src/` | Keep avoiding raw HTML sinks |
| **SEC-012** | Hygiene | `db.sqlite3` gitignored; docker `SECRET_KEY=dev-secret` | OK for local; must not reach production |

**Note on authZ:** `filter_by_allowed_patients` returns **no rows** for unauthenticated users, which reduces PHI list risk today. Catalog endpoints inheriting `BaseViewSet` may still be anonymously readable — tighten the default anyway.

---

## 5. Secure-website checklist (patient portal / PHI)

| Control | Need | This pass |
|---------|------|-----------|
| Transport | HTTPS everywhere; no mixed content | Verify on meditap.ai |
| Secrets | No secrets in git; rotate keys | **Fix SEC-001** |
| AuthN | Strong passwords; rate limits; secure reset | **Fix SEC-005** |
| AuthZ | PHI APIs require auth + patient scoping | **Fix SEC-004** |
| Session / JWT | Short access TTL; secure cookies; refresh blacklist | JWT 30m / 7d present; add secure cookies |
| Headers | HSTS, frame options, nosniff, CSP where feasible | **Fix SEC-003** |
| Dependencies | Clean Critical/High in prod deps | **Fix SEC-006, SEC-002, SEC-008** |
| SAST | Bandit/Semgrep free; Coverity when licensed | Bandit done; Coverity pending credentials |
| Uploads | PDF vault type/size limits; no path traversal | Review `PatientDocument` next pass |
| Logging | No PHI/tokens in logs; admin audit | Keep `admin_ops` clean |
| Backups | Encrypted DB backups; locked media/ | Ops checklist |
| Mobile | Capacitor origin isolation | **Fix SEC-002** |

---

## 6. Recommended remediation phases

### Phase 1 — Production secrets & HTTPS hardening — **done (`MT-AG-183`)**

1. `SECRET_KEY` from env; required when `DEBUG` is false (rotate on meditap.ai when deploying).  
2. `SECURE_*` / HSTS / secure cookies when `DEBUG` is false.  
3. Ops: confirm nginx TLS + headers on the VM after deploy.

### Phase 2 — Dependency upgrades — **done (`MT-AG-183` + `MT-AG-185`)**

1. Replaced `python-jose` with `PyJWT` — pip-audit clean.  
2. `@capacitor/ios|core|cli` **7.6.9**.  
3. Vite **6.4** / Vitest **5** / Cypress **16** / rollup **4.64.7** — full `npm audit` → **0**.

### Phase 3 — API permission hardening — **done (`MT-AG-183`)**

1. DRF default + `BaseViewSet` → `IsAuthenticated`.  
2. Public auth/card routes keep explicit `AllowAny`.  
3. Epic `urlopen` HTTPS allow-list; SUN crypto cryptography-only.

### Phase 4 — Coverity / Black Duck (when credentials arrive)

1. Create Coverity project/stream; store `COVERITY_URL` / user / passphrase as GitHub secrets.  
2. Enable `.github/workflows/coverity-security-scan.yml` baseline on `main`.  
3. Triage Coverity High/Critical alongside this free-pass backlog.

---

## 7. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Hardcoded SECRET_KEY reused in production | Env-only key + rotation + invalidate tokens |
| npm Critical noise from dev tools | Separate prod runtime deps from vitest/cypress; still patch Capacitor |
| Over-tightening AllowAny breaks public card/auth | Explicit allow-list of public paths + tests |
| Waiting on Coverity stalls all hardening | Continue free-pass remediations now |

---

## 8. Appendix — commands to reproduce

```bash
# From repo root
python3 -m venv /tmp/meditap-sec-venv
/tmp/meditap-sec-venv/bin/pip install bandit pip-audit
/tmp/meditap-sec-venv/bin/bandit -r backend/medapp backend/medical \
  -x '*/migrations/*,*/__pycache__/*' -ll
/tmp/meditap-sec-venv/bin/pip-audit -r backend/requirements.txt

cd meditap-app && npm audit
```

---

## 9. Document control

| Field | Value |
|-------|--------|
| Report file | `docs/MEDITAP_LOCAL_SECURITY_PASS_REPORT_2026-10-14.md` |
| Register key | `MT-AG-182` (assessment) · `MT-AG-183` (remediation) |
| Related canvas | Cursor canvas: `meditap-local-security-pass.canvas.tsx` |
| Next register | `MT-AG-184` |

*End of report.*
