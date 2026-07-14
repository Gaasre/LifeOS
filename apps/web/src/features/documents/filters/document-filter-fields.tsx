import {
  ArchiveIcon,
  CalendarClockIcon,
  CalendarPlusIcon,
  CircleAlertIcon,
  FileImageIcon,
  FileStackIcon,
  FileTextIcon,
  FingerprintIcon,
  FolderTreeIcon,
  HardDriveIcon,
  Link2Icon,
  ScanTextIcon,
  TagsIcon,
  TextSearchIcon,
  UserCheckIcon,
  UserRoundIcon,
} from "lucide-react";

import { Input } from "@lifeos/ui/components/input";
import type {
  CustomRendererProps,
  FilterFieldConfig,
  FilterFieldGroup,
  FilterOperator,
} from "@lifeos/ui/components/reui/filters";

import {
  DOCUMENT_AREAS,
  DOCUMENT_KINDS,
  DOCUMENT_STATUSES,
  type FilterValue,
} from "@/features/documents/types";

const dateOperators: FilterOperator[] = [
  { value: "is", label: "is" },
  { value: "before", label: "before" },
  { value: "after", label: "after" },
  { value: "between", label: "between" },
  { value: "empty", label: "is empty" },
  { value: "not_empty", label: "is not empty" },
];

const numberOperators: FilterOperator[] = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "greater_than", label: "greater than" },
  { value: "less_than", label: "less than" },
  { value: "between", label: "between" },
  { value: "empty", label: "is empty" },
  { value: "not_empty", label: "is not empty" },
];

function DateFilterControl({
  field,
  values,
  onChange,
  operator,
}: CustomRendererProps<FilterValue>) {
  if (operator === "empty" || operator === "not_empty") return null;

  const start = typeof values[0] === "string" ? values[0] : "";
  const end = typeof values[1] === "string" ? values[1] : "";

  return (
    <div className="flex min-w-0 items-center gap-1">
      <Input
        type="date"
        aria-label={`${field.label ?? "Date"} start`}
        className="w-34"
        value={start}
        onChange={(event) =>
          onChange(
            operator === "between"
              ? [event.target.value, end]
              : [event.target.value],
          )
        }
      />
      {operator === "between" ? (
        <Input
          type="date"
          aria-label={`${field.label ?? "Date"} end`}
          className="w-34"
          value={end}
          onChange={(event) => onChange([start, event.target.value])}
        />
      ) : null}
    </div>
  );
}

function NumberFilterControl({
  field,
  values,
  onChange,
  operator,
}: CustomRendererProps<FilterValue>) {
  if (operator === "empty" || operator === "not_empty") return null;

  const start = typeof values[0] === "number" ? values[0] : "";
  const end = typeof values[1] === "number" ? values[1] : "";

  const parseValue = (value: string) => (value === "" ? "" : Number(value));

  return (
    <div className="flex min-w-0 items-center gap-1">
      <Input
        type="number"
        min={0}
        step="0.1"
        aria-label={`${field.label ?? "Number"} minimum`}
        className="w-24"
        value={start}
        onChange={(event) => {
          const next = parseValue(event.target.value);
          onChange(
            operator === "between"
              ? [next, end].filter((value) => value !== "")
              : next === ""
                ? []
                : [next],
          );
        }}
      />
      {operator === "between" ? (
        <Input
          type="number"
          min={0}
          step="0.1"
          aria-label={`${field.label ?? "Number"} maximum`}
          className="w-24"
          value={end}
          onChange={(event) => {
            const next = parseValue(event.target.value);
            onChange(
              [start, next].filter((value) => value !== "") as FilterValue[],
            );
          }}
        />
      ) : null}
    </div>
  );
}

export type DocumentFilterOption = {
  value: string;
  label: string;
};

