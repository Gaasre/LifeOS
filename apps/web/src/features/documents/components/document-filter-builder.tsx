import { ListFilterIcon } from "lucide-react";

import { Button } from "@lifeos/ui/components/button";
import { Filters, type Filter } from "@lifeos/ui/components/reui/filters";

import { DOCUMENT_FILTER_FIELDS } from "@/features/documents/filters/document-filter-fields";
import type { FilterValue } from "@/features/documents/types";

type DocumentFilterBuilderProps = {
  filters: Filter<FilterValue>[];
  onChange: (filters: Filter<FilterValue>[]) => void;
  compact?: boolean;
};

export function DocumentFilterBuilder({
  filters,
  onChange,
  compact = false,
}: DocumentFilterBuilderProps) {
  return (
    <Filters<FilterValue>
      filters={filters}
      fields={DOCUMENT_FILTER_FIELDS}
      onChange={onChange}
      variant="solid"
      size={compact ? "sm" : "default"}
      showSearchInput
      trigger={
        <Button
          type="button"
          variant="outline"
          size={compact ? "sm" : "default"}
        >
          <ListFilterIcon data-icon="inline-start" />
          Add filter
          {filters.length > 0 ? ` · ${filters.length}` : ""}
        </Button>
      }
      menuPopupClassName="w-64"
    />
  );
}
