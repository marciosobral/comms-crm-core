import { BUSINESS_TIME_ZONE, businessDateKey, shiftDateKey } from "@comms-crm-core/validation";

export function relativeNotificationTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;

  const dayKey = businessDateKey(date);
  const today = businessDateKey(now);
  const time = date.toLocaleTimeString("pt-BR", {
    timeZone: BUSINESS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });

  if (dayKey === today) {
    const diffHours = Math.floor(diffMin / 60);
    return `há ${diffHours} h`;
  }

  if (dayKey === shiftDateKey(today, -1)) {
    return `ontem, ${time}`;
  }

  const [, month, day] = dayKey.split("-");
  return `${day}/${month}, ${time}`;
}
