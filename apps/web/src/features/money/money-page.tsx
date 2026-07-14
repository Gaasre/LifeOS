import { useEffect, useState } from "react";
import {
  CircleDollarSignIcon,
  CommandIcon,
  LandmarkIcon,
  ReceiptTextIcon,
  SearchIcon,
  SparklesIcon,
  TargetIcon,
} from "lucide-react";
import { motion, MotionConfig } from "motion/react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@lifeos/ui/components/alert";
import { Button } from "@lifeos/ui/components/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@lifeos/ui/components/command";
import { Kbd } from "@lifeos/ui/components/kbd";
import { Skeleton } from "@lifeos/ui/components/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lifeos/ui/components/tabs";

import { AppHeader } from "@/components/app-header";
import {
  CalculationDialog,
  MoneySettingsDialog,
} from "@/features/money/components/money-detail-dialogs";
import { MoneyEditorDialogs } from "@/features/money/components/money-editor-dialogs";
import { MoneyOverview } from "@/features/money/components/money-overview";
import {
  AccountsSection,
  ActivitySection,
  DecisionsSection,
  GoalsSection,
  RecurringSection,
} from "@/features/money/components/money-sections";
import { useMoney } from "@/features/money/hooks/use-money";
import type { MoneyEditorTarget } from "@/features/money/money-types";
import { usePerspective } from "@/features/perspectives/perspective-context";

const sections = [
  "overview",
  "accounts",
  "recurring",
  "activity",
  "goals",
  "decisions",
] as const;
type MoneySection = (typeof sections)[number];

