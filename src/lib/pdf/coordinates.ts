/**
 * Coordinate map for the Beneficiary Declaration PDF template.
 * All values are in PDF points (1 point = 1/72 inch).
 * Origin is bottom-left corner of the page.
 * Page size: 595 x 842 (A4).
 *
 * Calibrated by extracting rectangle positions from the template PDF
 * content streams. Each coordinate is derived from the actual template
 * form field rectangles.
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
// Name field rect: x=120.1 y=651.1 w=176.7 h=10.5
// ID checkbox rect: x=326.1 y=652.4 w=17.9 h=17.6

export const DECLARANT = {
  fullName: { x: 122, y: 654, fontSize: 11, maxWidth: 174 } as FieldCoordinate,
  israeliIdNumber: { x: 505, y: 660, fontSize: 9, maxWidth: 80 } as FieldCoordinate,
  passportNumber: { x: 505, y: 633, fontSize: 9, maxWidth: 80 } as FieldCoordinate,
};

// Checkbox square rects from template:
// forMyself:         x=38.2 y=615.2 w=17.9 h=17.7
// onBehalfOfBenef:   x=38.2 y=587.8 w=17.9 h=17.5
export const CHECKBOXES = {
  forMyself: { x: 39, y: 616, size: 16 } as CheckboxCoordinate,
  onBehalfOfBeneficiary: { x: 39, y: 589, size: 16 } as CheckboxCoordinate,
};

// ---- Beneficiary 1 ----
// Name field rect: x=39.4 y=515.0 w=283.7 h=16.6
// DOB digit boxes at y=515.7: x=349.6, 372.1, 408.0, 430.0, 464.2, 486.3, 508.4, 532.0
// ID/Passport row at y=480.3

export const BENEFICIARY_1 = {
  fullName: { x: 42, y: 519, fontSize: 9, maxWidth: 278 } as FieldCoordinate,

  // DOB digit boxes — text centered in each 17.9pt-wide box
  dobDay1: { x: 354, y: 520, fontSize: 9 } as FieldCoordinate,
  dobDay2: { x: 377, y: 520, fontSize: 9 } as FieldCoordinate,
  dobMonth1: { x: 413, y: 520, fontSize: 9 } as FieldCoordinate,
  dobMonth2: { x: 435, y: 520, fontSize: 9 } as FieldCoordinate,
  dobYear1: { x: 469, y: 520, fontSize: 9 } as FieldCoordinate,
  dobYear2: { x: 491, y: 520, fontSize: 9 } as FieldCoordinate,
  dobYear3: { x: 513, y: 520, fontSize: 9 } as FieldCoordinate,
  dobYear4: { x: 537, y: 520, fontSize: 9 } as FieldCoordinate,

  // ID row rects at y=480.3
  idNumber: { x: 45, y: 484, fontSize: 9, maxWidth: 55 } as FieldCoordinate,
  passportNumber: { x: 114, y: 484, fontSize: 9, maxWidth: 80 } as FieldCoordinate,
  gender: { x: 415, y: 484, fontSize: 9, maxWidth: 50 } as FieldCoordinate,

  street: { x: 200, y: 445, fontSize: 8, maxWidth: 270 } as FieldCoordinate,
  city: { x: 530, y: 445, fontSize: 8, maxWidth: 60 } as FieldCoordinate,
  state: { x: 200, y: 415, fontSize: 8, maxWidth: 150 } as FieldCoordinate,
  zipcode: { x: 420, y: 415, fontSize: 8, maxWidth: 80 } as FieldCoordinate,
  country: { x: 530, y: 415, fontSize: 8, maxWidth: 60 } as FieldCoordinate,
};

// ---- Beneficiary 2 ----
// Name field rect: x=40.1 y=323.4 w=283.7 h=16.6
// DOB boxes at y=324.0: x=350.1, 372.6, 408.5, 430.6, 464.7, 486.7, 509.1, 532.5
// ID row at y=288.6

export const BENEFICIARY_2 = {
  fullName: { x: 42, y: 327, fontSize: 9, maxWidth: 278 } as FieldCoordinate,

  dobDay1: { x: 355, y: 328, fontSize: 9 } as FieldCoordinate,
  dobDay2: { x: 377, y: 328, fontSize: 9 } as FieldCoordinate,
  dobMonth1: { x: 413, y: 328, fontSize: 9 } as FieldCoordinate,
  dobMonth2: { x: 436, y: 328, fontSize: 9 } as FieldCoordinate,
  dobYear1: { x: 470, y: 328, fontSize: 9 } as FieldCoordinate,
  dobYear2: { x: 492, y: 328, fontSize: 9 } as FieldCoordinate,
  dobYear3: { x: 514, y: 328, fontSize: 9 } as FieldCoordinate,
  dobYear4: { x: 537, y: 328, fontSize: 9 } as FieldCoordinate,

  idNumber: { x: 46, y: 292, fontSize: 9, maxWidth: 55 } as FieldCoordinate,
  passportNumber: { x: 114, y: 292, fontSize: 9, maxWidth: 80 } as FieldCoordinate,
  gender: { x: 415, y: 292, fontSize: 9, maxWidth: 50 } as FieldCoordinate,

  street: { x: 200, y: 255, fontSize: 8, maxWidth: 270 } as FieldCoordinate,
  city: { x: 530, y: 255, fontSize: 8, maxWidth: 60 } as FieldCoordinate,
  state: { x: 200, y: 222, fontSize: 8, maxWidth: 150 } as FieldCoordinate,
  zipcode: { x: 420, y: 222, fontSize: 8, maxWidth: 80 } as FieldCoordinate,
  country: { x: 530, y: 222, fontSize: 8, maxWidth: 60 } as FieldCoordinate,
};

// ---- Bottom Section (date + signature) ----
// Date digit boxes at y=97.6: x=57.3, 80.1, 115.8, 137.9, 172.2, 194.3, 216.4, 239.8
// Signature line at: x=357.1 y=84.2 w=149.5

export const BOTTOM = {
  dateDay1: { x: 62, y: 102, fontSize: 10 } as FieldCoordinate,
  dateDay2: { x: 85, y: 102, fontSize: 10 } as FieldCoordinate,
  dateMonth1: { x: 120, y: 102, fontSize: 10 } as FieldCoordinate,
  dateMonth2: { x: 143, y: 102, fontSize: 10 } as FieldCoordinate,
  dateYear1: { x: 177, y: 102, fontSize: 10 } as FieldCoordinate,
  dateYear2: { x: 199, y: 102, fontSize: 10 } as FieldCoordinate,
  dateYear3: { x: 221, y: 102, fontSize: 10 } as FieldCoordinate,
  dateYear4: { x: 244, y: 102, fontSize: 10 } as FieldCoordinate,

  // Signature image area — above the signature line
  signature: { x: 360, y: 86, width: 145, height: 40 } as ImageArea,
};
