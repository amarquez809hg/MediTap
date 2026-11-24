#!/usr/bin/env python3
"""MediTap Security Findings & Remediation PDF (corporate MediTap brand layout).

Run:
  python3 docs/generate_meditap_security_pass_pdf.py

Default output:
  ~/Desktop/MediTap_Security_Findings_and_Remediation_2026-10-16.pdf
Also copies to:
  docs/MEDITAP_SECURITY_FINDINGS_AND_REMEDIATION_2026-10-16.pdf
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
OK = (21, 128, 61)

PDF_BASENAME = "MediTap_Security_Findings_and_Remediation_2026-10-16.pdf"

REPORT = {
    "report_date": "October 16, 2026",
    "doc_type": "Security Findings & Remediation",
    "audience": "Engineering / product / compliance",
    "status": "Phase 1-3 remediated (MT-AG-183)",
    "branch_note": "feature/portal-split  |  MT-AG-182 + MT-AG-183",
    "register_key": "MT-AG-182 / MT-AG-183",
}


class MediTapSecurityReport(FPDF):
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
        self.cell(120, 6, "MEDITAP  |  Security Findings & Remediation", align="L")
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
        self.cell(0, 5, "SECURITY ASSESSMENT  |  FINDINGS + FIXES", ln=1)
        self.set_x(16)
        self.set_font("Helvetica", "B", 22)
        self.set_text_color(*WHITE)
        self.cell(0, 10, "MediTap", ln=1)
        self.set_x(16)
        self.set_font("Helvetica", "", 13)
        self.cell(0, 7, "Security Findings & Remediation Report", ln=1)
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
        if style == "warn":
            fill, border = (255, 247, 237), WARN
        elif style == "ok":
            fill, border = (236, 253, 245), OK
        else:
            fill, border = (240, 247, 248), TEAL
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
            h = max(row_h, min(4.0 * max_lines + 2.5, 24))
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
    pdf = MediTapSecurityReport(orientation="P", unit="mm", format="Letter")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(16, 18, 16)
    pdf.add_page()
    pdf.cover_banner()
    pdf.meta_strip()

    pdf.callout(
        "Bottom line",
        "Local free-tool pass (Bandit, pip-audit, npm audit, Django settings/auth) found "
        "Critical/High gaps on 2026-10-14 (MT-AG-182). Phase 1-3 remediations shipped "
        "2026-10-16 (MT-AG-183). Production still needs a unique SECRET_KEY with DEBUG=0. "
        "Coverity / Black Duck remains blocked until org credentials exist.",
        style="ok",
    )

    pdf.section("1", "Executive summary")
    pdf.kpi_row(
        [
            ("Bandit High", "0 (was 3)"),
            ("pip-audit", "Clean"),
            ("npm prod", "0 vulns"),
            ("Phases done", "1-3"),
        ]
    )
    pdf.body(
        "Assessment (MT-AG-182) prioritized SEC-001 through SEC-012 for the patient portal. "
        "Remediation (MT-AG-183) closed Critical/High items in code: env SECRET_KEY, production "
        "SECURE_* / HSTS / secure cookies, DRF IsAuthenticated default, PyJWT replacing "
        "python-jose, cryptography-only SUN crypto, Epic HTTPS allow-list, and Capacitor 7.6.9."
    )
    pdf.table(
        ["Metric", "At assessment (10-14)", "After remediation (10-16)"],
        [
            ["Bandit High / Medium", "High 3  |  Medium 5", "High 0  |  Medium 0"],
            ["pip-audit", "3 vulns (python-jose, ecdsa)", "No known vulnerabilities"],
            ["npm audit (full tree)", "41 total (4 crit / 29 high)", "~10 (dev tooling only)"],
            ["npm audit --omit=dev", "Critical Capacitor path", "0 vulnerabilities"],
            ["XSS dangerouslySetInnerHTML", "None in src/", "Still none"],
        ],
        [48, 68, 68],
    )

    pdf.section("2", "Findings register (original)")
    pdf.subsection("Critical")
    pdf.table(
        ["ID", "Finding", "Recommended fix"],
        [
            [
                "SEC-001",
                "Hardcoded SECRET_KEY in settings.py",
                "Load from env only; rotate on meditap.ai",
            ],
            [
                "SEC-002",
                "@capacitor/ios critical (7.0.0-7.6.8)",
                "Bump Capacitor iOS + CLI; rebuild native app",
            ],
        ],
        [22, 82, 80],
    )
    pdf.subsection("High")
    pdf.table(
        ["ID", "Finding", "Recommended fix"],
        [
            [
                "SEC-003",
                "No SECURE_* / HSTS / secure cookies",
                "Enable when DEBUG=false behind nginx TLS",
            ],
            [
                "SEC-004",
                "DRF IsAuthenticatedOrReadOnly default",
                "Default IsAuthenticated; AllowAny only on public routes",
            ],
            [
                "SEC-005",
                "Register skipped password validators by default",
                "Enforce validators in production (DEBUG=false)",
            ],
            [
                "SEC-006",
                "python-jose CVE + ecdsa timing",
                "Replace with PyJWT; re-run pip-audit",
            ],
            [
                "SEC-007",
                "PyCrypto fallback in sun_crypto.py",
                "cryptography only; drop Crypto import",
            ],
            [
                "SEC-008",
                "41 npm audit issues (crit/high)",
                "audit fix; separate prod vs vitest/cypress",
            ],
        ],
        [22, 82, 80],
    )
    pdf.subsection("Medium / low / info")
    pdf.table(
        ["ID", "Finding", "Notes"],
        [
            ["SEC-009", "Epic urllib.urlopen without HTTPS allow-list", "SSRF hardening"],
            ["SEC-010", "Public AllowAny (card / auth / public)", "Keep minimal; no PHI"],
            ["SEC-011", "No dangerouslySetInnerHTML in src/", "Met"],
            ["SEC-012", "Docker SECRET_KEY=dev-secret", "OK locally only"],
        ],
        [22, 90, 72],
    )

    pdf.section("3", "Remediation status (MT-AG-183)")
    pdf.table(
        ["ID", "Status", "What was done"],
        [
            [
                "SEC-001",
                "Fixed in code",
                "SECRET_KEY from env; ImproperlyConfigured if missing when DEBUG=false",
            ],
            [
                "SEC-002",
                "Fixed",
                "@capacitor/ios|core|cli pinned to 7.6.9",
            ],
            [
                "SEC-003",
                "Fixed in code",
                "SECURE_SSL_REDIRECT, HSTS, SESSION/CSRF_COOKIE_SECURE, nosniff, XFO DENY",
            ],
            [
                "SEC-004",
                "Fixed",
                "REST_FRAMEWORK + BaseViewSet -> IsAuthenticated",
            ],
            [
                "SEC-005",
                "Fixed",
                "MEDITAP_REGISTER_SKIP validators default on only when DEBUG",
            ],
            [
                "SEC-006",
                "Fixed",
                "python-jose removed; PyJWT>=2.8 for elevation tokens",
            ],
            [
                "SEC-007",
                "Fixed",
                "sun_crypto.py uses cryptography AES/CMAC only",
            ],
            [
                "SEC-008",
                "Prod clean",
                "npm audit fix; prod omit=dev = 0; residual vitest/cypress/rollup",
            ],
            [
                "SEC-009",
                "Fixed",
                "medapp/safe_http.py HTTPS allow-list for Epic urlopen",
            ],
            [
                "SEC-010",
                "Accepted",
                "Public card/auth remain AllowAny by design; no PHI in public payload",
            ],
            [
                "SEC-011",
                "Met",
                "No change required",
            ],
            [
                "SEC-012",
                "Documented",
                "docker/backend.dev.env notes: prod must set unique SECRET_KEY",
            ],
        ],
        [22, 28, 134],
    )

    pdf.section("4", "Primary code paths changed")
    for b in [
        "backend/medapp/settings.py - SECRET_KEY, SECURE_*, DRF default, register validators",
        "backend/medical/views.py - BaseViewSet IsAuthenticated",
        "backend/medapp/safe_http.py + epic_* - HTTPS-only outbound HTTP",
        "backend/medapp/intake_editor.py / staff_elevation_views.py - PyJWT",
        "backend/medical/sun_crypto.py - cryptography only",
        "backend/requirements.txt - PyJWT; drop python-jose",
        "meditap-app/package.json - Capacitor 7.6.9",
    ]:
        pdf.bullet(b)

    pdf.section("5", "Secure-website checklist (post-fix)")
    pdf.table(
        ["Control", "Need", "Status"],
        [
            ["Transport", "HTTPS; no mixed content", "Ops: verify on meditap.ai"],
            ["Secrets", "No secrets in git; rotate keys", "Code ready; rotate on deploy"],
            ["AuthN", "Strong passwords in prod", "Validators enforced when DEBUG=0"],
            ["AuthZ", "PHI APIs require auth", "IsAuthenticated default shipped"],
            ["Session/JWT", "Secure cookies; blacklist", "Secure cookies when DEBUG=0"],
            ["Headers", "HSTS, nosniff, frame deny", "Enabled when DEBUG=0"],
            ["Dependencies", "Clean prod Critical/High", "pip-audit + npm prod clean"],
            ["SAST", "Bandit; Coverity when licensed", "Bandit High/Med 0; Coverity pending"],
            ["Mobile", "Capacitor origin isolation", "Capacitor 7.6.9"],
        ],
        [36, 78, 70],
    )

    pdf.section("6", "Phases and remaining work")
    pdf.subsection("Completed")
    for b in [
        "Phase 1 - Secrets & HTTPS hardening in Django settings",
        "Phase 2 - PyJWT + Capacitor 7.6.9 + npm audit fix (prod clean)",
        "Phase 3 - DRF IsAuthenticated + Epic HTTPS allow-list",
    ]:
        pdf.bullet(b)
    pdf.ln(1)
    pdf.subsection("Remaining (ops / Phase 4)")
    for b in [
        "Deploy: set unique SECRET_KEY on VM; DEBUG=0 so SECURE_* apply; rotate prior keys",
        "Confirm nginx TLS terminates correctly and forwards X-Forwarded-Proto",
        "Optional: major bumps for vitest / cypress / rollup (dev-only residual npm)",
        "Phase 4: Coverity CI when COVERITY_URL / credentials are available",
    ]:
        pdf.bullet(b)

    pdf.callout(
        "Production reminder",
        "Local/docker may keep SECRET_KEY=dev-secret with DEBUG=True. Production must never "
        "use the docker key. With DEBUG=false and a real SECRET_KEY, HSTS and secure cookies "
        "activate automatically.",
        style="warn",
    )

    pdf.section("7", "Document control")
    pdf.table(
        ["Field", "Value"],
        [
            ["Assessment register", "MT-AG-182"],
            ["Remediation register", "MT-AG-183"],
            ["Markdown source", "docs/MEDITAP_LOCAL_SECURITY_PASS_REPORT_2026-10-14.md"],
            ["Branch", "feature/portal-split"],
            ["Tools", "Bandit, pip-audit, npm audit, settings/auth review"],
            ["PDF generator", "docs/generate_meditap_security_pass_pdf.py"],
        ],
        [48, 136],
    )

    desktop = Path.home() / "Desktop" / PDF_BASENAME
    docs_copy = ROOT / "MEDITAP_SECURITY_FINDINGS_AND_REMEDIATION_2026-10-16.pdf"
    pdf.output(str(desktop))
    shutil.copy2(desktop, docs_copy)
    return desktop


if __name__ == "__main__":
    path = build()
    print(f"Wrote {path}")
    print(f"Also copied to {ROOT / 'MEDITAP_SECURITY_FINDINGS_AND_REMEDIATION_2026-10-16.pdf'}")
