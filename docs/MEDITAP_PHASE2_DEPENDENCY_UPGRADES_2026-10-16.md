# MediTap — Phase 2 Dependency Upgrade Report

**Document type:** Security remediation (Phase 2)  
**Key:** `MT-AG-185`  
**Type:** Security / Dependencies  
**Audience:** Engineering, product, and compliance stakeholders  
**Status:** Complete — full-tree `npm audit` = **0**  
**Date:** 2026-10-16  
**Branch:** `feature/portal-split`

---

## Register entry

**Type:** Security / Dependencies  

**Key:** `MT-AG-185`  

**Summary:** Complete Phase 2 dependency upgrades — clear remaining npm Critical/High (vitest tinypool, Cypress extract-zip/uuid, Vite/rollup).

**What was done:**

- Bumped toolchain: Vite **6.4.x**, Vitest **5.0.5**, Cypress **16.2**, `@vitejs/plugin-legacy` **6**, jsdom **26**, rollup override **4.64.7**.
- Pointed `vite.config.ts` at `vitest/config` for Vitest 5.
- `npm audit` → **0 vulnerabilities**.
- Smoke: unit tests (29) passed; production build succeeded.

**Outcome:** Phase 2 residual npm issues closed. Prod and dev dependency audits are clean.

**Primary paths:** `meditap-app/package.json`, `meditap-app/package-lock.json`, `meditap-app/vite.config.ts`  
**Branch:** `feature/portal-split`

---

## 1. Executive summary

| Metric | Result |
|--------|--------|
| npm audit (full tree) | **0** vulnerabilities |
| Vite | **6.4.x** (was ~5.2) |
| Vitest | **5.0.5** (was 0.34) |
| Cypress | **16.2** (was 13.5) |
| Build | Passed |
| Unit smoke | 29/29 passed |

Phase 2 finishes the dependency track from the local security pass after Capacitor **7.6.9** and PyJWT (MT-AG-183).

---

## 2. Package changes

| Package | From | To |
|---------|------|-----|
| vite | ~5.2.0 | ^6.4.4 |
| vitest | ^0.34.6 | ^5.0.5 |
| cypress | ^13.5.0 | ^16.2.0 |
| @vitejs/plugin-legacy | ^5.0.0 | ^6.1.1 |
| @vitejs/plugin-react | ^4.0.1 | ^4.7.0 |
| jsdom | ^22.1.0 | ^26.1.0 |
| terser | ^5.4.0 | ^5.16.0 |
| overrides.rollup | 4.44.0 | 4.64.7 |

---

## 3. Verification

```bash
cd meditap-app
npm audit                    # 0 vulnerabilities
npm run test.unit -- --run   # smoke subset used in this pass
npm run build
```

---

## 4. Document control

| Field | Value |
|-------|--------|
| PDF (Desktop) | `~/Desktop/MediTap_Phase2_Dependency_Upgrades_2026-10-16.pdf` |
| PDF (repo) | `docs/MEDITAP_PHASE2_DEPENDENCY_UPGRADES_2026-10-16.pdf` |
| Generator | `docs/generate_meditap_phase2_deps_pdf.py` |
| Related | MT-AG-182 findings · MT-AG-183 Phase 1–3 · MT-AG-184 findings PDF |

*End of report.*
