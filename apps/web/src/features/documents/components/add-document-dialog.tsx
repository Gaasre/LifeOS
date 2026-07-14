import { useId, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  FileImageIcon,
  FilePlus2Icon,
  FileTextIcon,
  UploadCloudIcon,
} from "lucide-react";
import { toast } from "sonner";

import type { PersonSummary } from "@lifeos/rpc";
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@lifeos/ui/components/field";
import { Input } from "@lifeos/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lifeos/ui/components/select";
import { Spinner } from "@lifeos/ui/components/spinner";

import { DocumentRelationshipFields } from "@/features/documents/components/document-relationship-fields";
import type { DocumentModuleValue } from "@/features/documents/document-relationships";
import { documentsQueryKey } from "@/features/documents/hooks/use-documents";
import { DOCUMENT_KINDS, type DocumentKind } from "@/features/documents/types";
import { rpcClient } from "@/lib/rpc-client";

const contentTypeByExtension: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  heic: "image/heic",
  heif: "image/heif",
};

const allowedContentTypes = new Set(Object.values(contentTypeByExtension));

function titleFromFilename(filename: string) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

function contentTypeFor(file: File) {
  if (allowedContentTypes.has(file.type)) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension ? (contentTypeByExtension[extension] ?? null) : null;
}

function errorMessage(error: unknown) {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return "The secure upload could not reach storage. Check that R2 CORS allows this exact web origin.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "The document could not be added.";
}

type AddDocumentDialogProps = {
  people: PersonSummary[];
  defaultPersonIds: string[];
  defaultPersonLabel: string;
};

export function AddDocumentDialog({
  people,
  defaultPersonIds,
  defaultPersonLabel,
}: AddDocumentDialogProps) {
  const inputId = useId();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<DocumentKind>("Other");
  const [personIds, setPersonIds] = useState<string[]>(defaultPersonIds);
  const [modules, setModules] = useState<DocumentModuleValue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  function reset() {
    setFile(null);
    setTitle("");
    setKind("Other");
    setPersonIds(defaultPersonIds);
    setModules([]);
    setError(null);
    setIsUploading(false);
  }

  function selectFile(nextFile: File | null) {
    setFile(nextFile);
    setError(null);
    if (nextFile) {
      setTitle((current) => current || titleFromFilename(nextFile.name));
    }
  }

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;

    const contentType = contentTypeFor(file);
    if (!contentType) {
      setError("Choose a PDF, PNG, JPG, HEIC, or HEIF file.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("Choose a file no larger than 50 MB.");
      return;
    }

    const documentTitle = title.trim() || titleFromFilename(file.name);
    if (!documentTitle) {
      setError("Add a title for this document.");
      return;
    }

    setError(null);
    setIsUploading(true);
    let pendingUploadDocumentId: string | null = null;
    let uploadedToStorage = false;

    try {
      const intent = await rpcClient.documents.createUpload({
        title: documentTitle,
        kind,
        issuer: "Unknown",
        filename: file.name,
        contentType: contentType as
          | "application/pdf"
          | "image/png"
          | "image/jpeg"
          | "image/heic"
          | "image/heif",
        sizeBytes: file.size,
        personIds,
        modules,
      });
      pendingUploadDocumentId = intent.documentId;
      const uploadResponse = await fetch(intent.upload.url, {
        method: intent.upload.method,
        headers: intent.upload.headers,
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("The secure upload was rejected. Please try again.");
      }
      uploadedToStorage = true;

      await rpcClient.documents.completeUpload({
        documentId: intent.documentId,
        fileId: intent.fileId,
      });
      await queryClient.invalidateQueries({ queryKey: documentsQueryKey });
      toast.success(`${documentTitle} is safely stored.`);
      setOpen(false);
      reset();
    } catch (caught) {
      if (pendingUploadDocumentId && !uploadedToStorage) {
        await rpcClient.documents
          .delete({ documentId: pendingUploadDocumentId })
          .catch(() => undefined);
      }
      setError(errorMessage(caught));
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setPersonIds(defaultPersonIds);
          setModules([]);
        } else {
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FilePlus2Icon data-icon="inline-start" />
          Add document
        </Button>
      </DialogTrigger>
      <DialogContent className="h-[min(90dvh,52rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:max-w-xl">
        <DialogHeader className="pr-8">
          <DialogTitle>Add a document</DialogTitle>
          <DialogDescription>
            LifeOS stores the original once in the household vault. People and
            module relationships determine where it appears.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-4"
          onSubmit={handleImport}
        >
          <div className="-mx-4 min-h-0 overflow-y-auto overscroll-contain px-4">
            <FieldGroup className="pb-1">
              <Field>
                <FieldLabel htmlFor={inputId} className="sr-only">
                  Choose a PDF or image
                </FieldLabel>
                <label
                  htmlFor={inputId}
                  className="flex min-h-44 cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-8 text-center outline-none transition-colors hover:bg-muted/50 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
                >
                  <span className="flex size-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                    <UploadCloudIcon className="size-5" aria-hidden />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="font-medium">
                      {file ? file.name : "Choose a PDF or image"}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      PDF, PNG, JPG, HEIC, or HEIF · up to 50 MB
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
                    accept="application/pdf,image/png,image/jpeg,image/heic,image/heif"
                    className="sr-only"
                    onChange={(event) =>
                      selectFile(event.target.files?.[0] ?? null)
                    }
                  />
                </label>
              </Field>

              <Field>
                <FieldLabel htmlFor="document-title">Title</FieldLabel>
                <Input
                  id="document-title"
                  value={title}
                  maxLength={160}
                  placeholder="Rental agreement"
                  onChange={(event) => setTitle(event.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel>Kind</FieldLabel>
                <Select
                  value={kind}
                  onValueChange={(value) => setKind(value as DocumentKind)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {DOCUMENT_KINDS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <FieldSeparator className="[&_[data-slot=field-separator-content]]:bg-popover">
                Appears in
              </FieldSeparator>

              <DocumentRelationshipFields
                people={people}
                personIds={personIds}
                onPersonIdsChange={setPersonIds}
                modules={modules}
                onModulesChange={setModules}
                peopleDescription={`${defaultPersonLabel} is selected by default. Change this when the document belongs to someone else, both people, or the household.`}
              />

              <FieldError>{error}</FieldError>
            </FieldGroup>
          </div>

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={!file || isUploading}>
              {isUploading ? <Spinner data-icon="inline-start" /> : null}
              {isUploading ? "Uploading…" : "Store document"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
