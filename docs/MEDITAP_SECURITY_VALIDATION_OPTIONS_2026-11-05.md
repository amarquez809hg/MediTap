# MediTap — Security Validation Options (Code Inspection)

**Document type:** Security vendor comparison (recognition ranking)  
**Key:** `MT-AG-200`  
**Type:** Security / Planning  
**Audience:** Engineering, product, and compliance stakeholders  
**Status:** Decision brief — Black Duck Coverity still blocked (no pricing reply)  
**Date:** 2026-11-05  
**Branch / workspace:** `feature/portal-split` · `/Users/amarquez/Desktop/MediTap`  
**Scope:** Third-party code inspection systems that can stand in for Black Duck Coverity / Black Duck SCA when MediTap needs external validation of the site and codebase  
**Out of scope:** Contracting a vendor, enabling paid CI, or claiming a scan has already been completed

**Related:** `docs/MEDITAP_LOCAL_SECURITY_PASS_REPORT_2026-10-14.md` (`MT-AG-182`), Phase 1–2 remediation (`MT-AG-183`, `MT-AG-185`), workflow stub `.github/workflows/coverity-security-scan.yml`

---

## Register entry

**Type:** Security / Planning

**Key:** `MT-AG-200`

**Summary:** Rank code-inspection vendors by external recognition so MediTap can choose a Black Duck Coverity alternative while sales has not replied.

**What was done:**

- Recorded the current blocker: no pricing or reply from Black Duck.
- Ranked Veracode, Checkmarx, Black Duck Coverity, Snyk, Sonar, GitHub CodeQL, and Semgrep by how seriously outside reviewers treat a validation.
- Separated “named validation” (procurement / partner trust) from continuous CI proof and from the free local pass already shipped.

**Outcome:** For a recognized third-party seal, shortlist Veracode or Checkmarx (Black Duck remains first choice if they reply). Use Snyk, Semgrep, or CodeQL for continuous inspection underneath. The local Bandit / pip-audit / npm audit pack stays supporting evidence, not the headline.

**Primary paths:** `docs/MEDITAP_SECURITY_VALIDATION_OPTIONS_2026-11-05.md`  
**Branch:** `feature/portal-split`

---

## 1. Executive summary

MediTap already has a free local security baseline (`MT-AG-182` through `MT-AG-185`) and a Coverity workflow stub waiting on credentials. Black Duck has not answered the pricing request. External “validation” of the site is only as strong as **who signed it**, **what was scanned**, and **how current the report is**.

| Decision | Recommendation |
|----------|----------------|
| Headline validator (recognition) | **Veracode** or **Checkmarx**. Keep **Black Duck Coverity** if they reply. |
| Fastest recognized start | **Snyk** (free tier to trial; strong on npm and pip). |
| Continuous CI under the headline | **Semgrep** and/or **GitHub CodeQL + Dependabot**. |
| Supporting appendix only | Local Bandit, pip-audit, npm audit — necessary, not a third-party seal. |

---

## 2. What “validation” means for MediTap

A logo on the website is weaker than a dated report tied to a commit. Reviewers of a patient portal typically look for:

| Evidence | What it proves |
|----------|----------------|
| Named vendor report | Someone outside MediTap inspected a defined build |
| Commit SHA or release tag | The finding set matches a specific codebase |
| Policy (for example, no open Critical/High) | The scan was gated, not only run once |
| Production or release-candidate target | The result applies to the site partners will use |
| Re-scan after material change | Auth, uploads, and dependencies did not silently age the letter |

SAST (source flaws) plus SCA (dependency CVEs) is the minimum pair. A one-time SAST pass alone does not cover supply chain. Dynamic testing or a pen test raises trust further and is outside this comparison.

### Reliability tiers

| Tier | What it is | How partners usually read it |
|------|------------|------------------------------|
| **1** | Independent attested assessment of MediTap’s app/API | Highest trust for “the site was validated” |
| **2** | Continuous gated scanning in CI with triage and fixes | Strong operations; weaker as a one-page marketing claim unless summarized |
| **3** | Managed SCA and SBOM per release | Reliable for supply-chain questions; incomplete alone |
| **4** | First-party hardening pack (Bandit, audits, Django `SECURE_*`) | Required baseline; low external trust by itself |

