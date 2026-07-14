import { Link } from "react-router-dom";
import {
  CalendarIcon,
  CheckIcon,
  FilePlus2Icon,
  FileTextIcon,
  PencilIcon,
} from "lucide-react";

import type { ProjectRecord, ProjectStep } from "@lifeos/rpc";
import { Button } from "@lifeos/ui/components/button";
import { Checkbox } from "@lifeos/ui/components/checkbox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lifeos/ui/components/empty";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@lifeos/ui/components/field";
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@lifeos/ui/components/item";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@lifeos/ui/components/sheet";
import { Spinner } from "@lifeos/ui/components/spinner";

import { formatDueDate, getSubsteps } from "@/features/projects/project-config";

export function StepDetailSheet({
  project,
  step,
  open,
  onOpenChange,
  onEdit,
  onAttachDocuments,
  onToggleStep,
  onToggleSubstep,
  isSaving,
}: {
  project: ProjectRecord | null;
  step: ProjectStep | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (step: ProjectStep) => void;
  onAttachDocuments: (step: ProjectStep) => void;
  onToggleStep: (step: ProjectStep) => void;
  onToggleSubstep: (step: ProjectStep, completed: boolean) => void;
  isSaving: boolean;
}) {
  if (!project || !step) return null;

  const substeps = getSubsteps(project, step.id);
  const dueDate = formatDueDate(step);
  const completed = step.status === "completed";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-hidden data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        <SheetHeader className="pr-12">
          <SheetTitle className="text-xl">{step.title}</SheetTitle>
          <SheetDescription>
            {step.parentStepId ? "Preparation item" : project.title}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <div className="flex flex-col gap-7">
            {step.description ? (
              <section className="flex flex-col gap-2">
                <p className="m-0 text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  About this step
                </p>
                <p className="m-0 text-sm leading-relaxed text-foreground">
                  {step.description}
                </p>
              </section>
            ) : null}

            {dueDate ? (
              <Item variant="muted">
                <ItemMedia variant="icon">
                  <CalendarIcon />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Due {dueDate}</ItemTitle>
                </ItemContent>
              </Item>
            ) : null}

            {!step.parentStepId ? (
              <section
                className="flex flex-col gap-3"
                aria-labelledby="sheet-preparation-title"
              >
                <p
                  id="sheet-preparation-title"
                  className="m-0 text-sm text-muted-foreground"
                >
                  Before you start
                </p>
                {substeps.length > 0 ? (
                  <FieldGroup className="gap-2">
                    {substeps.map((substep) => (
                      <Field key={substep.id} orientation="horizontal">
                        <Checkbox
                          id={`substep-${substep.id}`}
                          checked={substep.status === "completed"}
                          disabled={isSaving}
                          onCheckedChange={(value) =>
                            onToggleSubstep(substep, value === true)
                          }
                        />
                        <FieldContent>
                          <FieldLabel htmlFor={`substep-${substep.id}`}>
                            {substep.title}
                          </FieldLabel>
                          {substep.description ? (
                            <FieldDescription>
                              {substep.description}
                            </FieldDescription>
                          ) : null}
                        </FieldContent>
                      </Field>
                    ))}
                  </FieldGroup>
                ) : (
                  <p className="m-0 text-sm text-muted-foreground">
                    No preparation items for this step.
                  </p>
                )}
              </section>
            ) : null}

            <section
              className="flex flex-col gap-3"
              aria-labelledby="sheet-documents-title"
            >
              <div className="flex items-center justify-between gap-3">
                <p
                  id="sheet-documents-title"
                  className="m-0 text-sm text-muted-foreground"
                >
                  Attached documents
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onAttachDocuments(step)}
                >
                  <FilePlus2Icon data-icon="inline-start" />
                  Attach
                </Button>
              </div>
              {step.documents.length > 0 ? (
                <ItemGroup className="gap-2">
                  {step.documents.map((document) => (
                    <Item key={document.id} asChild variant="outline">
                      <Link to={`/documents?document=${document.id}`}>
                        <ItemMedia variant="icon">
                          <FileTextIcon />
                        </ItemMedia>
                        <ItemContent>
                          <ItemTitle>{document.title}</ItemTitle>
                        </ItemContent>
                      </Link>
                    </Item>
                  ))}
                </ItemGroup>
              ) : (
                <Empty className="min-h-40 border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FileTextIcon />
                    </EmptyMedia>
                    <EmptyTitle>Nothing attached</EmptyTitle>
                    <EmptyDescription>
                      Attach anything you will need before starting.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </section>
          </div>
        </div>

        <SheetFooter className="border-t bg-muted/30">
          <Button
            type="button"
            disabled={isSaving}
            onClick={() => onToggleStep(step)}
          >
            {isSaving ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            {isSaving
              ? "Updating…"
              : completed
                ? "Mark incomplete"
                : "Mark complete"}
          </Button>
          <Button type="button" variant="outline" onClick={() => onEdit(step)}>
            <PencilIcon data-icon="inline-start" />
            Edit step
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
