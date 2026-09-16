export function joinSchedule(
  date: string,
  startTime: string,
  endTime: string,
): {
  scheduleStart?: string;
  scheduleEnd?: string | null;
} {
  if (!date) return {};
  const start = startTime ? `${date}T${startTime}:00` : `${date}T00:00:00`;
  const end = endTime ? `${date}T${endTime}:00` : null;
  return { scheduleStart: start, scheduleEnd: end };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function localDatePart(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function localTimePart(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
