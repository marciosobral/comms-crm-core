import { UTF8_BOM, csvLine } from "@/common/csv";
import { EXPECTED_HEADER } from "./parser";

const PENDING_MESSAGE_COLUMN = "MENSAGEM";

export interface PendingCsvRow {
  raw: string[];
  message: string | null;
}

export function templateCsv(): string {
  return `${UTF8_BOM}${EXPECTED_HEADER.join(";")}\n`;
}

export function pendingCsv(rows: PendingCsvRow[]): string {
  const lines = [csvLine([...EXPECTED_HEADER, PENDING_MESSAGE_COLUMN])];
  for (const row of rows) {
    const cells = EXPECTED_HEADER.map((_, index) => row.raw[index] ?? "");
    lines.push(csvLine([...cells, row.message ?? ""]));
  }
  return `${UTF8_BOM}${lines.join("\n")}\n`;
}
