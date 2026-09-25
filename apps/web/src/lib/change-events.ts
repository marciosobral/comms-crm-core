import type { QueryKey } from "@tanstack/react-query";
import {
  customersKeys,
  domainValuesKeys,
  importsKeys,
  meKeys,
  plansKeys,
  reportsKeys,
  rolesKeys,
  salesKeys,
  settingsKeys,
  usersKeys,
} from "./query-keys";

export interface ServerSentEvent {
  type: string;
  data: string;
}

export interface ChangeEvent {
  entity: string;
}

export function parseServerSentEvents(buffer: string): { events: ServerSentEvent[]; rest: string } {
  const blocks = buffer.replaceAll("\r\n", "\n").split("\n\n");
  const rest = blocks.pop() ?? "";
  const events = blocks.map((block) => {
    let type = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) type = line.slice(6).trim();
      if (line.startsWith("data:")) data.push(line.slice(5).trim());
    }
    return { type, data: data.join("\n") };
  });
  return { events, rest };
}

export function toChangeEvent(event: ServerSentEvent): ChangeEvent | null {
  if (event.type !== "change") return null;
  try {
    const parsed: unknown = JSON.parse(event.data);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "entity" in parsed &&
      typeof parsed.entity === "string"
    ) {
      return { entity: parsed.entity };
    }
    return null;
  } catch {
    return null;
  }
}

const SALE_VIEWS: QueryKey[] = [salesKeys.all, salesKeys.anyDetail];

const KEYS_BY_ENTITY: Record<string, QueryKey[]> = {
  Sale: [
    ...SALE_VIEWS,
    salesKeys.anyHistory,
    customersKeys.all,
    customersKeys.anyDetail,
    reportsKeys.anyRevenue,
  ],
  Attachment: [salesKeys.anyDetail, salesKeys.anyHistory],
  Customer: [customersKeys.all, customersKeys.anyDetail, salesKeys.anyDetail],
  User: [usersKeys.all, meKeys.current, salesKeys.assignablePeople, ...SALE_VIEWS],
  Role: [rolesKeys.all, usersKeys.all, meKeys.current, salesKeys.assignablePeople],
  Plan: [plansKeys.all, ...SALE_VIEWS],
  DomainValue: [domainValuesKeys.anyList, domainValuesKeys.anyActive, ...SALE_VIEWS],
  SystemSetting: [settingsKeys.system],
  ImportBatch: [importsKeys.batches, importsKeys.anyBatch],
  ImportMapping: [importsKeys.mappings],
};

export function queryKeysForChange(change: ChangeEvent): QueryKey[] {
  return KEYS_BY_ENTITY[change.entity] ?? [];
}
