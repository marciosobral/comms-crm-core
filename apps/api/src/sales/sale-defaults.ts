import { saleDefaults } from "@comms-core/config";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";

type DomainValueLookup = {
  domainValue: {
    findFirst: (args: {
      where: { type: "PDV" | "SYSTEM"; value: string; active: true };
    }) => PromiseLike<{ id: string } | null>;
  };
};

export async function resolveFixedSaleDomains(
  prisma: DomainValueLookup,
): Promise<{ pdvId: string; systemId: string }> {
  const pdv = await prisma.domainValue.findFirst({
    where: { type: "PDV", value: saleDefaults.pdv, active: true },
  });
  if (!pdv) {
    throw new AppException(
      ErrorCode.DOMAIN_VALUE_INVALID,
      "Cadastre o PDV PDV PADRÃO em Configurações",
    );
  }

  const system = await prisma.domainValue.findFirst({
    where: { type: "SYSTEM", value: saleDefaults.system, active: true },
  });
  if (!system) {
    throw new AppException(
      ErrorCode.DOMAIN_VALUE_INVALID,
      "Cadastre o sistema SISTEMA PADRÃO em Configurações",
    );
  }

  return { pdvId: pdv.id, systemId: system.id };
}
