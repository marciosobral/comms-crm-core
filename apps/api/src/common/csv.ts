// Excel on Windows only reads UTF-8 accents when the file starts with a BOM.
export const UTF8_BOM = "﻿";

// Spreadsheet apps run cells starting with these characters as formulas.
function guardFormula(cell: string): string {
  const startsLikeFormula = /^[=+@]/.test(cell) || /^-\D/.test(cell);
  return startsLikeFormula ? `'${cell}` : cell;
}

function csvCell(cell: string): string {
  const guarded = guardFormula(cell);
  return /[;"\r\n]/.test(guarded) ? `"${guarded.replaceAll('"', '""')}"` : guarded;
}

export function csvLine(cells: string[]): string {
  return cells.map(csvCell).join(";");
}
