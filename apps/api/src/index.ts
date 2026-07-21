import "dotenv/config";

import { serve } from "@hono/node-server";
import { auth, trustedOrigins, type AuthSession } from "@lifeos/auth/server";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { rpcPackage } from "@lifeos/rpc";

import { lifeOsRouter } from "./family-router";
import { handleAssistantChat } from "./assistant/chat";

type Variables = {
  user: AuthSession["user"];
  session: AuthSession["session"];
};

const app = new Hono<{ Variables: Variables }>();
const rpcHandler = new RPCHandler(lifeOsRouter, {
  interceptors: [
    onError((error) => {
      console.error("[LifeOS RPC]", error);
    }),
  ],
});

app.use("*", logger());

app.use(
  "/api/*",
  cors({
    origin: (origin) => (trustedOrigins.includes(origin) ? origin : null),
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length", "x-vercel-ai-ui-message-stream"],
    maxAge: 600,
    credentials: true,
  }),
);

app.use(
  "/rpc/*",
  cors({
    origin: (origin) => (trustedOrigins.includes(origin) ? origin : null),
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "lifeos-api",
    rpc: rpcPackage.name,
  }),
);

app.get("/api/auth/ok", (c) => c.json({ status: "ok" }));

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use("/rpc/*", async (c, next) => {
  const { matched, response } = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context: { headers: c.req.raw.headers },
  });

  if (matched) {
    return c.newResponse(response.body, response);
  }

  await next();
});

app.use("/api/private/*", async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});

app.get("/api/private/session", (c) =>
  c.json({
    user: c.get("user"),
    session: {
      id: c.get("session").id,
      expiresAt: c.get("session").expiresAt,
    },
  }),
);

app.post("/api/private/assistant/chat", (c) =>
  handleAssistantChat(c.req.raw, c.get("user").name || "you"),
);

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((error, c) => {
  console.error(error);
  return c.json({ error: "Internal server error" }, 500);
});

const port = Number(process.env.PORT ?? 8787);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`LifeOS API listening on http://127.0.0.1:${info.port}`);
  },
);
