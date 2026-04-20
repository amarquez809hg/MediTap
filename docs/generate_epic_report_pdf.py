#!/usr/bin/env python3
"""Build epic-fhir-meditap-integration-report.pdf from the Markdown source (no Chromium)."""
from __future__ import annotations

import re
import sys
from pathlib import Path

# Local deps from: python3 -m pip install fpdf2 --target docs/.pdfgen
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / ".pdfgen"))

from fpdf import FPDF  # noqa: E402


def to_ascii(text: str) -> str:
    """Keep PDF portable with core Helvetica (ASCII)."""
    return (
        text.replace("\u2014", "-")
        .replace("\u2013", "-")
        .replace("\u2194", "<->")
        .replace("\u2022", "*")
        .replace("\u2192", "->")
        .encode("ascii", "replace")
        .decode("ascii")
    )


def strip_md_inline(s: str) -> str:
    s = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", s)
    s = re.sub(r"`([^`]+)`", r"\1", s)
    return s


def main() -> None:
    md_path = ROOT / "epic-fhir-meditap-integration-report.md"
    out_path = ROOT / "epic-fhir-meditap-integration-report.pdf"
    text = md_path.read_text(encoding="utf-8")

    pdf = FPDF(orientation="P", unit="mm", format="Letter")
    pdf.set_margins(18, 18, 18)
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()
    pdf.set_font("Helvetica", size=10.5)
    line_h = 5.2

    left = pdf.l_margin

    for raw in text.splitlines():
        line = strip_md_inline(raw.rstrip())
        line = to_ascii(line)
        if not line:
            pdf.ln(line_h * 0.35)
            continue
        if line.startswith("|") and "---" in line.replace(" ", ""):
            continue
        if set(line.strip()) <= {"|", "-", " "} and "|" in line:
            continue
        if line.startswith("|"):
            line = line.replace("|", "  ").strip()

        pdf.set_x(left)

        if line.startswith("# "):
            pdf.set_font("Helvetica", "B", 15)
            pdf.multi_cell(0, 7.5, line[2:].strip())
            pdf.set_font("Helvetica", size=10.5)
            continue
        if line.startswith("## "):
            pdf.set_font("Helvetica", "B", 12.5)
            pdf.multi_cell(0, 6.2, line[3:].strip())
            pdf.set_font("Helvetica", size=10.5)
            continue
        if line.startswith("### "):
            pdf.set_font("Helvetica", "B", 11)
            pdf.multi_cell(0, 5.8, line[4:].strip())
            pdf.set_font("Helvetica", size=10.5)
            continue
        if line.startswith("---"):
            pdf.ln(2)
            pdf.set_draw_color(180, 180, 180)
            pdf.line(18, pdf.get_y(), pdf.w - 18, pdf.get_y())
            pdf.ln(4)
            continue
        if line.startswith("* ") or line.startswith("- "):
            pdf.set_x(left + 4)
            pdf.multi_cell(0, line_h, "- " + line[2:].strip())
            pdf.set_x(left)
            continue
        if re.match(r"^\d+\.\s", line):
            pdf.multi_cell(0, line_h, line)
            continue

        pdf.multi_cell(0, line_h, line)

    pdf.output(str(out_path))
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
