export type NotificationType = "SALE_CHANGE" | "DUE_DATE";

export interface AppNotification {
  id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}