Veracode, Checkmarx, and Black Duck Coverity on a dated MediTap stream sit in **Tier 1–2**. The free local pass stays **Tier 4**.

---

## 3. Recognition ranking

Ordered by how well known and accepted the name is when someone outside engineering asks “who validated you?” Technical depth is close among the top names; this order is about **recognition**, not a claim that one engine finds every bug the others miss.

| Rank | System | Recognition | Best use for MediTap |
|------|--------|-------------|----------------------|
| **1** | **Veracode** | Longest enterprise AppSec attestation brand; common on vendor questionnaires | Headline validation letter (SAST, and usually SCA / DAST on the same platform) |
| **2** | **Checkmarx** | Same procurement tier as Veracode for enterprise SAST | Headline validation when the buyer already lists Checkmarx on RFPs |
| **3** | **Black Duck Coverity** | Highly recognized for SAST (Coverity) and open-source risk (Black Duck) | Stay Plan A if sales replies; workflow stub already in repo |
| **4** | **Snyk** | Very well known to engineering teams; increasingly accepted by security buyers | Best balance of recognition and speed; trial without a long sales cycle |
| **5** | **SonarQube / SonarCloud** | Extremely common for quality and security gates | PR quality gate; weaker alone as the portal’s security seal |
| **6** | **GitHub CodeQL** (Code Security) | Strong inside GitHub-centric orgs; weaker as a standalone vendor seal | Native PR alerts if the repo stays on GitHub |
| **7** | **Semgrep** | Strong with AppSec and developers; rising; less household in procurement | High-signal CI and custom Django/React rules; Community Edition can prove value first |

### How to read the rank

- **Ranks 1–3** are the names most likely to satisfy a partner who wants a known security platform on the letterhead.
- **Rank 4** is the practical next ask if Black Duck stays silent and a full enterprise quote is too slow.
- **Ranks 5–7** are excellent continuous inspection. They support the claim. They should not be the only sentence in an investor or hospital security questionnaire.

---

## 4. Fit against MediTap’s stack

MediTap’s inspectable surface is a **Django REST API** (`backend/`) plus an **Ionic React** SPA (`meditap-app/`), with JWT auth, PDF intake, and dependency lockfiles. Every option below can cover Python and JavaScript/TypeScript at a useful level. Differences are commercial motion and what the report is famous for.

| System | SAST | SCA | Typical commercial motion | Notes for this repo |
|--------|------|-----|---------------------------|---------------------|
| Veracode | Yes | Yes | Quote / pilot | Strongest “we were assessed” framing |
| Checkmarx | Yes | Yes | Quote / pilot | Same class of attestation as Veracode |
| Black Duck Coverity | Yes | Yes (platform) | Quote — **no reply yet** | `.github/workflows/coverity-security-scan.yml` ready once secrets exist |
| Snyk | Yes | Yes | Free tier, then per-developer plans | Fast path for npm and pip |
| SonarCloud / SonarQube | Yes (deeper taint on paid) | Limited vs dedicated SCA | Free cloud tier, then paid | Quality gate more than AppSec platform |
| GitHub CodeQL | Yes | Via Dependabot | GitHub plan | Best if validation stays inside GitHub |
| Semgrep | Yes | Paid tiers | Free CE, then per-contributor | Good custom rules; CE is not full SCA |

---

## 5. Recommended posture

1. **Do not wait on Black Duck to keep hardening.** Phases 1–3 of the local pass are already shipped. Re-run Bandit, pip-audit, and npm audit after material auth, upload, or dependency changes.
2. **Headline ask (parallel to Black Duck):** request a pilot quote from **Veracode** and **Checkmarx** with the same scope Black Duck was given: MediTap SPA + Django API, SAST + SCA, report tied to a release commit, policy of no open Critical/High.
3. **If a letter is needed before those quotes land:** start **Snyk** (or Semgrep CI) on `main` so there is a current, third-party finding set. Publish a one-page summary (date, SHA, open Critical/High count). That is Tier 2 evidence.
4. **Keep Coverity wired.** If Black Duck replies, enable the existing workflow with `COVERITY_URL` and credentials as GitHub secrets. Do not drop the other scanner until the Coverity stream is green on the same tag.
5. **Age the claim.** Treat a validation as current for roughly 6–12 months, or until auth, file upload, or production dependencies change — whichever comes first. Re-scan that tag before citing it again.

