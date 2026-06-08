import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
} from "docx";
import { brandDocStyles, brandHeader, brandFooter, BODY_GRAY } from "./branding.js";

export interface AgendaItemInput {
  text: string;
  source?: string;
}

export interface AgendaSectionInput {
  title: string;
  items: AgendaItemInput[];
}

export interface AgendaDocxInput {
  clientName: string;
  meetingType: string;
  meetingDate: string;
  sections: AgendaSectionInput[];
}

/**
 * Build a .docx Buffer for an agenda. Headings + bulleted items with optional
 * italic context lines beneath each item. Designed to open cleanly in
 * Google Docs and Word.
 */
export async function buildAgendaDocx(input: AgendaDocxInput): Promise<Buffer> {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({ text: `Meeting Agenda — ${input.meetingType}`, bold: true }),
      ],
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: input.clientName, bold: true }),
        new TextRun({ text: `  ·  ${input.meetingDate}` }),
      ],
      spacing: { after: 240 },
    })
  );

  input.sections.forEach((section, sIdx) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({ text: `${sIdx + 1}. ${section.title}`, bold: true }),
        ],
      })
    );

    if (section.items.length === 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "(No items)", italics: true, color: BODY_GRAY }),
          ],
        })
      );
      return;
    }

    section.items.forEach((item) => {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [new TextRun({ text: item.text })],
        })
      );
      if (item.source) {
        children.push(
          new Paragraph({
            indent: { left: 720 },
            children: [
              new TextRun({ text: `Context: ${item.source}`, italics: true, color: BODY_GRAY }),
            ],
            spacing: { after: 80 },
          })
        );
      }
    });
  });

  const doc = new Document({
    styles: brandDocStyles(),
    sections: [
      {
        properties: {},
        headers: { default: brandHeader() },
        footers: { default: brandFooter() },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}

export function buildAgendaFilename(clientName: string, meetingDate: string): string {
  const safeClient = clientName.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, " ");
  const safeDate = meetingDate.replace(/[^\w-]/g, "");
  return `Agenda - ${safeClient} - ${safeDate}.docx`;
}
