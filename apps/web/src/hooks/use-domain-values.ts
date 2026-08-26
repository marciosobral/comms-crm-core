import { api } from "@/lib/api";
import type { DomainType, DomainValue } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

export function useActiveDomainValues(type: DomainType) {
  return useQuery({
    queryKey: ["active-domain-values", type],
    queryFn: () => api.get<DomainValue[]>(`/domain-values?type=${type}`),
    staleTime: 5 * 60_000,
  });
}
