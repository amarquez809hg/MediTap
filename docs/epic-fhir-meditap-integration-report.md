# Epic on FHIR ↔ MediTap Server — Integration Assessment & Recommended Next Steps

**Document type:** Technical–program assessment  
**Audience:** Engineering, product, and compliance stakeholders  
**Status:** Feasibility confirmed; implementation not started  
**Reference portal:** [Epic on FHIR](https://fhir.epic.com/) (developer registration, sandbox, API catalog, OAuth/SMART documentation)

---

## 1. Executive summary

Integration between **MediTap’s own application server** (Django API, persistence layer, and security model) and **Epic’s FHIR ecosystem** (documented and exercised via **Epic on FHIR**—sandbox, client registration, and FHIR resource catalog) is **technically feasible and standard practice**. The linkage is **not** a low-level “mount” of Epic as a secondary database on the same host; it is a **standards-based interoperability layer**: **OAuth 2.0 / SMART on FHIR** for authorization and **HTTPS FHIR** for read/write operations permitted by Epic for the registered application.

**Conclusion:** Proceed with a **phased integration program** spanning discovery, sandbox hardening, mapping and sync design, production onboarding per Epic customer, and ongoing operations (security, monitoring, and data governance).

---

## 2. Objectives and scope evaluated

| Topic | Condition assessed | Outcome |
|--------|---------------------|--------|
| **Existence of developer access** | Epic on FHIR account available | **Met** — supports registration, documentation, and sandbox testing. |
| **Nature of Epic on FHIR** | What the portal provides | **Clarified** — developer portal, **FHIR API catalog** (resources, operations, FHIR versions DSTU2/STU3/R4), **sandbox**, **OAuth/SMART** guidance; not arbitrary bulk “storage as a service” for arbitrary files. |
| **Integration topology** | Whether MediTap can “attach” Epic like a DB volume | **Rejected as model** — correct model is **API client** (and optional SMART launch consumer) over TLS. |
| **MediTap role** | System of record vs federated source | **MediTap remains primary** for app workflows; Epic is an **external clinical source** (federation/sync), with explicit mapping and provenance. |
| **Authentication split** | MediTap (e.g. Keycloak) vs Epic OAuth | **Independent** — MediTap end-user auth does not replace Epic OAuth for FHIR; server must implement **Epic client credentials / SMART flows** as required by app type. |

---

## 3. Technical feasibility (architecture at a glance)

### 3.1 Standard integration pattern

1. **App registration** on Epic on FHIR (client id, redirect URIs, scopes, JWKS if asymmetric client auth is required).  
2. **MediTap backend** implements an **OAuth 2.0 / SMART** client: token endpoint, refresh handling, secure secret or key storage.  
3. **MediTap backend** calls Epic’s **FHIR base URL** with **Bearer** access tokens; implements pagination, error handling, and rate-limit awareness.  
4. **Mapping & persistence**: FHIR JSON ↔ MediTap domain models; store **subset** of data needed for product features, plus **metadata** (Epic resource identifiers, last sync, version, source system).  
5. **Operational split**: **Sandbox** for development/QA; **production** requires **customer-specific** FHIR endpoints and contractual/operational approval—not a single global “production URL” for all sites.

### 3.2 What MediTap must add (server-side)

- **Configuration**: per-environment (and per Epic customer) FHIR base URL, auth server URLs, client identifiers, keys, allowed scopes.  
- **OAuth/token service**: authorization code (user/patient context) and/or other flows Epic approves for the app category; refresh token lifecycle.  
- **FHIR client module**: HTTP client, resource-specific queries, bundle handling where used.  
- **Domain mapping layer**: explicit mapping tables or services (e.g. Patient, Encounter, Observation, MedicationRequest) aligned to MediTap serializers/models.  
- **Security**: encrypted storage of refresh tokens or equivalent; audit logging; least-privilege scopes.  
- **Sync policy**: pull schedule, webhooks if applicable, conflict rules, and “source of truth” rules per field.

---

## 4. Constraints and preconditions (non-technical and technical)

| Area | Constraint |
|------|------------|
| **Legal / compliance** | Use of production FHIR typically involves **agreements** (e.g. BAA path with covered entity or vendor chain), **minimum necessary** data, and documented purposes. Sandbox data is **not** production PHI for real patients (test data). |
| **Catalog vs deployment** | Epic’s **published resource list** describes *what can exist* in the platform; **each customer** enables a subset. Design must tolerate **capability gaps**. |
| **Versions** | Resources may appear under **R4, STU3, or DSTU2** in the catalog; MediTap should **standardize on one primary FHIR version** (typically **R4**) and branch only where Epic requires. |
| **Identity** | Patient/user binding between MediTap `sub`/internal id and Epic **Patient** id (or logical references) must be explicit and stable. |
| **Operations** | Create/update/delete are not universally allowed; design read-heavy flows first, then write paths only where Epic approves scopes. |

---

## 5. Recommended further steps (phased roadmap)

### Phase A — Discovery & decision record (1–2 weeks, calendar time)

1. **Inventory product use cases**: which clinical domains MediTap must show first (e.g. demographics, problems, meds, labs, appointments).  
2. **Map use cases → FHIR resources & operations** using Epic’s catalog; record **required scopes** and **read vs write** needs.  
3. **Choose SMART/OAuth profile**: patient-facing vs provider-facing vs backend service (as Epic allows for your app type).  
4. **Architecture decision record (ADR)**: MediTap as SMART client; token storage; sync vs on-demand fetch; primary FHIR version (R4).  
5. **Compliance review**: data categories, retention, logging, subprocessors, BAA implications for production.

### Phase B — Sandbox integration (engineering)

1. **Secure configuration** of sandbox client credentials in MediTap server (secrets manager / env, not repository).  
2. **Implement OAuth token acquisition and refresh** against Epic sandbox authorization server.  
3. **Implement minimal FHIR vertical slice** (e.g. `Patient` read + `Patient/$everything` or scoped reads if permitted) end-to-end into MediTap DB or cache.  
4. **Add provenance fields** on MediTap entities: `external_system`, `external_id`, `last_fhir_sync_at`, `fhir_version`.  
5. **Automated tests** with sandbox (contract tests against recorded fixtures where possible).  
6. **Observability**: structured logs for FHIR calls (no PHI in logs in production); metrics for latency and error rates.

### Phase C — Expand coverage

1. **Iterate resource by resource** per product priority (Observation, MedicationRequest, Encounter, DocumentReference, etc.).  
2. **Pagination and bulk** patterns if Epic supports them for your scopes (e.g. bulk export where applicable).  
3. **UI/UX**: loading states, stale data indicators, “last updated from Epic” messaging, error surfacing for auth expiry.

### Phase D — Production readiness (per Epic customer)

1. **Customer-specific** FHIR base URL and registration (often distinct from sandbox).  
2. **Go-live checklist**: scopes verified in that environment, throughput limits, support contacts, rollback.  
3. **Runbook**: token failure, Epic downtime, partial sync recovery.

---

## 6. Risks and mitigations (summary)

| Risk | Mitigation |
|------|------------|
| Scope creep across entire FHIR catalog | **Prioritize** use cases; implement **thin vertical slices**. |
| Token leakage or over-broad scopes | **Secrets management**, **minimal scopes**, rotation, audits. |
| Model mismatch (FHIR ↔ MediTap) | **Mapping layer** + versioning; avoid duplicating entire Epic graph in MediTap. |
| Customer variance | **Capability discovery** (metadata / $metadata where appropriate) and graceful degradation. |
| Regulatory misuse of sandbox learnings | Treat sandbox as **engineering only**; separate **production** design review. |

---

## 7. Open items for leadership / product

1. **Target persona**: patient-only app, clinician workflow, or both (drives OAuth and scope model).  
2. **Single Epic customer vs multi-tenant** MediTap deployment (affects configuration model).  
3. **Write-back requirements** (orders, notes) vs read-only aggregation—materially affects Epic review and liability.  
4. **Timeline and MVP** definition for first externally visible Epic-backed feature.

---

## 8. Closing statement

Linking **Epic on FHIR** capabilities to the **MediTap server** is **possible and aligned with industry practice**, provided the program is executed as **standards-based API integration** with clear **phasing**, **security**, and **governance**. The steps above de-risk delivery by separating **sandbox proof** from **production contractual and technical** workstreams.

---

*Prepared for internal planning. Epic, FHIR, and SMART on FHIR are governed by Epic and HL7 specifications; this document does not substitute for Epic’s official documentation or legal counsel.*
