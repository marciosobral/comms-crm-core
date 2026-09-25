import { api } from "@/lib/api";
import { domainValuesKeys } from "@/lib/query-keys";
import type { DomainType, DomainValue } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

export function useActiveDomainValues(type: DomainType) {
  return useQuery({
    queryKey: domainValuesKeys.active(type),
    queryFn: () => api.get<DomainValue[]>(`/domain-values?type=${type}`),
    staleTime: 5 * 60_000,
  });
}