### Suggested scope line (for any vendor)

> MediTap patient portal: Ionic React SPA and Django REST API, including JWT authentication, staff elevation, PDF intake, and production dependency lockfiles. Out of scope unless added later: native store binaries, third-party EHR tenants, and infrastructure pentest of the VM.

---

## 6. What this document does not claim

- No vendor has scanned MediTap under this brief.
- No pricing was received from Black Duck, Veracode, Checkmarx, or Snyk.
- Rank order is **external recognition for a validation claim**, as of 2026-11-05, not a lab bake-off of false-positive rates.
- Local security pass results in `MT-AG-182` were later remediated in part by `MT-AG-183` and `MT-AG-185`; this file does not reopen those findings.

---

## 7. Next actions

| # | Action | Owner | Depends on |
|---|--------|-------|------------|
| 1 | Send the same pricing/pilot ask to Veracode and Checkmarx | Product / ops | This brief |
| 2 | Keep the Black Duck thread open | Product / ops | Their reply |
| 3 | Optional: add Semgrep or Snyk GitHub Action beside the Coverity workflow | Engineering | Choice of continuous tool |
| 4 | When a scan exists, file the PDF, SHA, and open-severity policy next to this document | Engineering | Vendor access |

---

## 8. Official pricing pages

Checked 2026-11-06. List prices below are what those pages showed that day. Quote-only vendors do not publish a number.

| Rank | System | Pricing page | What the page shows |
|------|--------|--------------|---------------------|
| 1 | **Veracode** | [Contact / sales](https://www.veracode.com/contact-us/) · [Request a demo](https://www.veracode.com/get-your-personalised-veracode-solution-demo/) | No public price list. `veracode.com/pricing` redirects to the platform page. Quote via sales (US 1-888-937-0329). |
| 2 | **Checkmarx** | [checkmarx.com/pricing](https://checkmarx.com/pricing/) · [Packaging / quote](https://checkmarx.com/packaging/) | Packages (Essentials, Professional, Enterprise, Start with SAST, Start with Supply Chain). Each is **Get a custom quote**. No list price on the site. |
| 3 | **Black Duck Coverity** | [Coverity get-pricing](https://www.blackduck.com/static-analysis-tools-sast/coverity/get-pricing.html) | Quote form only. Same request MediTap already sent. |
| 4 | **Snyk** | [snyk.io/plans](https://snyk.io/plans/) · [Credit rate card](https://snyk.io/policies/credit-based-billing/) | **Free** $0. **Team** $25 / month (up to 10 developers, billed monthly). **Enterprise** contact sales; credits, not a flat seat price. |
| 5 | **SonarQube Cloud** | [sonarsource.com/plans-and-pricing](https://www.sonarsource.com/plans-and-pricing/) | **Free** up to 50k private lines of code. **Team** starts at **$34 / month** (up to 100k private LOC). **Enterprise** talk to sales. |
| 5 | **SonarQube Server** (self-hosted) | [plans-and-pricing/sonarqube](https://www.sonarsource.com/plans-and-pricing/sonarqube/) | Developer and Enterprise editions, priced per instance per year by lines of code. Higher tiers are quote-based. |
| 6 | **GitHub CodeQL** | [github.com/security/plans](https://github.com/security/plans) · [Billing docs](https://docs.github.com/en/billing/concepts/product-billing/github-advanced-security) | **GitHub Code Security $30 USD** per active committer / month (CodeQL on private repos). **Secret Protection $19 USD** per active committer / month. Code scanning is free on **public** repositories. Platform seat is separate: [github.com/pricing](https://github.com/pricing). |
| 7 | **Semgrep** | [semgrep.dev/pricing](https://semgrep.dev/pricing/) · [Usage and billing](https://docs.semgrep.dev/usage-and-billing/overview) | **Free** for up to 10 contributors (Code and Supply Chain). Paid Team / Enterprise from the pricing page and in-app **Settings → Billing**. Secrets and Enterprise: sales@semgrep.com. |

### Practical read for MediTap

- **Can see a price and start without a sales call:** Snyk Team, SonarQube Cloud Team, GitHub Code Security, Semgrep Free (and Semgrep Team from the pricing page).
- **Same situation as Black Duck (form, no number):** Veracode, Checkmarx, Coverity, Sonar Enterprise, Snyk Enterprise.
