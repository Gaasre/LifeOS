import { useId, useState } from "react";
import {
  FileImageIcon,
  FilePlus2Icon,
  FileTextIcon,
  UploadCloudIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@lifeos/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@lifeos/ui/components/dialog";
import { Field, FieldGroup, FieldLabel } from "@lifeos/ui/components/field";

export function AddDocumentDialog() {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  function handleImport() {
    if (!file) return;
    toast.success(`${file.name} added for review.`);
    setFile(null);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FilePlus2Icon data-icon="inline-start" />
          Add document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a document</DialogTitle>
          <DialogDescription>
            Choose a PDF or image. LifeOS will prepare a structured draft for
            you to review.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={inputId} className="sr-only">
              Choose a PDF or image
            </FieldLabel>
            <label
              htmlFor={inputId}
              className="flex min-h-48 cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center outline-none transition-colors hover:bg-muted/50 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
            >
              <span className="flex size-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <UploadCloudIcon className="size-5" aria-hidden />
              </span>
              <span className="flex flex-col gap-1">
                <span className="font-medium">
                  {file ? file.name : "Choose a PDF or image"}
                </span>
                <span className="text-sm text-muted-foreground">
                  PDF, PNG, JPG, or HEIC · up to 50 MB
                </span>
              </span>
              <span className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <FileTextIcon className="size-3.5" aria-hidden /> PDF
                </span>
                <span className="flex items-center gap-1">
                  <FileImageIcon className="size-3.5" aria-hidden /> Image
                </span>
              </span>
              <input
                id={inputId}
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/heic"
                className="sr-only"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
          </Field>
        </FieldGroup>

        <DialogFooter showCloseButton>
          <Button type="button" disabled={!file} onClick={handleImport}>
            <FilePlus2Icon data-icon="inline-start" />
            Add for review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
