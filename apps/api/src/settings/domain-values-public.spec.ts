import { describe, expect, it, vi } from "vitest";
import { DomainValuesService } from "./domain-values.service";

describe("DomainValuesService.listActive", () => {
  it("filters by type and active only", async () => {
    const prisma = {
      domainValue: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const svc = new DomainValuesService(
      prisma as unknown as ConstructorParameters<typeof DomainValuesService>[0],
      { record: vi.fn() } as unknown as ConstructorParameters<typeof DomainValuesService>[1],
    );
    await svc.listActive("SALE_STATUS");
    const arg = prisma.domainValue.findMany.mock.calls[0][0];
    expect(arg.where).toEqual({ type: "SALE_STATUS", active: true });
    expect(arg.orderBy).toEqual([{ order: "asc" }, { value: "asc" }]);
  });
});
