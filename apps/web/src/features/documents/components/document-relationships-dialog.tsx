import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link2Icon } from "lucide-react";
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
import { FieldError, FieldGroup } from "@lifeos/ui/components/field";
import { Spinner } from "@lifeos/ui/components/spinner";

import { DocumentRelationshipFields } from "@/features/documents/components/document-relationship-fields";
import {
  documentModules,
  type DocumentModuleValue,
} from "@/features/documents/document-relationships";
import { documentsQueryKey } from "@/features/documents/hooks/use-documents";
import type { LifeDocument } from "@/features/documents/types";
import { usePerspective } from "@/features/perspectives/perspective-context";
import { rpcClient } from "@/lib/rpc-client";

export function DocumentRelationshipsDialog({
  document,
}: {
  document: LifeDocument;
}) {
  const queryClient = useQueryClient();
  const { dashboard, people } = usePerspective();
  const [open, setOpen] = useState(false);
  const [personIds, setPersonIds] = useState<string[]>(document.personIds);
  const [modules, setModules] = useState<DocumentModuleValue[]>(
    documentModules(document),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function prepare() {
    setPersonIds(document.personIds);
    setModules(documentModules(document));
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await rpcClient.documents.setRelationships({
        documentId: document.id,
        personIds,
        modules,
      });
      await queryClient.invalidateQueries({ queryKey: documentsQueryKey });
      toast.success("Document relationships updated.");
      setOpen(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Relationships could not be updated.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) prepare();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Link2Icon data-icon="inline-start" />
          Relationships
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Where should this document appear?</DialogTitle>
          <DialogDescription>
            Relationships change person and module views. They never move,
            duplicate, hide, or share the stored file.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-5" onSubmit={submit}>
          <FieldGroup>
            <DocumentRelationshipFields
              people={people}
              personIds={personIds}
              onPersonIdsChange={setPersonIds}
              modules={modules}
              onModulesChange={setModules}
            />
            <FieldError>{error}</FieldError>
          </FieldGroup>
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={isSaving || !dashboard}>
              {isSaving ? <Spinner data-icon="inline-start" /> : null}
              {isSaving ? "Saving…" : "Save relationships"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
