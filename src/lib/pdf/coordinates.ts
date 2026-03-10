/**
 * Coordinate map for the Beneficiary Declaration PDF template.
 * All values are in PDF points (1 point = 1/72 inch).
 * Origin is bottom-left corner of the page.
 * Page size: 595 x 842 (A4).
 *
 * Calibrated from grid overlay analysis of the template.
 */

export interface FieldCoordinate {
  x: number;
  y: number;
  fontSize?: number; // default: 10
  maxWidth?: number; // for text truncation
}

export interface CheckboxCoordinate {
  x: number;
  y: number;
  size?: number; // default: 10
}

export interface ImageArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ---- Top Section (declarant info) ----

export const DECLARANT = {
  fullName: { x: 82, y: 672, fontSize: 11, maxWidth: 260 } as FieldCoordinate,
  israeliIdNumber: { x: 505, y: 660, fontSize: 9, maxWidth: 80 } as FieldCoordinate,
  passportNumber: { x: 505, y: 633, fontSize: 9, maxWidth: 80 } as FieldCoordinate,
};

// Checkbox square boxes
export const CHECKBOXES = {
  forMyself: { x: 80, y: 618, size: 10 } as CheckboxCoordinate,
  onBehalfOfBeneficiary: { x: 80, y: 598, size: 10 } as CheckboxCoordinate,
};

// ---- Beneficiary 1 ----

export const BENEFICIARY_1 = {
  fullName: { x: 140, y: 532, fontSize: 9, maxWidth: 280 } as FieldCoordinate,

  // DOB digit boxes (DD/MM/YYYY)
  dobDay1: { x: 462, y: 505, fontSize: 9 } as FieldCoordinate,
  dobDay2: { x: 480, y: 505, fontSize: 9 } as FieldCoordinate,
  dobMonth1: { x: 510, y: 505, fontSize: 9 } as FieldCoordinate,
  dobMonth2: { x: 528, y: 505, fontSize: 9 } as FieldCoordinate,
  dobYear1: { x: 553, y: 505, fontSize: 9 } as FieldCoordinate,
  dobYear2: { x: 567, y: 505, fontSize: 9 } as FieldCoordinate,
  dobYear3: { x: 581, y: 505, fontSize: 9 } as FieldCoordinate,
  dobYear4: { x: 595, y: 505, fontSize: 9 } as FieldCoordinate,

  idNumber: { x: 130, y: 478, fontSize: 9, maxWidth: 80 } as FieldCoordinate,
  passportNumber: { x: 310, y: 478, fontSize: 9, maxWidth: 120 } as FieldCoordinate,
  gender: { x: 560, y: 478, fontSize: 9, maxWidth: 50 } as FieldCoordinate,

  street: { x: 200, y: 432, fontSize: 8, maxWidth: 270 } as FieldCoordinate,
  city: { x: 530, y: 432, fontSize: 8, maxWidth: 70 } as FieldCoordinate,
  state: { x: 200, y: 398, fontSize: 8, maxWidth: 150 } as FieldCoordinate,
  zipcode: { x: 420, y: 398, fontSize: 8, maxWidth: 80 } as FieldCoordinate,
  country: { x: 530, y: 398, fontSize: 8, maxWidth: 70 } as FieldCoordinate,
};

// ---- Beneficiary 2 (same layout, shifted down ~190pt) ----

export const BENEFICIARY_2 = {
  fullName: { x: 140, y: 342, fontSize: 9, maxWidth: 280 } as FieldCoordinate,

  dobDay1: { x: 462, y: 315, fontSize: 9 } as FieldCoordinate,
  dobDay2: { x: 480, y: 315, fontSize: 9 } as FieldCoordinate,
  dobMonth1: { x: 510, y: 315, fontSize: 9 } as FieldCoordinate,
  dobMonth2: { x: 528, y: 315, fontSize: 9 } as FieldCoordinate,
  dobYear1: { x: 553, y: 315, fontSize: 9 } as FieldCoordinate,
  dobYear2: { x: 567, y: 315, fontSize: 9 } as FieldCoordinate,
  dobYear3: { x: 581, y: 315, fontSize: 9 } as FieldCoordinate,
  dobYear4: { x: 595, y: 315, fontSize: 9 } as FieldCoordinate,

  idNumber: { x: 130, y: 290, fontSize: 9, maxWidth: 80 } as FieldCoordinate,
  passportNumber: { x: 310, y: 290, fontSize: 9, maxWidth: 120 } as FieldCoordinate,
  gender: { x: 560, y: 290, fontSize: 9, maxWidth: 50 } as FieldCoordinate,

  street: { x: 200, y: 242, fontSize: 8, maxWidth: 270 } as FieldCoordinate,
  city: { x: 530, y: 242, fontSize: 8, maxWidth: 70 } as FieldCoordinate,
  state: { x: 200, y: 205, fontSize: 8, maxWidth: 150 } as FieldCoordinate,
  zipcode: { x: 420, y: 205, fontSize: 8, maxWidth: 80 } as FieldCoordinate,
  country: { x: 530, y: 205, fontSize: 8, maxWidth: 70 } as FieldCoordinate,
};

// ---- Bottom Section (date + signature) ----

export const BOTTOM = {
  dateDay1: { x: 87, y: 92, fontSize: 10 } as FieldCoordinate,
  dateDay2: { x: 115, y: 92, fontSize: 10 } as FieldCoordinate,
  dateMonth1: { x: 157, y: 92, fontSize: 10 } as FieldCoordinate,
  dateMonth2: { x: 182, y: 92, fontSize: 10 } as FieldCoordinate,
  dateYear1: { x: 220, y: 92, fontSize: 10 } as FieldCoordinate,
  dateYear2: { x: 242, y: 92, fontSize: 10 } as FieldCoordinate,
  dateYear3: { x: 264, y: 92, fontSize: 10 } as FieldCoordinate,
  dateYear4: { x: 286, y: 92, fontSize: 10 } as FieldCoordinate,

  signature: { x: 460, y: 72, width: 130, height: 45 } as ImageArea,
};