function MoneyLoading() {
  return (
    <div className="space-y-4" aria-label="Loading Money" aria-busy="true">
      <div className="grid grid-cols-12 gap-4">
        <Skeleton className="col-span-12 min-h-[30rem] rounded-xl lg:col-span-8" />
        <Skeleton className="col-span-12 min-h-[30rem] rounded-xl lg:col-span-4" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-56 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function MoneyCommandPalette({
  open,
  onOpenChange,
  onEdit,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (target: MoneyEditorTarget) => void;
  onNavigate: (section: MoneySection) => void;
}) {
  function run(action: () => void) {
    onOpenChange(false);
    action();
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Money actions"
      description="Add something or move to a Money section."
      className="sm:max-w-lg"
    >
      <Command>
        <CommandInput placeholder="Search Money actions…" />
        <CommandList>
          <CommandEmpty>No Money action found.</CommandEmpty>
          <CommandGroup heading="Add">
            <CommandItem
              onSelect={() => run(() => onEdit({ kind: "account" }))}
            >
              <LandmarkIcon /> Add account
            </CommandItem>
            <CommandItem
              onSelect={() => run(() => onEdit({ kind: "activity" }))}
            >
              <CircleDollarSignIcon /> Add activity
            </CommandItem>
            <CommandItem
              onSelect={() => run(() => onEdit({ kind: "recurring" }))}
            >
              <ReceiptTextIcon /> Add recurring item
            </CommandItem>
            <CommandItem onSelect={() => run(() => onEdit({ kind: "goal" }))}>
              <TargetIcon /> Add goal
            </CommandItem>
            <CommandItem
              onSelect={() => run(() => onEdit({ kind: "decision" }))}
            >
              <SparklesIcon /> Add decision
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Go to">
            {sections.map((section, index) => (
              <CommandItem
                key={section}
                onSelect={() => run(() => onNavigate(section))}
              >
                <SearchIcon /> {section[0]?.toUpperCase()}
                {section.slice(1)}
                <CommandShortcut>{index + 1}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

export function MoneyPage() {
  const {
    people,
    perspective,
    isPending: isPerspectivePending,
  } = usePerspective();
  const personId =
    perspective.kind === "person" ? perspective.personId : undefined;
  const [section, setSection] = useState<MoneySection>("overview");
  const [editor, setEditor] = useState<MoneyEditorTarget | null>(null);
  const [calculationOpen, setCalculationOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const moneyQuery = useMoney(personId, !isPerspectivePending);
  const dashboard = moneyQuery.data;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function navigate(next: string) {
    if (sections.includes(next as MoneySection)) {
      setSection(next as MoneySection);
      window.requestAnimationFrame(() => {
        document.getElementById("money-content")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <motion.main
        className="dark min-h-screen overflow-x-hidden bg-background text-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mx-auto w-full max-w-[92rem] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <AppHeader section="Money" />

          <section
            className="mt-12 mb-8 lg:mt-18 lg:pl-32"
            aria-labelledby="money-title"
          >
            <div>
              <p className="mb-3 flex items-center gap-2 text-xs font-medium tracking-[0.14em] text-money-accent uppercase">
                <CircleDollarSignIcon className="size-4" /> Household clarity
              </p>
              <h1
                id="money-title"
                className="text-[clamp(2.25rem,8vw,3.35rem)] leading-[1.02] font-normal tracking-[-0.025em] sm:text-[clamp(2.6rem,4.4vw,3.35rem)]"
              >
                Money
              </h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                What’s available, what’s already spoken for, and what moves
                next.
              </p>
            </div>
          </section>

          <Tabs
            value={section}
            onValueChange={(value) => setSection(value as MoneySection)}
          >
            <div className="mb-6 overflow-x-auto border-b border-border/70 pb-1 lg:ml-32">
              <TabsList variant="line" className="h-10 min-w-max gap-5">
                {sections.map((value) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="px-0 pb-3 font-normal"
                  >
                    {value[0]?.toUpperCase()}
                    {value.slice(1)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div id="money-content" className="scroll-mt-6 pb-16 lg:pl-32">
              {moneyQuery.isPending ? <MoneyLoading /> : null}
              {moneyQuery.isError && !dashboard ? (
                <Alert variant="destructive">
                  <AlertTitle>Money could not be loaded</AlertTitle>
                  <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                    <span>
                      {moneyQuery.error instanceof Error
                        ? moneyQuery.error.message
                        : "Try again in a moment."}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void moneyQuery.refetch()}
                    >
                      Try again
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}
              {dashboard ? (
                <>
                  <TabsContent value="overview">
                    <MoneyOverview
                      dashboard={dashboard}
                      onNavigate={navigate}
                      onOpenAccount={() => setEditor({ kind: "account" })}
                      onOpenCalculation={() => setCalculationOpen(true)}
                      onOpenRecurring={() => setEditor({ kind: "recurring" })}
                      onOpenSettings={() => setSettingsOpen(true)}
                    />
                  </TabsContent>
                  <TabsContent value="accounts">
                    <AccountsSection dashboard={dashboard} onEdit={setEditor} />
                  </TabsContent>
                  <TabsContent value="recurring">
                    <RecurringSection
                      dashboard={dashboard}
                      onEdit={setEditor}
                    />
                  </TabsContent>
                  <TabsContent value="activity">
                    <ActivitySection dashboard={dashboard} onEdit={setEditor} />
                  </TabsContent>
                  <TabsContent value="goals">
                    <GoalsSection dashboard={dashboard} onEdit={setEditor} />
                  </TabsContent>
                  <TabsContent value="decisions">
                    <DecisionsSection
                      dashboard={dashboard}
                      onEdit={setEditor}
                    />
                  </TabsContent>
                </>
              ) : null}
            </div>
          </Tabs>
        </div>

        <motion.div
          className="fixed right-4 bottom-4 sm:right-6 sm:bottom-6"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={{
            type: "spring",
            stiffness: 360,
            damping: 32,
            mass: 0.75,
          }}
        >
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="rounded-full shadow-lg"
            onClick={() => setCommandOpen(true)}
          >
            <CommandIcon data-icon="inline-start" />
            Actions
            <Kbd className="ml-1 hidden sm:inline-flex">⌘ K</Kbd>
          </Button>
        </motion.div>

        <MoneyCommandPalette
          open={commandOpen}
          onOpenChange={setCommandOpen}
          onEdit={setEditor}
          onNavigate={(next) => navigate(next)}
        />
        {dashboard ? (
          <>
            <CalculationDialog
              dashboard={dashboard}
              open={calculationOpen}
              onOpenChange={setCalculationOpen}
            />
            <MoneySettingsDialog
              dashboard={dashboard}
              open={settingsOpen}
              onOpenChange={setSettingsOpen}
            />
            <MoneyEditorDialogs
              target={editor}
              onClose={() => setEditor(null)}
              dashboard={dashboard}
              people={people}
              defaultPersonIds={personId ? [personId] : []}
              {...(personId ? { personId } : {})}
            />
          </>
        ) : null}
      </motion.main>
    </MotionConfig>
  );
}
