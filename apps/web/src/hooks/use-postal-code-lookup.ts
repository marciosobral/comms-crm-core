import { ApiError, api } from "@/lib/api";
import type { PostalCodeAddress } from "@/lib/postal-code";
import { postalCodeKeys } from "@/lib/query-keys";
import { digitsOnly, isCep } from "@comms-crm-core/validation";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

export type PostalCodeLookupStatus = "idle" | "loading" | "not-found" | "failed";

export function usePostalCodeLookup() {
  const queryClient = useQueryClient();
  const latestCep = useRef("");
  const [status, setStatus] = useState<PostalCodeLookupStatus>("idle");

  useEffect(
    () => () => {
      latestCep.current = "";
    },
    [],
  );

  async function lookup(rawCep: string, onFound: (address: PostalCodeAddress) => void) {
    const cep = digitsOnly(rawCep);
    latestCep.current = cep;
    if (!isCep(cep)) {
      setStatus("idle");
      return;
    }
    setStatus("loading");
    try {
      const address = await queryClient.fetchQuery({
        queryKey: postalCodeKeys.lookup(cep),
        queryFn: () => api.get<PostalCodeAddress>(`/postal-codes/${cep}`),
        staleTime: Number.POSITIVE_INFINITY,
        retry: false,
      });
      if (latestCep.current !== cep) return;
      setStatus("idle");
      onFound(address);
    } catch (error) {
      if (latestCep.current !== cep) return;
      setStatus(error instanceof ApiError && error.status === 404 ? "not-found" : "failed");
    }
  }

  return { lookup, status };
}
