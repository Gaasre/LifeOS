import { useQuery } from "@tanstack/react-query";

import { rpcClient } from "@/lib/rpc-client";

export const projectsQueryKey = ["projects"] as const;

export function useProjects(personId?: string, enabled = true) {
  return useQuery({
    queryKey: [...projectsQueryKey, "list", personId ?? "family"],
    queryFn: () =>
      rpcClient.projects.list({ ...(personId ? { personId } : {}) }),
    enabled,
  });
}
