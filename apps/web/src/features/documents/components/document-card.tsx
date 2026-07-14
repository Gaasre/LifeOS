import { Card } from "@lifeos/ui/components/card";

import { DocumentCardActions } from "@/features/documents/components/document-card-actions";
import { DocumentCardPreview } from "@/features/documents/components/document-card-preview";
import { DocumentCardStatus } from "@/features/documents/components/document-card-status";
import type { LifeDocument } from "@/features/documents/types";

type DocumentCardProps = {
  document: LifeDocument;
  onOpen: (document: LifeDocument) => void;
  priority?: boolean;
};

export function DocumentCard({
  document,
  onOpen,
  priority = false,
}: DocumentCardProps) {
  const titleId = `document-title-${document.id}`;

  return (
    <Card
      aria-labelledby={titleId}
      className="group/document min-w-0 gap-0 overflow-hidden rounded-lg py-0 transition-shadow duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-[0_28px_70px_-38px_rgb(0_0_0_/_0.95)] focus-within:ring-3 focus-within:ring-ring/50 motion-reduce:transition-none"
    >
      <DocumentCardPreview
        document={document}
        onOpen={onOpen}
        priority={priority}
        titleId={titleId}
        actions={<DocumentCardActions document={document} onOpen={onOpen} />}
      />
      <DocumentCardStatus document={document} />
    </Card>
  );
}
