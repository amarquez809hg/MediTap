#!/usr/bin/env python3
"""Export a MediTap brief Markdown file to .docx and .pdf."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from docx import Document
from docx.shared import Inches, Pt
from fpdf import FPDF
from fpdf.enums import XPos, YPos

ROOT = Path(__file__).resolve().parents[2]


def is_table_sep(line: str) -> bool:
    s = line.strip()
    if not s.startswith("|"):
        return False
    inner = s.strip("|").replace(" ", "")
    return "---" in inner and set(inner) <= {"|", "-", ":", " "}


def split_table_row(line: str) -> list[str] | None:
    line = line.rstrip("\n")
    if not line.strip().startswith("|"):
        return None
    parts = [p.strip() for p in line.strip().split("|")]
    if parts and parts[0] == "":
        parts = parts[1:]
    if parts and parts[-1] == "":
        parts = parts[:-1]
    return parts if parts else None


def strip_md_inline(text: str) -> str:
    text = text.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    # Soft-break long paths so fpdf can wrap
    text = text.replace("/", "/\u200b")
    return text


def write_line(pdf: FPDF, text: str, h: float = 4.5) -> None:
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(0, h, text, new_x=XPos.LMARGIN, new_y=YPos.NEXT)


def add_runs(p, text: str) -> None:
    if not text:
        return
    pat = re.compile(r"(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))")
    pos = 0
    for m in pat.finditer(text):
        if m.start() > pos:
            p.add_run(text[pos : m.start()])
        chunk = m.group(1)
        if chunk.startswith("**"):
            p.add_run(chunk[2:-2]).bold = True
        elif chunk.startswith("`"):
            r = p.add_run(chunk[1:-1])
            r.font.name = "Consolas"
            r.font.size = Pt(9)
        else:
            label = re.match(r"\[([^\]]+)\]", chunk)
            p.add_run(label.group(1) if label else chunk)
        pos = m.end()
    if pos < len(text):
        p.add_run(text[pos:])


def flush_table_docx(doc: Document, rows: list[list[str]]) -> None:
    if not rows:
        return
    ncols = max(len(r) for r in rows)
    t = doc.add_table(rows=len(rows), cols=ncols)
    t.style = "Table Grid"
    for ri, row in enumerate(rows):
        for ci in range(ncols):
            cell_text = row[ci] if ci < len(row) else ""
            cell = t.rows[ri].cells[ci]
            cell.text = ""
            add_runs(cell.paragraphs[0], cell_text)
    doc.add_paragraph()


def write_docx(md_path: Path, out_path: Path) -> None:
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Inches(0.85)
    section.bottom_margin = Inches(0.85)
    section.left_margin = Inches(0.9)
    section.right_margin = Inches(0.9)

    lines = md_path.read_text(encoding="utf-8").splitlines()
    table_rows: list[list[str]] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if is_table_sep(line):
            i += 1
            continue
        row = split_table_row(line)
        if row is not None:
            table_rows.append(row)
            i += 1
            # peek: if next is not a table row, flush
            if i >= len(lines) or split_table_row(lines[i]) is None:
                if i < len(lines) and is_table_sep(lines[i]):
                    i += 1
                    while i < len(lines):
                        r2 = split_table_row(lines[i])
                        if r2 is None:
                            break
                        table_rows.append(r2)
                        i += 1
                flush_table_docx(doc, table_rows)
                table_rows = []
            continue
        if table_rows:
            flush_table_docx(doc, table_rows)
            table_rows = []

        if line.startswith("# "):
            doc.add_heading(strip_md_inline(line[2:]), level=0)
        elif line.startswith("## "):
            doc.add_heading(strip_md_inline(line[3:]), level=1)
        elif line.startswith("### "):
            doc.add_heading(strip_md_inline(line[4:]), level=2)
        elif line.startswith("---"):
            doc.add_paragraph()
        elif line.startswith("- "):
            p = doc.add_paragraph(style="List Bullet")
            add_runs(p, line[2:])
        elif re.match(r"^\d+\.\s", line):
            p = doc.add_paragraph(style="List Number")
            add_runs(p, re.sub(r"^\d+\.\s", "", line))
        elif line.strip() == "":
            pass
        else:
            p = doc.add_paragraph()
            add_runs(p, line)
        i += 1

    if table_rows:
        flush_table_docx(doc, table_rows)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(out_path)


FONT_DIR_CANDIDATES = [
    Path("/System/Library/Fonts/Supplemental"),
    Path("/Library/Fonts"),
]


def resolve_font(name: str) -> Path:
    for d in FONT_DIR_CANDIDATES:
        p = d / name
        if p.is_file():
            return p
    raise FileNotFoundError(f"Font not found: {name}")


class BriefPDF(FPDF):
    footer_label = "MediTap · MT-AG-202"

    def footer(self) -> None:
        self.set_y(-12)
        self.set_font("Brief", "I", 8)
        self.set_text_color(90, 90, 90)
        self.cell(0, 8, f"{self.footer_label} · p. {self.page_no()}", align="C")


def write_pdf(md_path: Path, out_path: Path, footer_label: str | None = None) -> None:
    pdf = BriefPDF(format="Letter")
    if footer_label:
        pdf.footer_label = footer_label
    else:
        key_m = re.search(r"`(MT-AG-\d+)`", md_path.read_text(encoding="utf-8")[:800])
        if key_m:
            pdf.footer_label = f"MediTap · {key_m.group(1)}"
    pdf.set_auto_page_break(auto=True, margin=18)
    regular = resolve_font("Arial.ttf")
    bold = resolve_font("Arial Bold.ttf")
    italic = resolve_font("Arial Italic.ttf")
    pdf.add_font("Brief", "", str(regular))
    pdf.add_font("Brief", "B", str(bold))
    pdf.add_font("Brief", "I", str(italic))
    pdf.add_page()
    pdf.set_margins(18, 16, 18)

    lines = md_path.read_text(encoding="utf-8").splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        if is_table_sep(line):
            i += 1
            continue
        row = split_table_row(line)
        if row is not None:
            rows = [row]
            i += 1
            while i < len(lines):
                if is_table_sep(lines[i]):
                    i += 1
                    continue
                r2 = split_table_row(lines[i])
                if r2 is None:
                    break
                rows.append(r2)
                i += 1
            pdf.set_font("Brief", "B", 8)
            pdf.set_text_color(10, 68, 108)
            write_line(pdf, " | ".join(strip_md_inline(c) for c in rows[0]), 4.2)
            pdf.set_font("Brief", "", 8)
            pdf.set_text_color(30, 30, 30)
            for r in rows[1:]:
                write_line(pdf, " · ".join(strip_md_inline(c) for c in r), 4.0)
            pdf.ln(2)
            continue

        if line.startswith("# "):
            pdf.set_font("Brief", "B", 16)
            pdf.set_text_color(10, 68, 108)
            write_line(pdf, strip_md_inline(line[2:]), 8)
            pdf.ln(2)
        elif line.startswith("## "):
            pdf.ln(2)
            pdf.set_font("Brief", "B", 12)
            pdf.set_text_color(10, 68, 108)
            write_line(pdf, strip_md_inline(line[3:]), 6.5)
            pdf.ln(1)
        elif line.startswith("### "):
            pdf.set_font("Brief", "B", 10)
            pdf.set_text_color(28, 110, 168)
            write_line(pdf, strip_md_inline(line[4:]), 5.5)
        elif line.startswith("---"):
            pdf.ln(1)
        elif line.startswith("- "):
            pdf.set_font("Brief", "", 9)
            pdf.set_text_color(30, 30, 30)
            write_line(pdf, f"• {strip_md_inline(line[2:])}")
        elif re.match(r"^\d+\.\s", line):
            pdf.set_font("Brief", "", 9)
            pdf.set_text_color(30, 30, 30)
            write_line(pdf, strip_md_inline(line))
        elif line.strip() == "":
            pdf.ln(1.5)
        else:
            pdf.set_font("Brief", "", 9)
            pdf.set_text_color(30, 30, 30)
            write_line(pdf, strip_md_inline(line))
        i += 1

    out_path.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(out_path))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "md",
        nargs="?",
        default=str(ROOT / "docs" / "MEDITAP_OPPORTUNITY_AREAS_PDF_PORTAL_2026-11-11.md"),
    )
    args = ap.parse_args()
    md_path = Path(args.md).resolve()
    if not md_path.is_file():
        print(f"Missing markdown: {md_path}", file=sys.stderr)
        return 1
    docx_path = md_path.with_suffix(".docx")
    pdf_path = md_path.with_suffix(".pdf")
    write_docx(md_path, docx_path)
    write_pdf(md_path, pdf_path)
    print(f"Wrote {docx_path}")
    print(f"Wrote {pdf_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
