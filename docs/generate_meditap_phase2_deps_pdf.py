#!/usr/bin/env python3
"""MediTap Phase 2 Dependency Upgrade Report PDF (corporate brand layout).

Run:
  python3 docs/generate_meditap_phase2_deps_pdf.py

Default output:
  ~/Desktop/MediTap_Phase2_Dependency_Upgrades_2026-10-16.pdf
Also copies to:
  docs/MEDITAP_PHASE2_DEPENDENCY_UPGRADES_2026-10-16.pdf
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / ".pdfgen"))

try:
    from fpdf import FPDF
except ImportError:
    print("Install fpdf2 into docs/.pdfgen or: pip install fpdf2", file=sys.stderr)
    raise

NAVY = (15, 60, 90)
TEAL = (14, 124, 134)
CYAN = (38, 198, 218)
SLATE = (55, 65, 81)
MUTED = (107, 114, 128)
ROW_ALT = (245, 250, 252)
HEADER_BG = (15, 60, 90)
WHITE = (255, 255, 255)
LINE = (226, 232, 240)
OK = (21, 128, 61)

PDF_BASENAME = "MediTap_Phase2_Dependency_Upgrades_2026-10-16.pdf"

REPORT = {
    "report_date": "October 16, 2026",
    "doc_type": "Phase 2 Dependency Upgrades",
    "audience": "Engineering / product / compliance",
    "status": "Complete - npm audit 0",
    "branch_note": "feature/portal-split  |  MT-AG-185",
    "register_key": "MT-AG-185",
}


class MediTapPhase2Report(FPDF):
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
        self.cell(120, 6, "MEDITAP  |  Phase 2 Dependency Upgrades", align="L")
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
        self.cell(0, 5, "SECURITY REMEDIATION  |  PHASE 2", ln=1)
        self.set_x(16)
        self.set_font("Helvetica", "B", 22)
        self.set_text_color(*WHITE)
        self.cell(0, 10, "MediTap", ln=1)
        self.set_x(16)
        self.set_font("Helvetica", "", 13)
        self.cell(0, 7, "Phase 2 Dependency Upgrade Report", ln=1)
        self.set_y(52)

    def meta_strip(self) -> None:
        pairs = [
            ("Report date", REPORT["report_date"]),
            ("Document", REPORT["doc_type"]),
            ("Audience", REPORT["audience"]),
            ("Status", REPORT["status"]),
            ("Register", REPORT["register_key"]),
            ("Scope note", REPORT["branch_note"]),
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
            self.cell(60, 4, value[:44])
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

    def body(self, text: str) -> None:
        self.set_font("Helvetica", "", 9.2)
        self.set_text_color(*SLATE)
        self.multi_cell(184, 4.8, text)
        self.ln(1.2)

    def bullet(self, text: str) -> None:
        x = self.get_x()
        self.set_font("Helvetica", "B", 9.2)
        self.set_text_color(*CYAN)
        self.cell(5, 4.8, "-")
        self.set_font("Helvetica", "", 9.2)
        self.set_text_color(*SLATE)
        self.multi_cell(179, 4.8, text)
        self.set_x(x)

    def callout(self, label: str, text: str, *, style: str = "info") -> None:
        y = self.get_y()
        if y > 245:
            self.add_page()
            y = self.get_y()
        fill, border = ((236, 253, 245), OK) if style == "ok" else ((240, 247, 248), TEAL)
        self.set_fill_color(*fill)
        self.set_draw_color(*border)
        self.set_line_width(0.6)
        self.rect(16, y, 184, 22, "FD")
        self.set_xy(20, y + 2)
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(*border)
        self.cell(0, 4, label.upper(), ln=1)
        self.set_x(20)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*SLATE)
        self.multi_cell(176, 4.3, text)
        self.set_y(max(y + 24, self.get_y() + 2))

    def kpi_row(self, items: list[tuple[str, str]]) -> None:
        if self.get_y() > 250:
            self.add_page()
        y = self.get_y()
        n = len(items)
        w = 184 / n
        for i, (label, value) in enumerate(items):
            x = 16 + i * w
            self.set_fill_color(*ROW_ALT)
            self.rect(x + 1, y, w - 2, 16, "F")
            self.set_xy(x + 3, y + 2)
            self.set_font("Helvetica", "", 7)
            self.set_text_color(*MUTED)
            self.cell(w - 6, 4, label.upper())
            self.set_xy(x + 3, y + 7)
            self.set_font("Helvetica", "B", 11)
            self.set_text_color(*NAVY)
            self.cell(w - 6, 6, value)
        self.set_y(y + 20)

    def table(self, headers: list[str], rows: list[list[str]], col_widths: list[float]) -> None:
        usable = 184.0
        if abs(sum(col_widths) - usable) > 0.5:
            col_widths = [w * usable / sum(col_widths) for w in col_widths]
        row_h = 7.2
        if self.get_y() + row_h * 2 + 4 > 262:
            self.add_page()

        def draw_header(y: float) -> float:
            self.set_font("Helvetica", "B", 7.5)
            self.set_fill_color(*HEADER_BG)
            self.set_text_color(*WHITE)
            x = 16
            for i, h in enumerate(headers):
                self.set_xy(x, y)
                self.cell(col_widths[i], row_h, f"  {h}", fill=True)
                x += col_widths[i]
            return y + row_h

        y = draw_header(self.get_y())
        self.set_font("Helvetica", "", 7.2)
        for r_i, row in enumerate(rows):
            max_lines = 1
            for i, cell in enumerate(row):
                chars = max(1, int(col_widths[i] / 1.55))
                max_lines = max(max_lines, max(1, (len(cell) + chars - 1) // chars))
            h = max(row_h, min(4.0 * max_lines + 2.5, 22))
            if y + h > 262:
                self.add_page()
                y = draw_header(self.get_y())
                self.set_font("Helvetica", "", 7.2)
            fill = r_i % 2 == 0
            self.set_fill_color(*(ROW_ALT if fill else WHITE))
            self.set_text_color(*SLATE)
            x = 16
            for i in range(len(headers)):
                self.set_xy(x, y)
                self.cell(col_widths[i], h, "", fill=True)
                x += col_widths[i]
            x = 16
            for i, cell in enumerate(row):
                self.set_xy(x + 1.5, y + 1.2)
                self.multi_cell(col_widths[i] - 3, 3.6, cell)
                x += col_widths[i]
            y += h
        self.set_y(y + 3)


def build() -> Path:
    pdf = MediTapPhase2Report(orientation="P", unit="mm", format="Letter")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(16, 18, 16)
    pdf.add_page()
    pdf.cover_banner()
    pdf.meta_strip()

    pdf.callout(
        "Bottom line",
        "Phase 2 closed the residual npm Critical/High findings left after Capacitor 7.6.9 "
        "(MT-AG-183). Vite 6, Vitest 5, Cypress 16, and a patched rollup override brought "
        "full-tree npm audit to zero. Unit smoke tests and production build passed.",
        style="ok",
    )

    pdf.section("1", "Executive summary")
    pdf.kpi_row(
        [
            ("npm audit", "0 vulns"),
            ("Vite", "6.4.x"),
            ("Vitest", "5.0.5"),
            ("Cypress", "16.2"),
        ]
    )
    pdf.body(
        "Security remediation Phase 2 targeted frontend toolchain dependencies that remained "
        "vulnerable after Phase 1 (secrets/HTTPS) and the first dependency pass (PyJWT, "
        "Capacitor). These packages are primarily developer/build tooling, but clearing them "
        "removes Critical tinypool and High rollup/extract-zip paths from the lockfile."
    )

    pdf.section("2", "Context in the remediation program")
    pdf.table(
        ["Phase", "Focus", "Status"],
        [
            ["Phase 1", "SECRET_KEY, SECURE_*, password validators", "Done (MT-AG-183)"],
            ["Phase 2", "Python jose + Capacitor + npm toolchain", "Done (MT-AG-183/185)"],
            ["Phase 3", "DRF IsAuthenticated + Epic HTTPS allow-list", "Done (MT-AG-183)"],
            ["Phase 4", "Coverity / Black Duck CI", "Pending credentials"],
        ],
        [32, 90, 62],
    )

    pdf.section("3", "Issues addressed in this change")
    pdf.table(
        ["Advisory area", "Before", "Resolution"],
        [
            [
                "tinypool (Critical)",
                "Vitest 0.34 pulled vulnerable tinypool",
                "Vitest 5.0.5 (no vulnerable tinypool path)",
            ],
            [
                "rollup (High)",
                "Vite 5.2 / override 4.44.0 in vulnerable range",
                "Vite 6.4.4 + rollup override 4.64.7",
            ],
            [
                "extract-zip / uuid (High/Mod)",
                "Cypress 13 tree",
                "Cypress 16.2.0",
            ],
            [
                "qs (Moderate)",
                "Transitive in audit tree",
                "Cleared with toolchain refresh + audit re-run",
            ],
        ],
        [42, 72, 70],
    )

    pdf.section("4", "Package version changes")
    pdf.table(
        ["Package", "From", "To"],
        [
            ["vite", "~5.2.0", "^6.4.4"],
            ["vitest", "^0.34.6", "^5.0.5"],
            ["cypress", "^13.5.0", "^16.2.0"],
            ["@vitejs/plugin-legacy", "^5.0.0", "^6.1.1"],
            ["@vitejs/plugin-react", "^4.0.1", "^4.7.0"],
            ["jsdom", "^22.1.0", "^26.1.0"],
            ["terser", "^5.4.0", "^5.16.0"],
            ["overrides.rollup", "4.44.0", "4.64.7"],
            ["@capacitor/* (prior Phase 2)", "7.6.8 path", "7.6.9 (MT-AG-183)"],
            ["python-jose (prior Phase 2)", "CVE path", "Replaced by PyJWT (MT-AG-183)"],
        ],
        [58, 52, 74],
    )

    pdf.section("5", "Code / config updates")
    for b in [
        "meditap-app/package.json - version bumps and rollup override",
        "meditap-app/package-lock.json - regenerated via npm install",
        "meditap-app/vite.config.ts - defineConfig from vitest/config (Vitest 5)",
    ]:
        pdf.bullet(b)

    pdf.section("6", "Verification")
    pdf.table(
        ["Check", "Result"],
        [
            ["npm audit (full tree)", "0 vulnerabilities"],
            ["npm audit --omit=dev", "0 vulnerabilities"],
            ["Unit smoke (29 tests across 4 files)", "Passed under Vitest 5.0.5"],
            ["npm run build (tsc + vite)", "Succeeded (~1m 23s)"],
        ],
        [92, 92],
    )
    pdf.body(
        "Sample unit files: tab14PortabilitySections, epicPatientDemographics, "
        "portalGoBack, api.portalEmail. Full corpus not re-run in this pass; smoke coverage "
        "confirmed Vitest 5 + jsdom 26 compatibility."
    )

    pdf.section("7", "Risk notes")
    for b in [
        "Vite 5 to 6 and Vitest 0.34 to 5 are major upgrades; local and CI workflows should use the new majors.",
        "Cypress 16 may need e2e script review if CI runs test.e2e; config API used (defineConfig e2e) remains valid.",
        "Chunk-size warnings during build are pre-existing size guidance, not security regressions.",
    ]:
        pdf.bullet(b)

    pdf.section("8", "Document control")
    pdf.table(
        ["Field", "Value"],
        [
            ["Register key", "MT-AG-185"],
            ["Related assessment", "MT-AG-182 (findings) / MT-AG-183 (Phase 1-3 code)"],
            ["Companion PDF (findings+fixes)", "MediTap_Security_Findings_and_Remediation_2026-10-16.pdf"],
            ["Markdown changelog", "docs/AGENT_SESSION_CHANGELOG.md entry 189"],
            ["Branch", "feature/portal-split"],
            ["PDF generator", "docs/generate_meditap_phase2_deps_pdf.py"],
        ],
        [52, 132],
    )

    desktop = Path.home() / "Desktop" / PDF_BASENAME
    docs_copy = ROOT / "MEDITAP_PHASE2_DEPENDENCY_UPGRADES_2026-10-16.pdf"
    pdf.output(str(desktop))
    shutil.copy2(desktop, docs_copy)
    return desktop


if __name__ == "__main__":
    path = build()
    print(f"Wrote {path}")
    print(f"Also copied to {ROOT / 'MEDITAP_PHASE2_DEPENDENCY_UPGRADES_2026-10-16.pdf'}")
