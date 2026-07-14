import { useQuery } from "@tanstack/react-query";

import { rpcClient } from "@/lib/rpc-client";

export const moneyQueryKey = ["money"] as const;

export function useMoney(personId?: string, enabled = true) {
  return useQuery({
    queryKey: [...moneyQueryKey, personId ?? "household"],
    queryFn: () =>
      rpcClient.money.bootstrap({ ...(personId ? { personId } : {}) }),
    enabled,
  });
}
