import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  DECLARANT,
  CHECKBOXES,
  BENEFICIARY_1,
  BENEFICIARY_2,
  BOTTOM,
  type FieldCoordinate,
  type CheckboxCoordinate,
} from './coordinates';
import type { BeneficiaryDeclaration } from '@/types/database';

/**
 * Data required to generate a filled beneficiary declaration PDF.
 */
export interface BeneficiaryPdfData {
  /** The template PDF file bytes */
  templateBytes: Uint8Array;

  /** Declarant (the client themselves) */
  declarantFullName: string;
  israeliIdNumber: string | null;
  passportNumber: string | null;

  /** Up to 2 beneficiary declaration rows */
  beneficiaries: BeneficiaryDeclaration[];

  /** true = "for myself", false = "on behalf of a beneficiary" */
  forMyself: boolean;

  /** Signature PNG bytes fetched from Supabase Storage */
  signaturePngBytes: Uint8Array | null;

  /** Declaration date (ISO string) */
  declarationDate: string | null;
}

/**
 * Generates a filled-in Beneficiary Declaration PDF from the template.
 * Draws text at the mapped coordinates and embeds the signature image.
 */
export async function generateBeneficiaryPdf(
  data: BeneficiaryPdfData
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(data.templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page = pdfDoc.getPages()[0];

  // Dark navy colour matching IsraTransfer branding
  const textColor = rgb(0.1, 0.15, 0.25);

  // ---- Helper: draw text at a coordinate ----
  const drawText = (text: string | null | undefined, coord: FieldCoordinate) => {
    if (!text) return;
    const fontSize = coord.fontSize ?? 10;
    let displayText = text;

    // Truncate if text exceeds maxWidth
    if (coord.maxWidth) {
      const textWidth = font.widthOfTextAtSize(displayText, fontSize);
      if (textWidth > coord.maxWidth) {
        while (
          displayText.length > 0 &&
          font.widthOfTextAtSize(displayText + '...', fontSize) > coord.maxWidth
        ) {
          displayText = displayText.slice(0, -1);
        }
        displayText += '...';
      }
    }

    page.drawText(displayText, {
      x: coord.x,
      y: coord.y,
      size: fontSize,
      font,
      color: textColor,
    });
  };

  // ---- Helper: draw a checkmark using lines ----
  const drawCheck = (coord: CheckboxCoordinate) => {
    const size = coord.size ?? 10;
    const thickness = 1.5;

    // Draw an "X" mark inside the checkbox area
    // Line 1: bottom-left to top-right
    page.drawLine({
      start: { x: coord.x + 1, y: coord.y + 1 },
      end: { x: coord.x + size - 1, y: coord.y + size - 1 },
      thickness,
      color: textColor,
    });
    // Line 2: top-left to bottom-right
    page.drawLine({
      start: { x: coord.x + 1, y: coord.y + size - 1 },
      end: { x: coord.x + size - 1, y: coord.y + 1 },
      thickness,
      color: textColor,
    });
  };

  // ---- Helper: draw date as individual digits in DD/MM/YYYY boxes ----
  const drawDateDigits = (
    dateStr: string | null | undefined,
    prefix: string,
    coords: Record<string, FieldCoordinate>
  ) => {
    if (!dateStr) return;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return;

    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = String(date.getFullYear());

    const digitMap: [string, string][] = [
      [`${prefix}Day1`, dd[0]],
      [`${prefix}Day2`, dd[1]],
      [`${prefix}Month1`, mm[0]],
      [`${prefix}Month2`, mm[1]],
      [`${prefix}Year1`, yyyy[0]],
      [`${prefix}Year2`, yyyy[1]],
      [`${prefix}Year3`, yyyy[2]],
      [`${prefix}Year4`, yyyy[3]],
    ];

    for (const [key, val] of digitMap) {
      if (coords[key]) {
        drawText(val, coords[key]);
      }
    }
  };

  // ---- Helper: fill a beneficiary section ----
  const fillBeneficiary = (
    b: BeneficiaryDeclaration,
    coords: typeof BENEFICIARY_1
  ) => {
    drawText(b.full_name, coords.fullName);
    drawDateDigits(b.date_of_birth, 'dob', coords as unknown as Record<string, FieldCoordinate>);
    drawText(b.id_number, coords.idNumber);
    drawText(b.passport_number, coords.passportNumber);
    drawText(b.gender, coords.gender);
    drawText(b.address_street, coords.street);
    drawText(b.address_city, coords.city);
    drawText(b.address_state, coords.state);
    drawText(b.address_zipcode, coords.zipcode);
    drawText(b.address_country, coords.country);
  };

  // ==== Fill the PDF ====

  // 1. Declarant info
  drawText(data.declarantFullName, DECLARANT.fullName);
  drawText(data.israeliIdNumber, DECLARANT.israeliIdNumber);
  drawText(data.passportNumber, DECLARANT.passportNumber);

  // 2. Checkboxes
  if (data.forMyself) {
    drawCheck(CHECKBOXES.forMyself);
  } else {
    drawCheck(CHECKBOXES.onBehalfOfBeneficiary);
  }

  // 3. Beneficiary 1
  if (data.beneficiaries.length >= 1) {
    fillBeneficiary(data.beneficiaries[0], BENEFICIARY_1);
  }

  // 4. Beneficiary 2
  if (data.beneficiaries.length >= 2) {
    fillBeneficiary(data.beneficiaries[1], BENEFICIARY_2);
  }

  // 5. Bottom date
  drawDateDigits(
    data.declarationDate,
    'date',
    BOTTOM as unknown as Record<string, FieldCoordinate>
  );

  // 6. Signature image
  if (data.signaturePngBytes) {
    try {
      const sigImage = await pdfDoc.embedPng(data.signaturePngBytes);
      const sigArea = BOTTOM.signature;

      // Scale to fit while maintaining aspect ratio
      const scaleFactor = Math.min(
        sigArea.width / sigImage.width,
        sigArea.height / sigImage.height
      );
      const scaledWidth = sigImage.width * scaleFactor;
      const scaledHeight = sigImage.height * scaleFactor;

      page.drawImage(sigImage, {
        x: sigArea.x + (sigArea.width - scaledWidth) / 2, // center horizontally
        y: sigArea.y + (sigArea.height - scaledHeight) / 2, // center vertically
        width: scaledWidth,
        height: scaledHeight,
      });
    } catch (err) {
      // If the signature image is invalid, skip it rather than failing the whole PDF
      console.error('Failed to embed signature image in PDF:', err);
    }
  }

  return pdfDoc.save();
}