function relationshipFields(
  people: DocumentFilterOption[],
  creators: DocumentFilterOption[],
): FilterFieldConfig<FilterValue>[] {
  return [
    {
      key: "people",
      label: "Belongs to",
      type: "multiselect",
      icon: <UserRoundIcon />,
      searchable: true,
      options: people,
    },
    {
      key: "addedBy",
      label: "Added by",
      type: "multiselect",
      icon: <UserCheckIcon />,
      searchable: true,
      options: creators,
    },
    {
      key: "areas",
      label: "Related module",
      type: "multiselect",
      icon: <FolderTreeIcon />,
      searchable: true,
      options: DOCUMENT_AREAS.map((area) => ({ value: area, label: area })),
    },
    {
      key: "linkState",
      label: "Relationship",
      type: "select",
      icon: <Link2Icon />,
      searchable: false,
      options: [
        { value: "linked", label: "Linked" },
        { value: "unlinked", label: "Unlinked" },
      ],
    },
    {
      key: "tags",
      label: "Tags",
      type: "text",
      icon: <TagsIcon />,
      placeholder: "Search tags...",
    },
  ];
}

const recordFields: FilterFieldConfig<FilterValue>[] = [
  {
    key: "kind",
    label: "Document kind",
    type: "multiselect",
    icon: <FileStackIcon />,
    searchable: true,
    options: DOCUMENT_KINDS.map((kind) => ({ value: kind, label: kind })),
  },
  {
    key: "status",
    label: "Status",
    type: "multiselect",
    icon: <CircleAlertIcon />,
    searchable: false,
    options: DOCUMENT_STATUSES.map((status) => ({
      value: status,
      label: status,
    })),
  },
  {
    key: "attentionKind",
    label: "Attention reason",
    type: "multiselect",
    icon: <CalendarClockIcon />,
    searchable: false,
    options: [
      { value: "expiry", label: "Expiring" },
      { value: "renewal", label: "Renewal due" },
      { value: "signature", label: "Signature needed" },
      { value: "unlinked", label: "Not linked" },
      { value: "none", label: "No attention needed" },
    ],
  },
  {
    key: "mediaType",
    label: "File type",
    type: "multiselect",
    icon: <FileImageIcon />,
    searchable: false,
    options: [
      { value: "PDF", label: "PDF" },
      { value: "Image", label: "Image" },
    ],
  },
  {
    key: "title",
    label: "Title",
    type: "text",
    icon: <TextSearchIcon />,
    placeholder: "Document title...",
  },
  {
    key: "issuer",
    label: "Issuer",
    type: "text",
    icon: <FileTextIcon />,
    placeholder: "Issuer name...",
  },
];

const dateFields: FilterFieldConfig<FilterValue>[] = [
  {
    key: "addedAt",
    label: "Date added",
    type: "custom",
    icon: <CalendarPlusIcon />,
    operators: dateOperators,
    defaultOperator: "after",
    customRenderer: (props) => <DateFilterControl {...props} />,
  },
  {
    key: "issuedAt",
    label: "Issue date",
    type: "custom",
    icon: <CalendarClockIcon />,
    operators: dateOperators,
    customRenderer: (props) => <DateFilterControl {...props} />,
  },
  {
    key: "expiresAt",
    label: "Expiry date",
    type: "custom",
    icon: <CalendarClockIcon />,
    operators: dateOperators,
    customRenderer: (props) => <DateFilterControl {...props} />,
  },
];

const fileFields: FilterFieldConfig<FilterValue>[] = [
  {
    key: "source",
    label: "Source",
    type: "multiselect",
    icon: <ScanTextIcon />,
    searchable: false,
    options: ["Upload", "Scan", "Email", "Generated"].map((source) => ({
      value: source,
      label: source,
    })),
  },
  {
    key: "pageCount",
    label: "Page count",
    type: "custom",
    icon: <ArchiveIcon />,
    operators: numberOperators,
    customRenderer: (props) => <NumberFilterControl {...props} />,
  },
  {
    key: "sizeMb",
    label: "File size (MB)",
    type: "custom",
    icon: <HardDriveIcon />,
    operators: numberOperators,
    customRenderer: (props) => <NumberFilterControl {...props} />,
  },
  {
    key: "mimeType",
    label: "MIME type",
    type: "text",
    icon: <FingerprintIcon />,
    placeholder: "application/pdf...",
  },
];

export function createDocumentFilterFields(
  people: DocumentFilterOption[],
  creators: DocumentFilterOption[],
): FilterFieldGroup<FilterValue>[] {
  return [
    { group: "Relationships", fields: relationshipFields(people, creators) },
    { group: "Record", fields: recordFields },
    { group: "Dates", fields: dateFields },
    { group: "File", fields: fileFields },
  ];
}
