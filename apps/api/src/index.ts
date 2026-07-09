import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { rpcPackage } from "@lifeos/rpc";

const app = new Hono();

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "lifeos-api",
    rpc: rpcPackage.name,
  }),
);

const port = Number(process.env.PORT ?? 8787);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`LifeOS API listening on http://localhost:${info.port}`);
  },
);
