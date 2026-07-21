import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { auth } from "@lifeos/auth/server";
import { createLifeOsRpcClient } from "@lifeos/rpc";
import {
  convertToModelMessages,
  pruneMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";

import {
  createAssistantActions,
  rankAssistantActions,
  type AssistantRequestContext,
} from "./actions";

const assistantContextSchema = z.object({
  pathname: z.string().startsWith("/").max(240),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  perspective: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("family") }),
    z.object({
      kind: z.literal("person"),
      personId: z.string().uuid(),
      personName: z.string().trim().max(100).optional(),
    }),
  ]),
});

const assistantBodySchema = z.object({
  messages: z.array(z.unknown()).min(1).max(80),
  context: assistantContextSchema,
});

function getLastUserText(messages: UIMessage[]) {
  const message = messages.findLast((item) => item.role === "user");
  if (!message) return "";
  return message.parts
    .filter(
      (
        part,
      ): part is Extract<(typeof message.parts)[number], { type: "text" }> =>
        part.type === "text",
    )
    .map((part) => part.text)
    .join(" ");
}

function getPriorToolNames(messages: UIMessage[]) {
  const names = new Set<string>();
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === "dynamic-tool") {
        names.add(part.toolName);
      } else if (part.type.startsWith("tool-")) {
        names.add(part.type.slice("tool-".length));
      }
    }
  }
  return names;
}

function getRecentConversation(messages: UIMessage[], maximum = 20) {
  if (messages.length <= maximum) return messages;
  let start = messages.length - maximum;
  while (start < messages.length - 1 && messages[start]?.role !== "user") {
    start += 1;
  }
  return messages.slice(start);
}

function forwardAuthHeaders(request: Request) {
  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  const authorization = request.headers.get("authorization");
  if (cookie) headers.set("cookie", cookie);
  if (authorization) headers.set("authorization", authorization);
  return headers;
}

function familySlug(name: string) {
  const base = name
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 42);
  return `${base || "family"}-${crypto.randomUUID().slice(0, 6)}`;
}

function systemInstructions(
  context: AssistantRequestContext,
  userName: string,
) {
  const perspective =
    context.perspective.kind === "person"
      ? `person ${context.perspective.personName ?? context.perspective.personId}`
      : "the whole Family";

  return `You are the embedded LifeOS assistant for ${userName}. You can retrieve and change LifeOS data only through the supplied tools.

Current app context: route ${context.pathname}; perspective ${perspective}; local date ${context.localDate}.

Operating rules:
- Do not claim that data was read or changed unless a tool result confirms it.
- If a supplied tool clearly matches an unambiguous request, use it immediately. Do not ask for conversational confirmation; sensitive actions have an explicit approval UI.
- If no supplied tool matches, call search_actions with a short capability query. It loads matching LifeOS tools for the next step.
- Never invent IDs. Retrieve the relevant record first when an ID or unchanged replacement fields are needed.
- Ask one concise clarification only when a required value or Family member is genuinely ambiguous.
- Never execute mutations in parallel. Reads may be parallel when independent.
- Money amounts passed to tools are integer minor units. Convert natural-language major amounts correctly using the stated currency.
- Keep the final response concise. Tool results are already shown as rich LifeOS cards; summarize the outcome and any next decision.
- Do not expose internal UUIDs, schemas, action discovery, or implementation details unless the user explicitly asks.`;
}

