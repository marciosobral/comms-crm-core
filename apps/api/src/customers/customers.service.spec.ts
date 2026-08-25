import { describe, expect, it, vi } from "vitest";
import { CustomersService } from "./customers.service";

const ctx = { userId: "u1", ip: null, userAgent: null };

function makeService() {
  const customer = { id: "c1", name: "Fulana de Tal", cpfCnpj: "123.456.789-09" };
  const prisma = {
    customer: {
      findMany: vi.fn().mockResolvedValue([customer]),
      findUniqueOrThrow: vi.fn().mockResolvedValue(customer),
      update: vi.fn().mockResolvedValue({ ...customer, city: "Goiânia" }),
    },
  };
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const svc = new CustomersService(
    prisma as unknown as ConstructorParameters<typeof CustomersService>[0],
    audit as unknown as ConstructorParameters<typeof CustomersService>[1],
  );
  return { svc, prisma, audit };
}

describe("CustomersService", () => {
  it("builds an insensitive contains filter from q", async () => {
    const { svc, prisma } = makeService();
    await svc.list("ana");
    const arg = prisma.customer.findMany.mock.calls[0][0];
    expect(arg.where.OR).toEqual([
      { name: { contains: "ana", mode: "insensitive" } },
      { cpfCnpj: { contains: "ana" } },
    ]);
  });

  it("passes no where when q is empty", async () => {
    const { svc, prisma } = makeService();
    await svc.list(undefined);
    expect(prisma.customer.findMany.mock.calls[0][0].where).toBeUndefined();
  });

  it("audits updates with before and after", async () => {
    const { svc, audit } = makeService();
    await svc.update("c1", { city: "Goiânia" }, ctx);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "Customer", action: "UPDATE" }),
    );
  });
});
