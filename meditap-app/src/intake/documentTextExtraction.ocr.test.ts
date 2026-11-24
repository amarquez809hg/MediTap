import { describe, expect, it } from 'vitest';
import {
  COVER_OCR_SOFT_CHAR_BUDGET,
  MAX_PDF_OCR_PAGES,
  PDF_OCR_COVER_RENDER_SCALE,
  PDF_OCR_RENDER_SCALE,
  isSparseExtractedText,
  pageNeedsCoverOcr,
  pdfOcrRenderScaleForPage,
} from './documentTextExtraction';

describe('PDF OCR cover / page selection (MT-AG-204)', () => {
  it('raises the OCR page budget above the old 8-page cap', () => {
    expect(MAX_PDF_OCR_PAGES).toBeGreaterThanOrEqual(12);
  });

  it('uses a sharper render scale on the cover page', () => {
    expect(pdfOcrRenderScaleForPage(1)).toBe(PDF_OCR_COVER_RENDER_SCALE);
    expect(pdfOcrRenderScaleForPage(2)).toBe(PDF_OCR_RENDER_SCALE);
    expect(PDF_OCR_COVER_RENDER_SCALE).toBeGreaterThan(PDF_OCR_RENDER_SCALE);
  });

  it('flags empty / sparse pages for OCR', () => {
    expect(pageNeedsCoverOcr('')).toBe(true);
    expect(pageNeedsCoverOcr('   ')).toBe(true);
    expect(isSparseExtractedText('x'.repeat(50))).toBe(true);
    expect(pageNeedsCoverOcr('x'.repeat(50))).toBe(true);
  });

  it('flags short chrome-only covers without demographics markers', () => {
    const chrome = 'My Health Summary\nMayo Clinic\nGenerated Aug 07 2026\nPage 1 of 540';
    expect(chrome.replace(/\s/g, '').length).toBeLessThan(COVER_OCR_SOFT_CHAR_BUDGET);
    expect(pageNeedsCoverOcr(chrome)).toBe(true);
  });

  it('does not OCR short pages that already carry demographics text', () => {
    const cover = `
Patient Demographics Female; born Mar. 15, 1976
Patient Address 4821 Maple Grove Ln
Patient Name Mrs. Jane A. Smith-Doe
Communication 555-014-7788 jane.smithdoe@example.com
`;
    expect(cover.replace(/\s/g, '').length).toBeLessThan(COVER_OCR_SOFT_CHAR_BUDGET);
    expect(pageNeedsCoverOcr(cover)).toBe(false);
  });

  it('skips OCR when the text layer is already long (even without labels)', () => {
    const long = 'word '.repeat(200);
    expect(long.replace(/\s/g, '').length).toBeGreaterThan(COVER_OCR_SOFT_CHAR_BUDGET);
    expect(pageNeedsCoverOcr(long)).toBe(false);
  });
});
