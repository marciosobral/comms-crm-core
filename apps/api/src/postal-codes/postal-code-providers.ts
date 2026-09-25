import { z } from "zod";

export interface PostalCodeAddress {
  postalCode: string;
  street: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
}

export type PostalCodeProvider = (
  cep: string,
  signal: AbortSignal,
) => Promise<PostalCodeAddress | null>;

const brasilApiResponse = z.object({
  state: z.string(),
  city: z.string(),
  neighborhood: z.string().nullable(),
  street: z.string().nullable(),
});

const viaCepResponse = z.union([
  z.object({ erro: z.union([z.literal(true), z.literal("true")]) }),
  z.object({
    logradouro: z.string(),
    bairro: z.string(),
    localidade: z.string(),
    uf: z.string(),
  }),
]);

export const fromBrasilApi: PostalCodeProvider = async (cep, signal) => {
  const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`, { signal });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`BrasilAPI responded ${response.status}`);
  const body = brasilApiResponse.parse(await response.json());
  return {
    postalCode: cep,
    street: body.street || null,
    neighborhood: body.neighborhood || null,
    city: body.city,
    state: body.state,
  };
};

export const fromViaCep: PostalCodeProvider = async (cep, signal) => {
  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal });
  if (!response.ok) throw new Error(`ViaCEP responded ${response.status}`);
  const body = viaCepResponse.parse(await response.json());
  if ("erro" in body) return null;
  return {
    postalCode: cep,
    street: body.logradouro || null,
    neighborhood: body.bairro || null,
    city: body.localidade,
    state: body.uf,
  };
};
