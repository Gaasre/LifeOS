import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { SparklesIcon } from "lucide-react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";

import { Button } from "@lifeos/ui/components/button";
import { Spinner } from "@lifeos/ui/components/spinner";
import { cn } from "@lifeos/ui/lib/utils";

const AssistantDock = lazy(() =>
  import("./assistant-dock").then((module) => ({
    default: module.AssistantDock,
  })),
);

const assistantSpring = {
  type: "spring",
  stiffness: 390,
  damping: 38,
  mass: 0.9,
} as const;

export function AssistantRoot() {
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [panelContentVisible, setPanelContentVisible] = useState(false);
  const [launcherContentVisible, setLauncherContentVisible] = useState(true);
  const closeTimerRef = useRef<number | null>(null);

  const setAssistantOpen = (nextOpen: boolean) => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setLauncherContentVisible(false);

    if (nextOpen) {
      setHasOpened(true);
      setPanelContentVisible(false);
      setOpen(true);
      return;
    }

    setPanelContentVisible(false);
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, 120);
  };

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (open || launcherContentVisible) return;
    const fallbackTimer = window.setTimeout(
      () => setLauncherContentVisible(true),
      700,
    );
    return () => window.clearTimeout(fallbackTimer);
  }, [launcherContentVisible, open]);

  useEffect(() => {
    if (!open || panelContentVisible || closeTimerRef.current !== null) return;
    const fallbackTimer = window.setTimeout(
      () => setPanelContentVisible(true),
      700,
    );
    return () => window.clearTimeout(fallbackTimer);
  }, [open, panelContentVisible]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLocaleLowerCase() === "j"
      ) {
        event.preventDefault();
        setAssistantOpen(!open);
        return;
      }

      if (event.key === "Escape" && open) {
        event.preventDefault();
        setAssistantOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <MotionConfig reducedMotion="user">
      <motion.aside
        layout
        initial={false}
        animate={{ borderRadius: open ? 26 : 999 }}
        transition={assistantSpring}
        onLayoutAnimationComplete={() => {
          if (open && closeTimerRef.current === null) {
            setPanelContentVisible(true);
          } else if (!open) {
            setLauncherContentVisible(true);
          }
        }}
        className={cn(
          "dark fixed z-50 isolate overflow-hidden border border-foreground/15 text-foreground ring-1 ring-foreground/5 backdrop-blur-2xl backdrop-saturate-150",
          open
            ? "bottom-4 left-4 h-[min(46rem,calc(100dvh-2rem))] w-[calc(100vw-2rem)] bg-background/85 shadow-2xl sm:bottom-6 sm:left-6 sm:h-[min(46rem,calc(100dvh-3rem))] sm:w-[26rem]"
            : "bottom-4 left-4 h-12 w-37 border-foreground/20 bg-card/70 ring-foreground/10 shadow-[0_18px_55px_-18px_rgb(0_0_0_/_0.95),0_4px_16px_-8px_rgb(0_0_0_/_0.8),inset_0_1px_0_rgb(255_255_255_/_0.16),inset_0_-1px_0_rgb(255_255_255_/_0.03)] sm:bottom-6 sm:left-6",
        )}
        aria-label="LifeOS AI assistant"
      >
        {hasOpened ? (
          <motion.div
            initial={false}
            animate={{ opacity: panelContentVisible ? 1 : 0 }}
            transition={{
              duration: panelContentVisible ? 0.16 : 0.1,
              ease: "easeOut",
            }}
            className={cn(
              "absolute inset-0 size-full",
              !panelContentVisible && "pointer-events-none",
            )}
            aria-hidden={!panelContentVisible}
            inert={!panelContentVisible}
          >
            <Suspense
              fallback={
                <div className="grid size-full place-items-center text-muted-foreground">
                  <Spinner aria-label="Opening LifeOS AI" />
                </div>
              }
            >
              <AssistantDock
                open={panelContentVisible}
                onOpenChange={setAssistantOpen}
              />
            </Suspense>
          </motion.div>
        ) : null}

        <AnimatePresence initial={false}>
          {!open ? (
            <motion.div
              key="assistant-launcher"
              initial={{ opacity: 0, scale: 0.82 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.86 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="group/assistant-launcher absolute inset-0 overflow-hidden rounded-full"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-px rounded-full bg-gradient-to-b from-foreground/[0.14] via-foreground/[0.035] to-transparent opacity-80 transition-opacity duration-300 ease-out group-hover/assistant-launcher:opacity-100"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute -top-5 left-7 h-10 w-24 -rotate-6 rounded-full bg-foreground/[0.09] opacity-70 blur-xl transition-opacity duration-500 ease-out group-hover/assistant-launcher:opacity-100"
              />
              <Button
                type="button"
                variant="ghost"
                size="lg"
                className="relative z-10 size-full rounded-full bg-transparent text-foreground/90 shadow-none transition-colors duration-300 ease-out hover:bg-foreground/[0.055] hover:text-foreground"
                onClick={() => setAssistantOpen(true)}
                aria-label="Open LifeOS AI"
                aria-controls="lifeos-assistant-panel"
                aria-expanded={open}
                title={`Open LifeOS AI (${navigator.platform.includes("Mac") ? "Cmd" : "Ctrl"} J)`}
              >
                {launcherContentVisible ? (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.14, ease: "easeOut" }}
                    className="flex items-center gap-1.5"
                  >
                    <SparklesIcon data-icon="inline-start" aria-hidden />
                    <span>Ask LifeOS</span>
                  </motion.span>
                ) : null}
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.aside>
    </MotionConfig>
  );
}
