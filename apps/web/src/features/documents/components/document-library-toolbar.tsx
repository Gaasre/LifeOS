import { SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";

import { Button } from "@lifeos/ui/components/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@lifeos/ui/components/input-group";
import type { Filter } from "@lifeos/ui/components/reui/filters";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lifeos/ui/components/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@lifeos/ui/components/sheet";

import { DocumentFilterBuilder } from "@/features/documents/components/document-filter-builder";
import type { DocumentFilterOption } from "@/features/documents/filters/document-filter-fields";
import type { DocumentSort, FilterValue } from "@/features/documents/types";

type DocumentLibraryToolbarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  filters: Filter<FilterValue>[];
  onFiltersChange: (filters: Filter<FilterValue>[]) => void;
  people: DocumentFilterOption[];
  creators: DocumentFilterOption[];
  sort: DocumentSort;
  onSortChange: (sort: DocumentSort) => void;
};

const sortOptions: { value: DocumentSort; label: string }[] = [
  { value: "recently-added", label: "Recently added" },
  { value: "title", label: "Title" },
  { value: "oldest", label: "Oldest first" },
  { value: "expiring-soon", label: "Expiring soon" },
];

export function DocumentLibraryToolbar({
  query,
  onQueryChange,
  filters,
  onFiltersChange,
  people,
  creators,
  sort,
  onSortChange,
}: DocumentLibraryToolbarProps) {
  return (
    <section
      className="documents-section-enter flex min-w-0 flex-col gap-4"
      style={{ animationDelay: "150ms" }}
      aria-label="Document library controls"
    >
      <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <InputGroup className="h-9">
          <InputGroupAddon>
            <SearchIcon aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search title, issuer, person, area, or tag..."
            aria-label="Search documents"
          />
          {query ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                className="document-compact-enter"
                aria-label="Clear search"
                onClick={() => onQueryChange("")}
              >
                <XIcon />
              </InputGroupButton>
            </InputGroupAddon>
          ) : null}
        </InputGroup>

        <Select
          value={sort}
          onValueChange={(value) => onSortChange(value as DocumentSort)}
        >
          <SelectTrigger
            className="h-9 w-full sm:w-40"
            aria-label="Sort documents"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="end">
            <SelectGroup>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <div className="sm:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" className="h-9 w-full">
                <SlidersHorizontalIcon data-icon="inline-start" />
                Filters{filters.length > 0 ? ` · ${filters.length}` : ""}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="h-[86dvh] min-h-0 overflow-hidden rounded-t-xl"
            >
              <SheetHeader>
                <SheetTitle>Filter documents</SheetTitle>
                <SheetDescription>
                  Combine relationship, record, lifecycle, date, and file rules.
                </SheetDescription>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-auto px-4 pb-6">
                <DocumentFilterBuilder
                  filters={filters}
                  onChange={onFiltersChange}
                  people={people}
                  creators={creators}
                  compact
                />
              </div>
              <SheetFooter className="border-t bg-muted/30">
                <Button
                  type="button"
                  variant="outline"
                  disabled={filters.length === 0}
                  onClick={() => onFiltersChange([])}
                >
                  Clear all filters
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="hidden min-w-0 items-start gap-2 sm:flex">
        <div className="min-w-0 flex-1">
          <DocumentFilterBuilder
            filters={filters}
            onChange={onFiltersChange}
            people={people}
            creators={creators}
            compact
          />
        </div>
        {filters.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="document-compact-enter"
            onClick={() => onFiltersChange([])}
          >
            <XIcon data-icon="inline-start" />
            Clear
          </Button>
        ) : null}
      </div>
    </section>
  );
}
