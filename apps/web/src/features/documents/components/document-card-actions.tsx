import { useState } from "react";
import {
  ArchiveIcon,
  EyeIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@lifeos/ui/components/alert-dialog";
import { Button } from "@lifeos/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lifeos/ui/components/dropdown-menu";
import { Spinner } from "@lifeos/ui/components/spinner";

import {
  useDeleteDocument,
  useSetDocumentArchived,
} from "@/features/documents/hooks/use-documents";
import type { LifeDocument } from "@/features/documents/types";

type DocumentCardActionsProps = {
  document: LifeDocument;
  onOpen: (document: LifeDocument) => void;
};

export function DocumentCardActions({
  document,
  onOpen,
}: DocumentCardActionsProps) {
  const archiveDocument = useSetDocumentArchived();
  const deleteDocument = useDeleteDocument();
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);

  function archive() {
    archiveDocument.mutate(
      { documentId: document.id, archived: true },
      {
        onSuccess: () => toast.success(`${document.title} moved to Archive.`),
        onError: (error) =>
          toast.error(
            error instanceof Error && error.message
              ? error.message
              : "The document could not be archived.",
          ),
      },
    );
  }

  function remove() {
    deleteDocument.mutate(
      { documentId: document.id },
      {
        onSuccess: () => {
          toast.success(`${document.title} was deleted.`);
          setDeleteConfirmationOpen(false);
        },
        onError: (error) =>
          toast.error(
            error instanceof Error && error.message
              ? error.message
              : "The document could not be deleted.",
          ),
      },
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="absolute top-3 right-3 z-30 scale-100 opacity-100 shadow-sm backdrop-blur-md transition-[opacity,scale] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] sm:scale-95 sm:opacity-0 sm:group-hover/document:scale-100 sm:group-hover/document:opacity-100 sm:group-focus-within/document:scale-100 sm:group-focus-within/document:opacity-100 data-[state=open]:scale-100 data-[state=open]:opacity-100 motion-reduce:transition-none"
            aria-label={`More actions for ${document.title}`}
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-60">
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="whitespace-nowrap"
              onSelect={() => onOpen(document)}
            >
              <EyeIcon />
              Open record
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="whitespace-nowrap"
              disabled={archiveDocument.isPending}
              onSelect={archive}
            >
              <ArchiveIcon />
              Archive
            </DropdownMenuItem>
            <DropdownMenuItem
              className="whitespace-nowrap"
              variant="destructive"
              disabled={deleteDocument.isPending}
              onSelect={() => setDeleteConfirmationOpen(true)}
            >
              <Trash2Icon />
              Delete document
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={deleteConfirmationOpen}
        onOpenChange={setDeleteConfirmationOpen}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {document.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the document record and its stored file.
              It cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep document</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteDocument.isPending}
              onClick={() => void remove()}
            >
              {deleteDocument.isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Trash2Icon data-icon="inline-start" />
              )}
              {deleteDocument.isPending ? "Deleting…" : "Delete document"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
