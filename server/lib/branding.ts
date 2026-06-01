import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  Header,
  Footer,
  Paragraph,
  TextRun,
  ImageRun,
  PageNumber,
  BorderStyle,
  TabStopType,
  TabStopPosition,
  ShadingType,
  type IStylesOptions,
} from "docx";

/**
 * The Founders Office — document branding.
 *
 * Single source of truth for TFO brand identity applied to every .docx the
 * platform generates. Translated from Katie's `founders-office-branding.skill`
 * (authored for the hosted skills sandbox) into the `docx` library this app
 * actually uses. Both agendaDocx.ts and deliverableDocx.ts build on these
 * helpers so branding never drifts between document types.
 */

// ── Colors (docx wants hex WITHOUT the leading #) ─────────────────────────────
export const OLIVE = "505A1E"; // primary — titles, section headings, accents
export const GOLD = "BF9C42"; // secondary accent — dividers, highlights
export const BODY_GRAY = "333333"; // body text on light backgrounds
export const LIGHT_GRAY = "F5F5F5"; // alternate row fills / subtle backgrounds
export const WHITE = "FFFFFF";

// ── Typography ────────────────────────────────────────────────────────────────
export const BRAND_FONT = "Calibri"; // Arial is the Word fallback
// docx sizes are half-points: 22 = 11pt body, 48 = 24pt H1, 28 = 14pt H2, 24 = 12pt H3, 18 = 9pt footer.

// ── Required copyright (every deliverable) ────────────────────────────────────
export const COPYRIGHT = "© The Founders Office 2026";

// ── Logo assets (bundled into the repo from the skill; never fetched remotely) ─
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BRANDING_DIR = path.join(__dirname, "..", "assets", "branding");
export const LOGO_COLOR = path.join(BRANDING_DIR, "logo-color.png"); // default, light backgrounds
export const LOGO_WHITE = path.join(BRANDING_DIR, "logo-white.png"); // dark backgrounds
export const LOGO_ON_BLACK = path.join(BRANDING_DIR, "logo-on-black.png");

// Native logo is 5686×1416 (≈4.016:1). Scale to ~150px wide for the header.
const LOGO_WIDTH = 150;
const LOGO_HEIGHT = Math.round(LOGO_WIDTH / 4.016); // ≈37

// Read the logo once at module load. If it's missing, the skill bundle is
// incomplete — surface that loudly rather than silently shipping unbranded docs.
let logoBuffer: Buffer | null = null;
try {
  logoBuffer = fs.readFileSync(LOGO_COLOR);
} catch {
  console.error(
    `[branding] Logo asset not found at ${LOGO_COLOR}. The Founders Office branding ` +
      `skill bundle is incomplete — re-extract logo-color.png. Documents will be ` +
      `generated without a header logo.`
  );
}

/**
 * Document styles: Calibri body in dark gray, olive Calibri-bold headings.
 * Pass to `new Document({ styles: brandDocStyles(), ... })`.
 */
export function brandDocStyles(): IStylesOptions {
  return {
    default: {
      document: {
        run: { font: BRAND_FONT, size: 22, color: BODY_GRAY },
      },
      heading1: {
        run: { font: BRAND_FONT, bold: true, color: OLIVE, size: 48 },
        paragraph: { spacing: { before: 240, after: 120 } },
      },
      heading2: {
        run: { font: BRAND_FONT, bold: true, color: OLIVE, size: 28 },
        paragraph: { spacing: { before: 200, after: 80 } },
      },
      heading3: {
        run: { font: BRAND_FONT, bold: true, color: OLIVE, size: 24 },
        paragraph: { spacing: { before: 160, after: 60 } },
      },
    },
  };
}

/**
 * Branded page header: color logo top-left with a thin olive accent line beneath.
 * Pass to a section as `headers: { default: brandHeader() }`.
 */
export function brandHeader(): Header {
  const children: Paragraph[] = [];

  if (logoBuffer) {
    children.push(
      new Paragraph({
        spacing: { after: 60 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: OLIVE, space: 6 },
        },
        children: [
          new ImageRun({
            type: "png",
            data: logoBuffer,
            transformation: { width: LOGO_WIDTH, height: LOGO_HEIGHT },
          }),
        ],
      })
    );
  } else {
    // No logo available — still draw the olive accent line so the header reads as branded.
    children.push(
      new Paragraph({
        spacing: { after: 60 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: OLIVE, space: 6 },
        },
        children: [
          new TextRun({ text: "The Founders Office", bold: true, color: OLIVE, font: BRAND_FONT }),
        ],
      })
    );
  }

  return new Header({ children });
}

/**
 * Branded page footer (required on every page): copyright left, page number right.
 * Pass to a section as `footers: { default: brandFooter() }`.
 */
export function brandFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        border: {
          top: { style: BorderStyle.SINGLE, size: 4, color: GOLD, space: 6 },
        },
        children: [
          new TextRun({ text: COPYRIGHT, font: BRAND_FONT, size: 18, color: BODY_GRAY }),
          new TextRun({
            children: ["\t", PageNumber.CURRENT],
            font: BRAND_FONT,
            size: 18,
            color: BODY_GRAY,
          }),
        ],
      }),
    ],
  });
}

/**
 * Shared shading for table header cells: olive fill (use with white bold text).
 * No generator emits tables today, but the skill requires this styling — exposed
 * here so any future table renders on-brand without re-deriving the values.
 */
export const brandTableHeaderShading = {
  type: ShadingType.SOLID,
  color: OLIVE,
  fill: OLIVE,
};
