import { useQuery } from "@tanstack/react-query";

import { rpcClient } from "@/lib/rpc-client";

export const fitnessQueryKey = ["fitness"] as const;

export function useFitness(personId: string | undefined, date: string) {
  return useQuery({
    queryKey: [...fitnessQueryKey, "dashboard", personId ?? "viewer", date],
    queryFn: () =>
      rpcClient.fitness.bootstrap({
        ...(personId ? { personId } : {}),
        date,
      }),
    enabled: Boolean(personId),
  });
}
