import { createLifeOsRpcClient } from "@lifeos/rpc";

const apiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

export const rpcClient = createLifeOsRpcClient(apiUrl);
