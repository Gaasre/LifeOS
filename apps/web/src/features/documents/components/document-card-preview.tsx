import type { ReactNode } from "react";
import {
  ArchiveIcon,
  CircleDollarSignIcon,
  FileImageIcon,
  FileTextIcon,
  HeartIcon,
  HomeIcon,
  ImageIcon,
  PlaneIcon,
} from "lucide-react";

import { Badge } from "@lifeos/ui/components/badge";

import { DocumentFilePreview } from "@/features/documents/components/document-file-preview";
import type { DocumentArea, LifeDocument } from "@/features/documents/types";

const areaIcons: Record<DocumentArea, typeof HomeIcon> = {
  Home: HomeIcon,
  Money: CircleDollarSignIcon,
  Health: HeartIcon,
  Work: FileTextIcon,
  Travel: PlaneIcon,
  Projects: ArchiveIcon,
  Memories: ImageIcon,
};

type DocumentCardPreviewProps = {
  document: LifeDocument;
  onOpen: (document: LifeDocument) => void;
  priority: boolean;
  titleId: string;
  actions: ReactNode;
};

function getFormatLine(document: LifeDocument) {
  if (document.mediaType === "PDF") {
    const pageCount = document.pageCount ?? 1;
    return `PDF · ${pageCount} ${pageCount === 1 ? "page" : "pages"}`;
  }

  const format = document.mimeType.split("/")[1]?.toUpperCase() ?? "IMAGE";
  return `${format} · ${document.sizeMb.toFixed(1)} MB`;
}

export function DocumentCardPreview({
  document,
  onOpen,
  priority,
  titleId,
  actions,
}: DocumentCardPreviewProps) {
  return (
    <div className="relative isolate h-[28rem] overflow-hidden bg-card sm:h-[23rem] lg:h-[24rem] xl:h-[22rem] 2xl:h-[24rem]">
      <button
        type="button"
        className="absolute inset-0 z-0 block size-full cursor-zoom-in text-left outline-none"
        onClick={() => onOpen(document)}
        aria-label={`Open ${document.title}`}
      >
        <DocumentFilePreview
          document={document}
          alt={`Preview of ${document.title}`}
          priority={priority}
          className="size-full brightness-[0.82] grayscale-[0.55]"
        />
        <span
          className="absolute inset-0 bg-black/18 opacity-100 transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity] group-hover/document:opacity-0 group-focus-within/document:opacity-0 motion-reduce:transition-none"
          aria-hidden
        />
      </button>

      <div
        className="pointer-events-none absolute inset-x-0 -bottom-px z-10 h-[68%] bg-gradient-to-t from-card from-[18%] via-card/95 via-[52%] to-transparent"
        aria-hidden
      />

      <Badge
        variant="secondary"
        className="pointer-events-none absolute top-3 left-3 z-20 shadow-sm backdrop-blur-md"
      >
        {document.mediaType === "PDF" ? <FileTextIcon /> : <FileImageIcon />}
        {document.mediaType}
      </Badge>

      {actions}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4 pt-16">
        <h3
          id={titleId}
          className="line-clamp-2 font-heading text-xl leading-tight font-medium text-card-foreground sm:text-lg lg:text-xl"
        >
          {document.title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {getFormatLine(document)}
        </p>

        <div
          className="mt-3 flex min-w-0 flex-wrap gap-1.5"
          aria-label="Connected life areas"
        >
          {document.areas.slice(0, 2).map((area) => {
            const AreaIcon = areaIcons[area];
            return (
              <Badge
                key={area}
                variant="outline"
                className="border-foreground/15 bg-card/58 text-card-foreground shadow-sm backdrop-blur-md"
              >
                <AreaIcon />
                {area}
              </Badge>
            );
          })}
          {document.areas.length > 2 ? (
            <Badge
              variant="outline"
              className="border-foreground/15 bg-card/58 text-card-foreground shadow-sm backdrop-blur-md"
            >
              +{document.areas.length - 2}
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}
