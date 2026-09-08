#!/usr/bin/env python3
"""MediTap Technical Q&A Brief PDF (Lomont/Cargo report layout + MediTap brand).

Run:
  python3 docs/generate_meditap_technical_qa_pdf.py

Output:
  docs/meditap-technical-qa-brief-2026-08-27.pdf
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / ".pdfgen"))

from fpdf import FPDF  # noqa: E402

# --- Brand: MediTap (deep teal + cyan accent) ---
NAVY = (15, 60, 90)  # #0f3c5a
TEAL = (14, 124, 134)  # #0e7c86
CYAN = (38, 198, 218)  # #26c6da
SLATE = (55, 65, 81)
MUTED = (107, 114, 128)
ROW_ALT = (245, 250, 252)
HEADER_BG = (15, 60, 90)
WHITE = (255, 255, 255)
LINE = (226, 232, 240)
WARN = (146, 64, 14)

PDF_NAME = "meditap-technical-qa-brief-2026-08-27.pdf"

REPORT = {
    "report_date": "August 27, 2026",
    "doc_type": "Technical Q&A Brief",
    "audience": "Founders / advisors / leadership",
    "status": "As-built product snapshot",
    "branch_note": "Local Docker + feature/portal-split",
}


class MediTapQaReport(FPDF):
    def header(self) -> None:
        if self.page_no() == 1:
            return
        self.set_fill_color(*NAVY)
        self.rect(0, 0, 216, 14, "F")
        self.set_fill_color(*CYAN)
        self.rect(0, 14, 216, 1.2, "F")
        self.set_xy(16, 4)
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(*WHITE)
        self.cell(120, 6, "MEDITAP  |  Technical Q&A Brief", align="L")
        self.set_font("Helvetica", "", 8)
        self.cell(0, 6, REPORT["report_date"], align="R")
        self.ln(16)
        self.set_text_color(*SLATE)

    def footer(self) -> None:
        self.set_y(-14)
        self.set_draw_color(*LINE)
        self.set_line_width(0.3)
        self.line(16, self.get_y(), 200, self.get_y())
        self.set_y(-11)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*MUTED)
        self.cell(90, 6, "Confidential  |  MediTap internal", align="L")
        self.cell(0, 6, f"Page {self.page_no()}/{{nb}}", align="R")

    def cover_banner(self) -> None:
        self.set_fill_color(*NAVY)
        self.rect(0, 0, 216, 44, "F")
        self.set_fill_color(*CYAN)
        self.rect(0, 44, 216, 2.2, "F")
        self.set_xy(16, 10)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(160, 210, 220)
        self.cell(0, 5, "PRODUCT TECHNICAL BRIEFING", ln=1)
        self.set_x(16)
        self.set_font("Helvetica", "B", 22)
        self.set_text_color(*WHITE)
        self.cell(0, 10, "MediTap", ln=1)
        self.set_x(16)
        self.set_font("Helvetica", "", 13)
        self.cell(0, 7, "Technical Q&A Brief", ln=1)
        self.set_y(52)

    def meta_strip(self) -> None:
        pairs = [
            ("Report date", REPORT["report_date"]),
            ("Document", REPORT["doc_type"]),
            ("Audience", REPORT["audience"]),
            ("Status", REPORT["status"]),
            ("Scope note", REPORT["branch_note"]),
            ("Companion MD", "meditap-technical-qa-brief-2026-08-27.md"),
        ]
        col_w = 92
        x0, y0 = 16, self.get_y()
        self.set_fill_color(*ROW_ALT)
        self.rect(16, y0, 184, 28, "F")
        for i, (label, value) in enumerate(pairs):
            col = i % 2
            row = i // 2
            x = x0 + 4 + col * col_w
            y = y0 + 3 + row * 8.2
            self.set_xy(x, y)
            self.set_font("Helvetica", "", 7.5)
            self.set_text_color(*MUTED)
            self.cell(28, 4, label.upper())
            self.set_font("Helvetica", "B", 8)
            self.set_text_color(*NAVY)
            self.cell(60, 4, value[:42])
        self.set_y(y0 + 32)

    def section(self, number: str, title: str) -> None:
        self.ln(2)
        y = self.get_y()
        if y > 248:
            self.add_page()
            y = self.get_y()
        self.set_fill_color(*TEAL)
        self.rect(16, y, 3.2, 8, "F")
        self.set_xy(22, y)
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(*NAVY)
        self.cell(0, 8, f"{number}  {title}", ln=1)
        self.ln(1.2)

    def subsection(self, title: str) -> None:
        if self.get_y() > 255:
            self.add_page()
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*TEAL)
        self.cell(0, 6, title, ln=1)
        self.set_text_color(*SLATE)

    def q(self, text: str) -> None:
        if self.get_y() > 255:
            self.add_page()
        self.set_font("Helvetica", "B", 9.5)
        self.set_text_color(*TEAL)
        self.multi_cell(184, 5, text)
        self.ln(0.5)

    def a(self, text: str) -> None:
        self.set_font("Helvetica", "", 9.2)
        self.set_text_color(*SLATE)
        self.multi_cell(184, 4.8, text)
        self.ln(1.5)

    def bullet(self, text: str) -> None:
        x = self.get_x()
        self.set_font("Helvetica", "B", 9.2)
        self.set_text_color(*CYAN)
        self.cell(5, 4.8, "-")
        self.set_font("Helvetica", "", 9.2)
        self.set_text_color(*SLATE)
        self.multi_cell(179, 4.8, text)
        self.set_x(x)

    def callout(self, label: str, text: str, warn: bool = False) -> None:
        y = self.get_y()
        if y > 245:
            self.add_page()
            y = self.get_y()
        fill = (255, 247, 237) if warn else (240, 247, 248)
        border = WARN if warn else TEAL
        self.set_fill_color(*fill)
        self.set_draw_color(*border)
        self.set_line_width(0.6)
        # Estimate height
        self.set_font("Helvetica", "", 9)
        # Draw after computing with a fixed min height; use multi_cell into a temp approach
        self.rect(16, y, 184, 18, "FD")
        self.set_xy(20, y + 2)
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(*(WARN if warn else TEAL))
        self.cell(0, 4, label.upper(), ln=1)
        self.set_x(20)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*SLATE)
        self.multi_cell(176, 4.3, text)
        # Advance below the taller of box or text
        self.set_y(max(y + 20, self.get_y() + 2))

    def table(self, headers: list[str], rows: list[list[str]], col_widths: list[float]) -> None:
        usable = 184
        if abs(sum(col_widths) - usable) > 0.5:
            col_widths = [w * usable / sum(col_widths) for w in col_widths]
        row_h = 6.8
        if self.get_y() + row_h * (len(rows) + 1) + 4 > 262:
            self.add_page()

        self.set_font("Helvetica", "B", 8)
        self.set_fill_color(*HEADER_BG)
        self.set_text_color(*WHITE)
        x = 16
        y = self.get_y()
        for i, h in enumerate(headers):
            self.set_xy(x, y)
            self.cell(col_widths[i], row_h, f"  {h}", fill=True)
            x += col_widths[i]
        y += row_h

        self.set_font("Helvetica", "", 7.8)
        for r_i, row in enumerate(rows):
            # Wrap-aware row height (simple single-line clamp)
            if y + row_h > 262:
                self.add_page()
                y = self.get_y()
                self.set_font("Helvetica", "B", 8)
                self.set_fill_color(*HEADER_BG)
                self.set_text_color(*WHITE)
                x = 16
                for i, h in enumerate(headers):
                    self.set_xy(x, y)
                    self.cell(col_widths[i], row_h, f"  {h}", fill=True)
                    x += col_widths[i]
                y += row_h
                self.set_font("Helvetica", "", 7.8)
            fill = r_i % 2 == 0
            self.set_fill_color(*(ROW_ALT if fill else WHITE))
            self.set_text_color(*SLATE)
            x = 16
            for i, cell in enumerate(row):
                self.set_xy(x, y)
                self.cell(col_widths[i], row_h, f"  {cell[:70]}", fill=True)
                x += col_widths[i]
            y += row_h
        self.set_y(y + 3)


def build() -> Path:
    pdf = MediTapQaReport(orientation="P", unit="mm", format="Letter")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(16, 16, 16)
    pdf.add_page()
    pdf.cover_banner()
    pdf.meta_strip()

    pdf.callout(
        "Bottom line",
        "MediTap today is a working dual-portal chart product: patient user portal "
        "(appointments, labs, insurance, conditions, incidents, meds/allergies, intake) "
        "plus clinic admin portal (patients, charts, hospitals, documents, activity), "
        "with multi-EHR PDF intake as a chart-feeding capability. Not yet a production EHR "
        "connector, HIPAA certification claim, or LLM clinical engine.",
    )

    # Snapshot table
    pdf.section("0", "Executive snapshot")
    pdf.table(
        ["Topic", "One-line answer"],
        [
            ["What exists", "User + admin portals; live chart APIs; PDF intake"],
            ["User portal", "Dashboard, appts, labs, insurance, conditions, intake"],
            ["Admin portal", "Staff login, patients, charts, hospitals, docs"],
            ["Not done yet", "Prod EHR write-back; full audit; live NFC registry"],
            ["OCR / LLMs", "Tesseract.js yes; no LLM in intake"],
            ["Safe claims", "No HIPAA cert / clinical % / live EHR sync yet"],
        ],
        [48, 136],
    )

    # Section 1
    pdf.section("1", "Current product / what we've built")
    pdf.q("Q: What have we actually built and successfully tested?")
    pdf.a(
        "Lead with the working product - not only recent PDF fixtures."
    )
    pdf.subsection("User portal (patient-facing)")
    for b in [
        "Dashboard + Quick Status with next steps",
        "Appointments - cards/modal + Django appointments API",
        "Chronic conditions + incidents/hospital visits (API + staff quick-pick)",
        "Lab results (PatientLabPanel API) + insurance/payers",
        "Patient intake with medications & allergies; Save to API",
        "Settings; JWT login; staff elevation for kiosk edits",
    ]:
        pdf.bullet(b)
    pdf.ln(1)
    pdf.subsection("Admin portal (clinic staff - working, not a stub)")
    for b in [
        "Staff login door; patients blocked from admin routes",
        "Patient search/hub + clinical charts + embedded patient view",
        "On-behalf intake, labs, appointments, insurance for selected patient",
        "Hospitals CRUD; document vault/review queue; activity trail",
        "Epic sandbox panel (partial - not production sync)",
    ]:
        pdf.bullet(b)
    pdf.ln(1)
    pdf.subsection("PDF intake (feeds the chart; not the whole product)")
    pdf.a(
        "EHR source selector + pdf.js/Tesseract + Athena/MEDITECH/Epic/Generic parsers + "
        "Accept/Reject gates. Fixture corpora (>=90-95% section completeness on locked demo PDFs) "
        "are a parser regression loop - they do not define the whole product."
    )
    pdf.q("Q: Functional vs planned?")
    pdf.table(
        ["Functional today", "Partial / in progress", "Planned / do not claim"],
        [
            ["User portal chart surfaces", "Portal polish", "Prod multi-tenant EHR sync"],
            ["Admin portal ops shell", "On-behalf polish / queues", "Full HIPAA audit product"],
            ["Chart CRUD + staff elevation", "Tab14 API-only cleanup", "LLM understanding"],
            ["PDF/OCR + dialects", "NextGen + broader corpus", "Live NFC card registry"],
            ["Document vault v1", "Apply-to-chart polish", "Certified EHR write-back"],
        ],
        [62, 62, 60],
    )
    pdf.q("Q: Languages?")
    pdf.a("TypeScript/JavaScript (SPA + parsers), Python (Django), SQL (Postgres), Docker/shell.")
    pdf.q("Q: Frameworks / libraries?")
    pdf.a(
        "React 19, Ionic React 8, Vite, React Router, i18next, pdf.js, Tesseract.js; Django + DRF + "
        "SimpleJWT; Vitest/ESLint; Capacitor packaging path."
    )
    pdf.q("Q: Tech stack?")
    pdf.table(
        ["Layer", "Choice"],
        [
            ["Frontend", "Ionic React + Vite SPA"],
            ["Backend", "Django REST (medapp + medical)"],
            ["Database", "PostgreSQL 16"],
            ["Auth", "Django JWT + staff elevation token"],
            ["Files", "PatientDocument FileField + parse_snapshot JSON"],
            ["Hosting (dev/demo)", "Docker Compose; GCP VM notes for demos"],
            ["OCR / AI", "Tesseract.js / no LLM in intake"],
        ],
        [48, 136],
    )
    pdf.q("Q: What does each technical team member handle?")
    pdf.a(
        "In-repo ownership highlights Antonio for product continuity / intake direction. "
        "Replace with a named org chart before external investor use: frontend (meditap-app), "
        "backend (Django), infra/Docker as assigned."
    )
    pdf.q("Q: What does the backend actually do? (simple)")
    pdf.callout(
        "Elevator answer",
        "The backend is MediTap's system of record and security gate: it authenticates patients "
        "and staff, stores structured chart data (appointments, labs, meds/allergies, insurance, "
        "conditions, incidents, demographics, documents), and exposes REST APIs both portals use. "
        "PDF understanding mostly runs in the browser; the API persists results.",
    )

    # Section 2
    pdf.section("2", "Medical record upload & processing")
    pdf.a(
        "PDF intake feeds the working chart. Appointments, labs, insurance, and other portal "
        "features already work as first-class API-backed surfaces with or without an upload."
    )
    pdf.q("Q: What happens on upload?")
    for b in [
        "Select EHR source on Tab14.",
        "Upload PDF or image.",
        "Browser extracts text (pdf.js); OCR sparse/image pages (Tesseract.js).",
        "Dialect/general parsers fill structured fields.",
        "User Accepts/Rejects flagged imports; optional completeness hints.",
        "Save / document APIs persist to Postgres (+ keep original file in vault).",
    ]:
        pdf.bullet(b)
    pdf.ln(1)
    pdf.q("Q: How do we extract? OCR? LLMs?")
    pdf.a(
        "Native PDF text when available; Tesseract.js OCR for images/sparse pages; "
        "vendor-specific heuristic parsers. No ChatGPT-style LLMs in the intake path today."
    )
    pdf.q("Q: What can we extract?")
    pdf.a(
        "Demographics, care team, allergies, meds, problems, labs/results, vitals, procedures, "
        "immunizations, encounters, payers, social/functional/mental status, histories, notes, "
        "PoT, and Athena-oriented extras when present - quality depends on the export."
    )
    pdf.q("Q: Who decides meaning / storage / originals?")
    pdf.a(
        "Frontend parsers map text to MediTap fields; backend validates auth and stores typed "
        "models in PostgreSQL. Originals retained as PatientDocument (not auto-deleted). "
        "Production retention policy is still a compliance design item."
    )

    # Section 3
    pdf.section("3", "Accuracy / validation")
    pdf.q("Q: How do we keep extraction accurate?")
    pdf.a(
        "Vendor parsers + fixture corpus tests + Accept/Reject gates + staff-only clinical edits. "
        "Blurry/handwritten/odd layouts degrade OCR; unsure fields stay empty or flagged."
    )
    pdf.q("Q: Confidence scores?")
    pdf.a(
        "Today: section completeness / portability coverage scores - not clinical per-field "
        "probability. True confidence scoring is optional future work."
    )
    pdf.q("Q: Human verification before EHR?")
    pdf.a(
        "Yes in product design (patient + staff review). EHR write-back is not live, so nothing "
        "auto-enters Epic/Cerner/athena today."
    )
    pdf.q("Q: What accuracy numbers can I safely mention?")
    pdf.callout(
        "Safe wording",
        "On locked demo fixtures, automated section-completeness gates are typically >=90-95% "
        "for Athena / MEDITECH / Epic training PDFs. Do NOT claim published clinical accuracy, "
        "FDA clearance, or physician-grade charting quality.",
        warn=True,
    )

    # Section 4
    pdf.section("4", "EHR integration / future")
    pdf.q("Q: What still needs to be built for EHR integration?")
    pdf.a(
        "Production OAuth/SMART, FHIR client + tokens on the MediTap server, resource mapping, "
        "sync/conflict/provenance, BAAs and customer enablement, reviewed write-back UI. "
        "See docs/epic-fhir-meditap-integration-report.md."
    )
    pdf.q("Q: FHIR in simple terms?")
    pdf.a(
        "A shared web language for health data - standardized JSON-style resources for patient, "
        "meds, labs, allergies - so apps and EHRs exchange chart pieces without a private format each time."
    )
    pdf.q("Q: Other standards? Convert to FHIR before send?")
    pdf.a(
        "Also SMART/OAuth, CCD/C-CDA (already parsed), and planned terminology (RxNorm/SNOMED/LOINC). "
        "For FHIR EHRs: yes - map MediTap models to FHIR resources before API send. Intake today maps PDF to MediTap models first."
    )
    pdf.q("Q: One integration or many?")
    pdf.a(
        "Shared architecture with per-vendor adapters. Needs practice/EHR permission. Barriers: "
        "enablement, scopes, identity binding, write limits, capability variance, PHI liability."
    )
    pdf.q("Q: Why can't Epic already do this? / vs uploading a PDF?")
    pdf.a(
        "EHRs excel inside their network; patients still arrive with outside PDFs/CCDs. "
        "Uploading a PDF is often a file blob. MediTap aims for discrete, reviewable fields and a later FHIR handoff - not an unparsed attachment."
    )

    # Section 5
    pdf.section("5", "Security / patient data")
    pdf.q("Q: How is PHI protected today?")
    pdf.a(
        "API authz, staff elevation, portal split. Production needs HTTPS, rotated secrets, "
        "hosting controls. Transit: TLS in real deploys. At rest: rely on host/cloud disk encryption when configured - not 'every column HSM-encrypted' as a current claim."
    )
    pdf.q("Q: What/where stored? Auth? Audit? Card?")
    pdf.a(
        "Structured chart + documents in MediTap Postgres/media. Patients use JWT accounts; staff use admin login and/or elevation. Starter AdminActivityEvent exists - not a full HIPAA audit product. "
        "NFC/RFID card should identify/authenticate only; PHI stays on servers. Card lost/inactive UI is demo status today - not a live kill registry."
    )
    pdf.callout(
        "Do NOT claim yet",
        "HIPAA certified/compliant without counsel attestation; fully integrated with Epic/Cerner/athena; "
        "AI diagnoses; clinical extraction accuracy % beyond fixtures; PHI on the physical card; live multi-clinic card kill-switch.",
        warn=True,
    )

    # Section 6
    pdf.section("6", "Competitive / technical moat")
    pdf.q("Q: What is hard / unique / hardest to copy?")
    pdf.a(
        "Multi-vendor dialect engineering under real export chaos; patient-mediated intake with Accept/Reject + staff elevation; path from documents to structured chart to future FHIR. "
        "Hardest to copy: accumulated parsers + regression corpora + workflow gates - not 'call OCR on a PDF.'"
    )
    pdf.q("Q: Biggest technical advantage?")
    pdf.callout(
        "Engineering view",
        "A working dual portal (patient + admin) with live chart APIs, plus the ability to "
        "bootstrap that chart from messy real EHR exports across major vendors - with humans "
        "in the loop and a clear FHIR path. Harder than a PDF vault or a FHIR hello-world alone.",
    )

    pdf.section("7", "30-second close")
    for b in [
        "Working user portal + working admin portal today - appts, labs, insurance, conditions, meds/allergies, intake.",
        "PDF intake feeds that chart: upload -> pdf.js + Tesseract -> vendor parsers -> Accept/Reject -> Postgres.",
        "No LLMs in extraction today; FHIR is the planned EHR bridge.",
        "Accuracy guarded by fixtures + humans - not marketing percentages.",
        "Demo completeness != clinical certification; sandbox != production EHR.",
    ]:
        pdf.bullet(b)

    out = ROOT / PDF_NAME
    pdf.output(str(out))
    return out


if __name__ == "__main__":
    path = build()
    print(f"Wrote {path}")
