import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";

type DomainValueLookup = {
  domainValue: {
    findFirst: (args: {
      where: { type: "PDV" | "SYSTEM"; value: string; active: true };
    }) => PromiseLike<{ id: string } | null>;
  };
};

export interface FixedSaleDomainNames {
  pdv: string;
  system: string;
}

export async function resolveFixedSaleDomains(
  prisma: DomainValueLookup,
  names: FixedSaleDomainNames,
): Promise<{ pdvId: string; systemId: string }> {
  const pdv = await prisma.domainValue.findFirst({
    where: { type: "PDV", value: names.pdv, active: true },
  });
  if (!pdv) {
    throw new AppException(
      ErrorCode.DOMAIN_VALUE_INVALID,
      `Cadastre o PDV ${names.pdv} em Configurações`,
    );
  }

  const system = await prisma.domainValue.findFirst({
    where: { type: "SYSTEM", value: names.system, active: true },
  });
  if (!system) {
    throw new AppException(
      ErrorCode.DOMAIN_VALUE_INVALID,
      `Cadastre o sistema ${names.system} em Configurações`,
    );
  }

  return { pdvId: pdv.id, systemId: system.id };
}
