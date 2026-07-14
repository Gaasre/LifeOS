import { FileImageIcon, FileTextIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { Skeleton } from "@lifeos/ui/components/skeleton";
import { cn } from "@lifeos/ui/lib/utils";

import { documentEase } from "@/features/documents/document-motion";
import { useDocumentPreviewUrl } from "@/features/documents/hooks/use-documents";
import type { LifeDocument } from "@/features/documents/types";

type DocumentFilePreviewProps = {
  document: LifeDocument;
  alt: string;
  className?: string;
  fit?: "cover" | "contain";
  priority?: boolean;
};

function useNearViewport(priority: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(priority);

  useEffect(() => {
    if (priority) {
      setIsNearViewport(true);
      return;
    }

    const element = ref.current;
    if (!element || !("IntersectionObserver" in window)) {
      setIsNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setIsNearViewport(true);
        observer.disconnect();
      },
      { rootMargin: "320px" },
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, [priority]);

  return { ref, isNearViewport };
}

function PreviewPlaceholder({
  mediaType,
  state,
}: {
  mediaType: LifeDocument["mediaType"];
  state: "loading" | "unavailable";
}) {
  const Icon = mediaType === "PDF" ? FileTextIcon : FileImageIcon;
  const label = state === "loading" ? "Loading preview" : "Preview unavailable";

  return (
    <div
      className="relative flex size-full items-center justify-center overflow-hidden bg-muted/60 text-muted-foreground"
      aria-label={label}
      role="img"
    >
      {state === "loading" ? (
        <Skeleton className="absolute inset-0 rounded-none motion-reduce:animate-none" />
      ) : null}
      <Icon className="relative size-8" aria-hidden />
    </div>
  );
}

export function DocumentFilePreview({
  document,
  alt,
  className,
  fit = "cover",
  priority = false,
}: DocumentFilePreviewProps) {
  const { ref, isNearViewport } = useNearViewport(priority);
  const preview = useDocumentPreviewUrl(
    document.id,
    isNearViewport && document.fileStatus === "ready",
  );
  const url = preview.data?.url ?? null;
  const [imageState, setImageState] = useState<{
    url: string;
    status: "ready" | "failed";
  } | null>(null);
  const isImageReady =
    url !== null && imageState?.url === url && imageState.status === "ready";
  const imageFailed =
    url !== null && imageState?.url === url && imageState.status === "failed";
  const isLoading =
    document.fileStatus === "pending" ||
    (document.fileStatus === "ready" &&
      (preview.isPending ||
        preview.data?.status === "pending" ||
        (url !== null && !isImageReady && !imageFailed)));

  return (
    <div
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      aria-busy={isLoading || undefined}
    >
      <AnimatePresence initial={false}>
        {!isImageReady ? (
          <motion.div
            key="preview-placeholder"
            className="absolute inset-0"
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: documentEase }}
          >
            <PreviewPlaceholder
              mediaType={document.mediaType}
              state={isLoading ? "loading" : "unavailable"}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {url && !imageFailed ? (
        <motion.img
          key={url}
          src={url}
          alt={alt}
          width={1086}
          height={1448}
          loading={priority ? "eager" : "lazy"}
          className={cn(
            "absolute inset-0 size-full object-top",
            fit === "cover" ? "object-cover" : "object-contain",
          )}
          initial={{ opacity: 0, scale: 1.006 }}
          animate={{
            opacity: isImageReady ? 1 : 0,
            scale: isImageReady ? 1 : 1.006,
          }}
          transition={{ duration: 0.3, ease: documentEase }}
          onLoad={(event) => {
            const image = event.currentTarget;
            const markReady = () => {
              setImageState((current) =>
                current?.url === url && current.status === "failed"
                  ? current
                  : { url, status: "ready" },
              );
            };

            void image.decode().then(markReady, markReady);
          }}
          onError={() => setImageState({ url, status: "failed" })}
        />
      ) : null}
    </div>
  );
}
