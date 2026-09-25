import { MESSAGES, digitsOnly, isCep } from "@comms-crm-core/validation";
import { HttpStatus, Injectable } from "@nestjs/common";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import { WinstonLoggerService } from "../logging/winston-logger.service";
import {
  type PostalCodeAddress,
  type PostalCodeProvider,
  fromBrasilApi,
  fromViaCep,
} from "./postal-code-providers";

const LOOKUP_TIMEOUT_MS = 4_000;
const CACHE_LIMIT = 5_000;

@Injectable()
export class PostalCodesService {
  private readonly cache = new Map<string, PostalCodeAddress>();
  private readonly providers: PostalCodeProvider[] = [fromBrasilApi, fromViaCep];

  constructor(private readonly logger: WinstonLoggerService) {}

  async lookup(rawCep: string): Promise<PostalCodeAddress> {
    const cep = digitsOnly(rawCep);
    if (!isCep(cep)) throw new AppException(ErrorCode.INVALID_INPUT, MESSAGES.cep);

    const cached = this.cache.get(cep);
    if (cached) return cached;

    const signal = AbortSignal.timeout(LOOKUP_TIMEOUT_MS);
    const lookups = this.providers.map((provider) => provider(cep, signal));
    try {
      const address = await Promise.any(
        lookups.map((lookup) =>
          lookup.then((found) => found ?? Promise.reject(new Error("not found"))),
        ),
      );
      this.remember(cep, address);
      return address;
    } catch {
      const results = await Promise.allSettled(lookups);
      const isNotFoundEverywhere = results.every(
        (result) => result.status === "fulfilled" && result.value === null,
      );
      if (isNotFoundEverywhere) {
        throw new AppException(
          ErrorCode.POSTAL_CODE_NOT_FOUND,
          "CEP não encontrado",
          HttpStatus.NOT_FOUND,
        );
      }
      for (const result of results) {
        if (result.status === "rejected") {
          this.logger.warn(
            `postal code lookup failed: ${String(result.reason)}`,
            PostalCodesService.name,
          );
        }
      }
      throw new AppException(
        ErrorCode.POSTAL_CODE_LOOKUP_FAILED,
        "Não foi possível consultar o CEP agora",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private remember(cep: string, address: PostalCodeAddress) {
    if (this.cache.size >= CACHE_LIMIT) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(cep, address);
  }
}
