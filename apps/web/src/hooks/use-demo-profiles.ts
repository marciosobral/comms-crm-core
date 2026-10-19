import { fetchDemoProfiles } from "@/lib/demo";
import { demoKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";

export function useDemoProfiles() {
  return useQuery({
    queryKey: demoKeys.profiles,
    queryFn: fetchDemoProfiles,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
}
