import {
  ArchiveIcon,
  DownloadIcon,
  EyeIcon,
  FileCheck2Icon,
  MoreHorizontalIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@lifeos/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lifeos/ui/components/dropdown-menu";

import type { LifeDocument } from "@/features/documents/types";

type DocumentCardActionsProps = {
  document: LifeDocument;
  onOpen: (document: LifeDocument) => void;
};

export function DocumentCardActions({
  document,
  onOpen,
}: DocumentCardActionsProps) {
  const navigate = useNavigate();

  return (
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
          {document.id === "rental-agreement" ? (
            <DropdownMenuItem
              className="whitespace-nowrap"
              onSelect={() => navigate("/documents/rental-agreement/review")}
            >
              <FileCheck2Icon />
              {document.review?.state === "in-progress"
                ? "Continue review"
                : "Review extracted details"}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            className="whitespace-nowrap"
            onSelect={() =>
              toast.success(`${document.title} is ready offline.`)
            }
          >
            <DownloadIcon />
            Make available offline
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="whitespace-nowrap"
            onSelect={() => toast(`${document.title} moved to Archive.`)}
          >
            <ArchiveIcon />
            Archive
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
