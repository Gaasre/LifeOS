import { ExtractedFieldRow } from "@/features/documents/review/components/extracted-field-row";
import type {
  ReviewField,
  ReviewFieldStatus,
  ReviewSection as ReviewSectionType,
} from "@/features/documents/review/types";

type ReviewSectionProps = {
  section: ReviewSectionType;
  values: Record<string, string>;
  statuses: Record<string, ReviewFieldStatus>;
  selectedFieldId: string;
  editingFieldId: string | null;
  draftValue: string;
  onSelectField: (field: ReviewField) => void;
  onBeginEdit: (field: ReviewField) => void;
  onDraftValueChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onVerifyField: (field: ReviewField) => void;
};

export function ReviewSection({
  section,
  values,
  statuses,
  selectedFieldId,
  editingFieldId,
  draftValue,
  onSelectField,
  onBeginEdit,
  onDraftValueChange,
  onSaveEdit,
  onCancelEdit,
  onVerifyField,
}: ReviewSectionProps) {
  return (
    <section className="flex min-w-0 flex-col gap-2.5">
      <h3 className="px-1 font-heading text-sm font-medium">{section.title}</h3>
      <div className="flex min-w-0 flex-col divide-y divide-border/60">
        {section.fields.map((field) => (
          <ExtractedFieldRow
            key={field.id}
            field={field}
            value={values[field.id] ?? field.value}
            status={statuses[field.id] ?? field.status}
            selected={selectedFieldId === field.id}
            editing={editingFieldId === field.id}
            draftValue={draftValue}
            onSelect={() => onSelectField(field)}
            onBeginEdit={() => onBeginEdit(field)}
            onDraftValueChange={onDraftValueChange}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onVerify={() => onVerifyField(field)}
          />
        ))}
      </div>
    </section>
  );
}