export async function handleAssistantChat(request: Request, userName: string) {
  const apiKey =
    process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error:
          "LifeOS AI is not configured. Set GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY) on the API service.",
      },
      { status: 503 },
    );
  }

  let parsedBody: z.infer<typeof assistantBodySchema>;
  try {
    parsedBody = assistantBodySchema.parse(await request.json());
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof z.ZodError
            ? "The assistant request was invalid."
            : "The assistant request could not be read.",
      },
      { status: 400 },
    );
  }

  const messages = parsedBody.messages as UIMessage[];
  const context = parsedBody.context;
  const requestOrigin = new URL(request.url).origin;
  const internalApiUrl = process.env.LIFEOS_INTERNAL_API_URL ?? requestOrigin;
  const client = createLifeOsRpcClient(internalApiUrl, {
    headers: forwardAuthHeaders(request),
  });
  const actions = createAssistantActions({
    client,
    context,
    familyCommands: {
      create: async (name) => {
        const organization = await auth.api.createOrganization({
          headers: request.headers,
          body: {
            name,
            slug: familySlug(name),
            metadata: { kind: "family" },
          },
        });
        await auth.api.setActiveOrganization({
          headers: request.headers,
          body: { organizationId: organization.id },
        });
        return { id: organization.id, name: organization.name };
      },
      invite: async (organizationId, email) => {
        const invitation = await auth.api.createInvitation({
          headers: request.headers,
          body: {
            organizationId,
            email,
            role: "member",
          },
        });
        return { id: invitation.id, email: invitation.email };
      },
      respondToInvitation: async (invitationId, response) => {
        if (response === "reject") {
          await auth.api.rejectInvitation({
            headers: request.headers,
            body: { invitationId },
          });
          return {};
        }

        const accepted = await auth.api.acceptInvitation({
          headers: request.headers,
          body: { invitationId },
        });
        await auth.api.setActiveOrganization({
          headers: request.headers,
          body: { organizationId: accepted.invitation.organizationId },
        });
        return { organizationId: accepted.invitation.organizationId };
      },
    },
  });
  const actionsByName = new Map(actions.map((action) => [action.name, action]));
  const discovered = new Set<string>();

  for (const action of rankAssistantActions(
    getLastUserText(messages),
    context,
    actions,
    6,
  )) {
    discovered.add(action.name);
  }
  for (const name of getPriorToolNames(messages)) {
    if (actionsByName.has(name)) discovered.add(name);
  }

  const tools: Record<string, any> = Object.fromEntries(
    actions.map((action) => [action.name, action.tool]),
  );
  tools.search_actions = tool({
    description:
      "Search the complete LifeOS action catalog when none of the currently supplied tools can satisfy the request. Matching tools become available in the next step.",
    inputSchema: z.object({
      query: z
        .string()
        .trim()
        .min(2)
        .max(160)
        .describe("A short capability query, not the user's whole message."),
    }),
    execute: async ({ query }) => {
      const matches = rankAssistantActions(query, context, actions, 7);
      for (const action of matches) discovered.add(action.name);
      return {
        ok: true,
        action: "search_actions",
        kind: "collection" as const,
        title: "LifeOS actions found",
        summary: `${matches.length} relevant action(s) loaded.`,
        changed: false,
        data: {
          items: matches.map((action) => ({
            name: action.name,
            domain: action.domain,
            description: action.description,
            requiresApproval: action.risk === "confirm",
          })),
        },
      };
    },
  });
  discovered.add("search_actions");

  const google = createGoogleGenerativeAI({ apiKey });
  const modelName = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";
  const modelMessages = pruneMessages({
    messages: await convertToModelMessages(getRecentConversation(messages), {
      tools,
    }),
    reasoning: "all",
    toolCalls: "before-last-4-messages",
  });
  const result = streamText({
    model: google(modelName),
    system: systemInstructions(context, userName),
    messages: modelMessages,
    tools,
    activeTools: [...discovered],
    prepareStep: () => ({ activeTools: [...discovered] }),
    stopWhen: stepCountIs(8),
    temperature: 0,
    maxOutputTokens: 700,
    onError: ({ error }) => {
      console.error("[LifeOS Assistant] generation failed", error);
    },
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "Cache-Control": "no-store",
    },
    onError: (error) =>
      error instanceof Error
        ? error.message
        : "The LifeOS assistant could not complete that request.",
  });
}
