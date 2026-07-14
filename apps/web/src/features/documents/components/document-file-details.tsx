import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@lifeos/ui/components/accordion";
import type { LifeDocument } from "@/features/documents/types";

type DocumentFileDetailsProps = {
  document: LifeDocument;
};

function formatDate(value?: string) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function DocumentFileDetails({ document }: DocumentFileDetailsProps) {
  const details = [
    ["Added", formatDate(document.addedAt)],
    ["Added by", document.addedBy?.name ?? "Family member"],
    ["Issued", formatDate(document.issuedAt)],
    ["Current end", formatDate(document.expiresAt)],
    ["File", document.filename],
    ["Size", `${document.sizeMb.toFixed(1)} MB`],
    ["Source", document.source],
  ];

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="file" className="rounded-lg border px-3">
        <AccordionTrigger className="items-center hover:no-underline">
          <span className="flex min-w-0 items-center gap-2">
            <span>File details</span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            {details.map(([label, value]) => (
              <div key={label} className="flex min-w-0 flex-col gap-1">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
