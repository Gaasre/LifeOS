import { useCallback, useEffect, useRef } from "react";
import { MinusIcon, PlusIcon, ScanSearchIcon } from "lucide-react";

import { Badge } from "@lifeos/ui/components/badge";
import { Button } from "@lifeos/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@lifeos/ui/components/card";

import { RENTAL_REVIEW_SOURCE } from "@/features/documents/review/data/rental-review";
import type { ReviewField } from "@/features/documents/review/types";

type DocumentSourceViewerProps = {
  selectedField: ReviewField;
  zoom: number;
  onZoomChange: (zoom: number) => void;
};

export function DocumentSourceViewer({
  selectedField,
  zoom,
  onZoomChange,
}: DocumentSourceViewerProps) {
  const region = selectedField.evidence.region;
  const viewportRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const scrollToEvidence = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const viewport = viewportRef.current;
      const page = pageRef.current;

      if (!viewport || !page) {
        return;
      }

      const evidenceMiddle =
        page.offsetTop +
        page.offsetHeight * ((region.top + region.height / 2) / 100);

      viewport.scrollTo({
        top: Math.max(0, evidenceMiddle - viewport.clientHeight / 2),
        behavior,
      });
    },
    [region.height, region.top],
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => scrollToEvidence());
    return () => cancelAnimationFrame(frame);
  }, [scrollToEvidence, zoom]);

  return (
    <Card className="min-h-0 gap-0 py-0 lg:sticky lg:top-6 lg:h-[calc(100vh-13.25rem)] lg:max-h-[54rem]">
      <CardHeader className="border-b py-3">
        <CardTitle className="truncate text-sm">
          {RENTAL_REVIEW_SOURCE.filename}
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-1.5 text-xs">
          Page {selectedField.evidence.page} of {RENTAL_REVIEW_SOURCE.pageCount}
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1 text-warning">
            <ScanSearchIcon className="size-3" aria-hidden />
            {selectedField.evidence.section}
          </span>
        </CardDescription>
        <CardAction className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onZoomChange(Math.max(75, zoom - 10))}
            disabled={zoom <= 75}
            aria-label="Zoom out"
          >
            <MinusIcon />
          </Button>
          <Badge variant="outline" className="min-w-13 tabular-nums">
            {zoom}%
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onZoomChange(Math.min(125, zoom + 10))}
            disabled={zoom >= 125}
            aria-label="Zoom in"
          >
            <PlusIcon />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent
        ref={viewportRef}
        className="min-h-0 flex-1 overflow-auto bg-muted/35 p-3 sm:p-5"
      >
        <div
          ref={pageRef}
          className="relative mx-auto overflow-hidden rounded-sm bg-white shadow-[0_18px_60px_-24px_rgb(0_0_0_/_0.9)] transition-[width] duration-200"
          style={{ width: `${zoom}%` }}
        >
          <img
            src={RENTAL_REVIEW_SOURCE.preview}
            alt="Rental agreement source document"
            width={1086}
            height={1448}
            className="block h-auto w-full"
            onLoad={() => scrollToEvidence("auto")}
          />
          <span
            className="pointer-events-none absolute rounded-sm border border-warning bg-warning/18 shadow-[0_0_0_1px_rgb(0_0_0_/_0.12)] transition-all duration-300"
            style={{
              left: `${region.left}%`,
              top: `${region.top}%`,
              width: `${region.width}%`,
              height: `${region.height}%`,
            }}
            aria-hidden
          />
        </div>
      </CardContent>
    </Card>
  );
}
