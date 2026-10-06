export function csvField(value: string): string {
  const sanitized = value
    .replace(/[;\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (/^[=+\-@]/.test(sanitized)) {
    return `'${sanitized}`;
  }

  return sanitized;
}
