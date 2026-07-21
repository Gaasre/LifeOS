import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2Icon,
  ChevronRightIcon,
  CircleAlertIcon,
  SendHorizontalIcon,
  ShieldCheckIcon,
  SparklesIcon,
  SquareIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type DynamicToolUIPart,
  type ToolUIPart,
  type UIMessage,
} from "ai";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@lifeos/ui/components/alert";
import { Badge } from "@lifeos/ui/components/badge";
import { Bubble, BubbleContent } from "@lifeos/ui/components/bubble";
import { Button } from "@lifeos/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@lifeos/ui/components/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lifeos/ui/components/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@lifeos/ui/components/input-group";
import { Message, MessageContent } from "@lifeos/ui/components/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@lifeos/ui/components/message-scroller";
import { Spinner } from "@lifeos/ui/components/spinner";

import { usePerspective } from "@/features/perspectives/perspective-context";

const apiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

type ActionResult = {
  ok: true;
  action: string;
  kind: "collection" | "record" | "receipt" | "navigation";
  title: string;
  summary: string;
  changed: boolean;
  href?: string;
  data?: unknown;
};

type AssistantToolPart = DynamicToolUIPart | ToolUIPart;

type DisplayItem = {
  title: string;
  detail?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isActionResult(value: unknown): value is ActionResult {
  return (
    isRecord(value) &&
    value.ok === true &&
    typeof value.action === "string" &&
    typeof value.title === "string" &&
    typeof value.summary === "string" &&
    typeof value.changed === "boolean"
  );
}

function isToolPart(
  part: UIMessage["parts"][number],
): part is AssistantToolPart {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-");
}

function getToolName(part: AssistantToolPart) {
  return part.type === "dynamic-tool"
    ? part.toolName
    : part.type.replace(/^tool-/, "");
}

function humanize(value: string) {
  return value
    .replace(/^set_/, "update_")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function primitiveDetail(record: Record<string, unknown>) {
  const candidates = [
    record.value,
    record.status,
    record.outcome,
    record.occursOn,
    record.expiresAt,
    record.date,
    record.kind,
    record.direction,
  ];
  const detail = candidates.find(
    (value) => typeof value === "string" || typeof value === "number",
  );
  return detail === undefined ? undefined : String(detail);
}

function toDisplayItem(value: unknown): DisplayItem | null {
  if (typeof value === "string" || typeof value === "number") {
    return { title: String(value) };
  }
  if (!isRecord(value)) return null;
  const title =
    value.title ??
    value.label ??
    value.name ??
    value.preferredName ??
    value.message;
  if (typeof title !== "string") return null;
  const detail = primitiveDetail(value);
  return detail ? { title, detail } : { title };
}

function extractDisplayItems(data: unknown) {
  if (!isRecord(data)) return [];
  const collections = [
    data.items,
    data.facts,
    data.officialRecords,
    data.personalDates,
    data.attention,
    data.upcoming,
    data.steps,
  ];
  for (const collection of collections) {
    if (!Array.isArray(collection) || collection.length === 0) continue;
    return collection
      .map(toDisplayItem)
      .filter((item): item is DisplayItem => item !== null)
      .slice(0, 5);
  }
  return [];
}

function extractDetailRows(data: unknown) {
  if (!isRecord(data)) return [];
  const candidate = isRecord(data.profile)
    ? data.profile
    : isRecord(data.summary)
      ? data.summary
      : data;
  return Object.entries(candidate)
    .filter(
      ([key, value]) =>
        !key.toLocaleLowerCase().includes("id") &&
        value !== null &&
        value !== "" &&
        (typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"),
    )
    .slice(0, 6)
    .map(([key, value]) => ({ label: humanize(key), value: String(value) }));
}

function summarizeInput(input: unknown) {
  if (!isRecord(input)) return [];
  return Object.entries(input)
    .filter(
      ([key, value]) =>
        !key.toLocaleLowerCase().endsWith("id") &&
        value !== null &&
        value !== undefined &&
        (typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"),
    )
    .slice(0, 5)
    .map(([key, value]) => ({ label: humanize(key), value: String(value) }));
}

function hasChangedResult(message: UIMessage) {
  return message.parts.some(
    (part) =>
      isToolPart(part) &&
      part.state === "output-available" &&
      isActionResult(part.output) &&
      part.output.changed,
  );
}

function AssistantResultCard({
  result,
  onNavigate,
}: {
  result: ActionResult;
  onNavigate: (href: string) => void;
}) {
  const items = extractDisplayItems(result.data);
  const detailRows = extractDetailRows(result.data);

  return (
    <Card size="sm" className="w-full bg-card/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {result.changed ? (
            <CheckCircle2Icon className="size-4 text-success" aria-hidden />
          ) : (
            <SparklesIcon
              className="size-4 text-muted-foreground"
              aria-hidden
            />
          )}
          {result.title}
        </CardTitle>
        <CardDescription>{result.summary}</CardDescription>
        <CardAction>
          <Badge variant={result.changed ? "secondary" : "outline"}>
            {result.changed
              ? "Done"
              : result.kind === "navigation"
                ? "Open"
                : "Found"}
          </Badge>
        </CardAction>
      </CardHeader>

      {items.length > 0 ? (
        <CardContent>
          <ul className="flex flex-col gap-2">
            {items.map((item, index) => (
              <li
                key={`${item.title}-${index}`}
                className="flex min-w-0 items-start justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2"
              >
                <span className="min-w-0 truncate font-medium">
                  {item.title}
                </span>
                {item.detail ? (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {item.detail}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </CardContent>
      ) : detailRows.length > 0 ? (
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
            {detailRows.map((row) => (
              <div key={row.label} className="contents">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="min-w-0 truncate text-right font-medium">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      ) : null}

      {result.href ? (
        <CardFooter className="justify-end">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onNavigate(result.href!)}
          >
            Open in LifeOS
            <ChevronRightIcon data-icon="inline-end" />
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}

function AssistantToolCard({
  part,
  onApprove,
  onNavigate,
}: {
  part: AssistantToolPart;
  onApprove: (approvalId: string, approved: boolean) => void;
  onNavigate: (href: string) => void;
}) {
  const toolName = getToolName(part);
  if (toolName === "search_actions") {
    if (part.state === "input-streaming" || part.state === "input-available") {
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner aria-hidden />
          Finding the right LifeOS action…
        </div>
      );
    }
    return null;
  }

  if (part.state === "approval-requested" && part.approval) {
    const rows = summarizeInput(part.input);
    return (
      <Card
        size="sm"
        className="w-full border border-warning/25 bg-card/90 ring-0"
      >
        <CardHeader>
          <CardTitle>
            Approve {humanize(toolName).toLocaleLowerCase()}?
          </CardTitle>
          <CardDescription>
            LifeOS is ready to make this sensitive change. Nothing happens until
            you approve it.
          </CardDescription>
        </CardHeader>
        {rows.length > 0 ? (
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
              {rows.map((row) => (
                <div key={row.label} className="contents">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="min-w-0 truncate text-right font-medium">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        ) : null}
        <CardFooter className="justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onApprove(part.approval!.id, false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onApprove(part.approval!.id, true)}
          >
            Approve change
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (part.state === "output-available" && isActionResult(part.output)) {
    return <AssistantResultCard result={part.output} onNavigate={onNavigate} />;
  }

  if (part.state === "output-error") {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon aria-hidden />
        <AlertTitle>{humanize(toolName)} failed</AlertTitle>
        <AlertDescription>
          {part.errorText || "LifeOS could not complete this action."}
        </AlertDescription>
      </Alert>
    );
  }

  if (part.state === "output-denied") {
    return (
      <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        Change cancelled.
      </div>
    );
  }

  if (
    part.state === "input-streaming" ||
    part.state === "input-available" ||
    part.state === "approval-responded"
  ) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Spinner aria-hidden />
        {part.state === "approval-responded"
          ? "Applying approved change…"
          : `${humanize(toolName)}…`}
      </div>
    );
  }

  return null;
}

function AssistantMessage({
  message,
  onApprove,
  onNavigate,
}: {
  message: UIMessage;
  onApprove: (approvalId: string, approved: boolean) => void;
  onNavigate: (href: string) => void;
}) {
  const isUser = message.role === "user";
  return (
    <Message align={isUser ? "end" : "start"}>
      <MessageContent>
        {message.parts.map((part, index) => {
          if (part.type === "text" && part.text.trim()) {
            return (
              <Bubble
                key={`${message.id}-text-${index}`}
                align={isUser ? "end" : "start"}
                variant={isUser ? "secondary" : "ghost"}
              >
                <BubbleContent className="whitespace-pre-wrap">
                  {part.text}
                </BubbleContent>
              </Bubble>
            );
          }
          if (isToolPart(part)) {
            return (
              <AssistantToolCard
                key={part.toolCallId}
                part={part}
                onApprove={onApprove}
                onNavigate={onNavigate}
              />
            );
          }
          return null;
        })}
      </MessageContent>
    </Message>
  );
}

const suggestions = [
  "Update my ring size",
  "What needs my attention?",
  "Show my active projects",
  "What can I safely spend?",
];

export function AssistantDock({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { perspective, selectedPerson } = usePerspective();
  const [input, setInput] = useState("");
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const requestContextRef = useRef({
    pathname: location.pathname,
    localDate: new Date().toLocaleDateString("en-CA"),
    perspective:
      perspective.kind === "person"
        ? {
            kind: "person" as const,
            personId: perspective.personId,
            ...(selectedPerson?.preferredName
              ? { personName: selectedPerson.preferredName }
              : {}),
          }
        : ({ kind: "family" as const } as const),
  });
  requestContextRef.current = {
    pathname: location.pathname,
    localDate: new Date().toLocaleDateString("en-CA"),
    perspective:
      perspective.kind === "person"
        ? {
            kind: "person",
            personId: perspective.personId,
            ...(selectedPerson?.preferredName
              ? { personName: selectedPerson.preferredName }
              : {}),
          }
        : { kind: "family" },
  };

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${apiUrl.replace(/\/$/, "")}/api/private/assistant/chat`,
        credentials: "include",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: { messages, context: requestContextRef.current },
          credentials: "include",
        }),
      }),
    [],
  );

  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
    clearError,
    setMessages,
    addToolApprovalResponse,
  } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onFinish: ({ message }) => {
      if (hasChangedResult(message)) {
        void queryClient.invalidateQueries();
      }
    },
  });

  const isWorking = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(
      () => composerRef.current?.focus(),
      280,
    );
    return () => window.clearTimeout(focusTimer);
  }, [open]);

  const submitText = useCallback(
    (text: string) => {
      const value = text.trim();
      if (!value || isWorking) return;
      clearError();
      setInput("");
      void sendMessage({ text: value });
    },
    [clearError, isWorking, sendMessage],
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submitText(input);
  };

  const onComposerKeyDown = (
    event: ReactKeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitText(input);
    }
  };

  const onApprove = (approvalId: string, approved: boolean) => {
    void addToolApprovalResponse({ id: approvalId, approved });
  };

  const onNavigate = (href: string) => {
    navigate(href);
    onOpenChange(false);
  };

  return (
    <section
      id="lifeos-assistant-panel"
      className="flex size-full min-h-0 flex-col"
      role="region"
      aria-labelledby="lifeos-assistant-title"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-foreground/10 bg-muted/45 text-foreground shadow-sm">
            <SparklesIcon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="lifeos-assistant-title" className="truncate font-medium">
              LifeOS AI
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              {perspective.kind === "person"
                ? `${selectedPerson?.preferredName ?? "Personal"} perspective`
                : "Family perspective"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {messages.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setMessages([]);
                clearError();
              }}
              aria-label="Start a new conversation"
              title="Start a new conversation"
            >
              <Trash2Icon />
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            aria-label="Close LifeOS AI"
            title="Close"
          >
            <XIcon />
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        {messages.length === 0 ? (
          <div className="h-full overflow-y-auto">
            <Empty className="min-h-full justify-between gap-8 px-5 py-7 sm:px-6 sm:py-9">
              <EmptyHeader className="gap-3">
                <EmptyMedia
                  variant="icon"
                  className="size-14 rounded-2xl border border-foreground/10 bg-muted/35 text-foreground shadow-lg"
                >
                  <SparklesIcon className="size-6" aria-hidden />
                </EmptyMedia>
                <EmptyTitle className="font-heading text-xl sm:text-2xl">
                  What can I take care of?
                </EmptyTitle>
                <EmptyDescription className="max-w-xs">
                  Search your life, update the details, or move work forward.
                  Just ask naturally.
                </EmptyDescription>
              </EmptyHeader>

              <EmptyContent className="max-w-none items-stretch gap-3">
                <p className="text-left text-xs font-medium text-muted-foreground">
                  Try a quick request
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {suggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      type="button"
                      variant="outline"
                      className="h-auto min-h-12 justify-between whitespace-normal py-2.5 text-left"
                      onClick={() => submitText(suggestion)}
                    >
                      <span>{suggestion}</span>
                      <ChevronRightIcon data-icon="inline-end" />
                    </Button>
                  ))}
                </div>
              </EmptyContent>
            </Empty>
          </div>
        ) : (
          <MessageScrollerProvider>
            <MessageScroller>
              <MessageScrollerViewport>
                <MessageScrollerContent className="p-4 pb-6">
                  {messages.map((message, index) => (
                    <MessageScrollerItem
                      key={message.id}
                      scrollAnchor={index === messages.length - 1}
                    >
                      <AssistantMessage
                        message={message}
                        onApprove={onApprove}
                        onNavigate={onNavigate}
                      />
                    </MessageScrollerItem>
                  ))}
                  {status === "submitted" ? (
                    <MessageScrollerItem scrollAnchor>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Spinner aria-hidden />
                        Thinking…
                      </div>
                    </MessageScrollerItem>
                  ) : null}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>
        )}
      </div>

      <footer className="flex shrink-0 flex-col gap-3 border-t border-border/60 bg-background/45 p-3 backdrop-blur-xl sm:p-4">
        {error ? (
          <Alert variant="destructive">
            <CircleAlertIcon aria-hidden />
            <AlertTitle>Assistant unavailable</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}
        <form onSubmit={onSubmit}>
          <InputGroup className="bg-background/40 has-[>textarea]:min-h-20 shadow-sm backdrop-blur-md">
            <InputGroupTextarea
              ref={composerRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onComposerKeyDown}
              placeholder="Ask or change anything in LifeOS…"
              aria-label="Message LifeOS assistant"
              disabled={isWorking}
              className="min-h-12 max-h-32"
            />
            <InputGroupAddon align="block-end" className="justify-between">
              <span className="text-[11px] font-normal text-muted-foreground">
                Enter to send · Shift Enter for a new line
              </span>
              {isWorking ? (
                <InputGroupButton
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  onClick={() => void stop()}
                  aria-label="Stop response"
                >
                  <SquareIcon />
                </InputGroupButton>
              ) : (
                <InputGroupButton
                  type="submit"
                  size="icon-sm"
                  variant="secondary"
                  disabled={!input.trim()}
                  aria-label="Send message"
                >
                  <SendHorizontalIcon />
                </InputGroupButton>
              )}
            </InputGroupAddon>
          </InputGroup>
        </form>
        <p className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
          <ShieldCheckIcon className="size-3" aria-hidden />
          Sensitive changes always ask for approval.
        </p>
      </footer>
    </section>
  );
}
