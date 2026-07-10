import { useMemo, useState } from "react";
import {
  ArrowLeftIcon,
  CheckCheckIcon,
  CheckCircle2Icon,
  FileCheck2Icon,
  SaveIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

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

import { AppHeader } from "@/components/app-header";
import { DocumentSourceViewer } from "@/features/documents/review/components/document-source-viewer";
import { ExtractedFieldRow } from "@/features/documents/review/components/extracted-field-row";
import { ReviewSection } from "@/features/documents/review/components/review-section";
import { ReviewSuggestions } from "@/features/documents/review/components/review-suggestions";
import {
  RENTAL_NEEDS_REVIEW,
  RENTAL_REVIEW_SECTIONS,
  RENTAL_REVIEW_SUGGESTIONS,
} from "@/features/documents/review/data/rental-review";
import type {
  ReviewField,
  ReviewFieldStatus,
  ReviewSuggestion,
} from "@/features/documents/review/types";

const allFields = [
  ...RENTAL_NEEDS_REVIEW,
  ...RENTAL_REVIEW_SECTIONS.flatMap((section) => section.fields),
];

const initialValues = Object.fromEntries(
  allFields.map((field) => [field.id, field.value]),
);

const initialStatuses = Object.fromEntries(
  allFields.map((field) => [field.id, field.status]),
) as Record<string, ReviewFieldStatus>;

const firstReviewField = RENTAL_NEEDS_REVIEW[0]!;

export function DocumentReviewPage() {
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [statuses, setStatuses] =
    useState<Record<string, ReviewFieldStatus>>(initialStatuses);
  const [selectedFieldId, setSelectedFieldId] = useState(firstReviewField.id);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [zoom, setZoom] = useState(100);
  const [suggestions, setSuggestions] = useState(RENTAL_REVIEW_SUGGESTIONS);
  const [acceptedSuggestionIds, setAcceptedSuggestionIds] = useState<string[]>(
    [],
  );
  const [finished, setFinished] = useState(false);

  const selectedField =
    allFields.find((field) => field.id === selectedFieldId) ?? firstReviewField;

  const needsReviewCount = useMemo(
    () =>
      Object.values(statuses).filter((status) => status === "needs-review")
        .length,
    [statuses],
  );

  function selectField(field: ReviewField) {
    setSelectedFieldId(field.id);
  }

  function beginEdit(field: ReviewField) {
    selectField(field);
    setEditingFieldId(field.id);
    setDraftValue(values[field.id] ?? field.value);
  }

  function saveEdit() {
    if (!editingFieldId) {
      return;
    }

    const field = allFields.find((item) => item.id === editingFieldId);
    setValues((current) => ({
      ...current,
      [editingFieldId]: draftValue.trim() || current[editingFieldId] || "",
    }));
    setStatuses((current) => ({
      ...current,
      [editingFieldId]: "verified",
    }));
    setEditingFieldId(null);
    toast.success(`${field?.label ?? "Field"} updated and verified.`);
  }

  function verifyField(field: ReviewField) {
    selectField(field);
    setStatuses((current) => ({ ...current, [field.id]: "verified" }));
    toast.success(`${field.label} verified.`);
  }

  function markAllReviewed() {
    if (needsReviewCount === 0) {
      return;
    }

    setStatuses((current) =>
      Object.fromEntries(
        Object.entries(current).map(([fieldId, status]) => [
          fieldId,
          status === "needs-review" ? "verified" : status,
        ]),
      ),
    );
    setEditingFieldId(null);
    toast.success(
      `${needsReviewCount} ${needsReviewCount === 1 ? "item" : "items"} marked reviewed.`,
    );
  }

  function acceptSuggestion(suggestion: ReviewSuggestion) {
    setAcceptedSuggestionIds((current) =>
      current.includes(suggestion.id) ? current : [...current, suggestion.id],
    );
    toast.success(`${suggestion.title} added to the draft.`);
  }

  function acceptAllSuggestions() {
    const pendingSuggestionIds = suggestions
      .filter((suggestion) => !acceptedSuggestionIds.includes(suggestion.id))
      .map((suggestion) => suggestion.id);

    if (pendingSuggestionIds.length === 0) {
      return;
    }

    setAcceptedSuggestionIds((current) => [
      ...current,
      ...pendingSuggestionIds,
    ]);
    toast.success(
      `${pendingSuggestionIds.length} ${pendingSuggestionIds.length === 1 ? "suggestion" : "suggestions"} added to the draft.`,
    );
  }

  function dismissSuggestion(suggestion: ReviewSuggestion) {
    setSuggestions((current) =>
      current.filter((item) => item.id !== suggestion.id),
    );
    toast(`${suggestion.title} dismissed.`);
  }

  function finishReview() {
    setFinished(true);
    toast.success("Review complete. The structured record is ready.");
  }

  return (
    <main className="dark min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="mx-auto w-full max-w-[96rem] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <AppHeader section="Documents" />

        <div className="mt-5 flex min-w-0 flex-col gap-5">
          <header className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 flex-col gap-2.5">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="-ml-2 w-fit text-muted-foreground"
              >
                <Link to="/documents">
                  <ArrowLeftIcon data-icon="inline-start" />
                  Back to Documents
                </Link>
              </Button>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="m-0 flex items-center gap-2 text-xs font-medium text-warning">
                  <span
                    className="size-1.5 rounded-full bg-warning"
                    aria-hidden
                  />
                  {finished ? "Review complete" : "Draft ready for review"}
                </p>
                <h1 className="m-0 truncate text-[clamp(2rem,4vw,3rem)] leading-none font-normal tracking-[-0.025em]">
                  Rental Agreement
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                <FileCheck2Icon />
                {allFields.length} extracted
              </Badge>
              <Badge
                variant="outline"
                className={
                  needsReviewCount > 0
                    ? "border-warning/30 text-warning"
                    : "border-success/30 text-success"
                }
              >
                {needsReviewCount > 0 ? (
                  `${needsReviewCount} need review`
                ) : (
                  <>
                    <CheckCircle2Icon />
                    All reviewed
                  </>
                )}
              </Badge>
            </div>
          </header>

          <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(24rem,0.88fr)]">
            <DocumentSourceViewer
              selectedField={selectedField}
              zoom={zoom}
              onZoomChange={setZoom}
            />

            <div className="flex min-w-0 flex-col gap-4">
              <Card className="gap-0 py-0">
                <CardHeader className="border-b py-3.5">
                  <CardTitle>Extracted record</CardTitle>
                  <CardDescription className="text-xs">
                    Select any field to see where it came from.
                  </CardDescription>
                  <CardAction>
                    <Badge variant="secondary">Structured draft</Badge>
                  </CardAction>
                </CardHeader>

                <CardContent className="flex min-w-0 flex-col gap-4 px-3 py-4 sm:px-4">
                  <section className="flex min-w-0 flex-col gap-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                      <h2 className="font-heading text-sm font-medium">
                        Needs review
                      </h2>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {needsReviewCount} open
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={markAllReviewed}
                          disabled={needsReviewCount === 0}
                        >
                          {needsReviewCount === 0 ? (
                            <CheckCircle2Icon data-icon="inline-start" />
                          ) : (
                            <CheckCheckIcon data-icon="inline-start" />
                          )}
                          {needsReviewCount === 0
                            ? "All reviewed"
                            : "Mark all reviewed"}
                        </Button>
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-col divide-y divide-border/60 rounded-lg border border-warning/18 bg-warning/4 px-1">
                      {RENTAL_NEEDS_REVIEW.map((field) => (
                        <ExtractedFieldRow
                          key={field.id}
                          field={field}
                          value={values[field.id] ?? field.value}
                          status={statuses[field.id] ?? field.status}
                          selected={selectedFieldId === field.id}
                          editing={editingFieldId === field.id}
                          draftValue={draftValue}
                          onSelect={() => selectField(field)}
                          onBeginEdit={() => beginEdit(field)}
                          onDraftValueChange={setDraftValue}
                          onSaveEdit={saveEdit}
                          onCancelEdit={() => setEditingFieldId(null)}
                          onVerify={() => verifyField(field)}
                        />
                      ))}
                    </div>
                  </section>

                  {RENTAL_REVIEW_SECTIONS.map((section) => (
                    <ReviewSection
                      key={section.id}
                      section={section}
                      values={values}
                      statuses={statuses}
                      selectedFieldId={selectedFieldId}
                      editingFieldId={editingFieldId}
                      draftValue={draftValue}
                      onSelectField={selectField}
                      onBeginEdit={beginEdit}
                      onDraftValueChange={setDraftValue}
                      onSaveEdit={saveEdit}
                      onCancelEdit={() => setEditingFieldId(null)}
                      onVerifyField={verifyField}
                    />
                  ))}
                </CardContent>
              </Card>

              <ReviewSuggestions
                suggestions={suggestions}
                acceptedIds={acceptedSuggestionIds}
                onAccept={acceptSuggestion}
                onAcceptAll={acceptAllSuggestions}
                onDismiss={dismissSuggestion}
              />

              <div className="sticky bottom-3 z-10 flex flex-col gap-2 rounded-xl border border-border/80 bg-background/92 p-2.5 shadow-[0_18px_50px_-28px_rgb(0_0_0_/_0.95)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-muted-foreground">
                  Original remains unchanged
                </span>
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toast.success("Draft saved locally.")}
                  >
                    <SaveIcon data-icon="inline-start" />
                    Save draft
                  </Button>
                  <Button
                    type="button"
                    onClick={finishReview}
                    disabled={finished}
                  >
                    <CheckCircle2Icon data-icon="inline-start" />
                    {finished ? "Review complete" : "Finish review"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
