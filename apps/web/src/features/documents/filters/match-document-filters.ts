import type { Filter } from "@lifeos/ui/components/reui/filters";

import type { FilterValue, LifeDocument } from "@/features/documents/types";

function documentFieldValue(
  document: LifeDocument,
  field: string,
): FilterValue | FilterValue[] | undefined {
  switch (field) {
    case "areas":
      return document.areas;
    case "people":
      return document.people;
    case "linkState":
      return document.areas.length > 0 ? "linked" : "unlinked";
    case "tags":
      return document.tags;
    case "kind":
      return document.kind;
    case "status":
      return document.status;
    case "attentionKind":
      return document.attention?.kind ?? "none";
    case "mediaType":
      return document.mediaType;
    case "title":
      return document.title;
    case "issuer":
      return document.issuer;
    case "addedAt":
      return document.addedAt;
    case "issuedAt":
      return document.issuedAt;
    case "expiresAt":
      return document.expiresAt;
    case "source":
      return document.source;
    case "sensitivity":
      return document.sensitivity;
    case "offline":
      return document.availableOffline ? "available" : "cloud-only";
    case "pageCount":
      return document.pageCount;
    case "sizeMb":
      return document.sizeMb;
    case "mimeType":
      return document.mimeType;
    default:
      return undefined;
  }
}

function isEmpty(value: FilterValue | FilterValue[] | undefined) {
  return (
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function stringValue(value: FilterValue | undefined) {
  return String(value ?? "").toLocaleLowerCase();
}

function matchesArray(
  values: FilterValue[],
  operator: string,
  expected: FilterValue[],
) {
  const normalized = values.map(stringValue);
  const wanted = expected.map(stringValue);

  switch (operator) {
    case "is_not":
    case "is_not_any_of":
      return wanted.every((value) => !normalized.includes(value));
    case "includes_all":
      return wanted.every((value) => normalized.includes(value));
    case "excludes_all":
      return wanted.every((value) => !normalized.includes(value));
    case "contains":
      return normalized.some((value) => value.includes(wanted[0] ?? ""));
    case "not_contains":
      return normalized.every((value) => !value.includes(wanted[0] ?? ""));
    case "is":
    case "is_any_of":
    default:
      return wanted.some((value) => normalized.includes(value));
  }
}

function matchesScalar(
  value: FilterValue,
  operator: string,
  expected: FilterValue[],
) {
  if (expected.length === 0 || expected.every((item) => item === "")) {
    return true;
  }

  const expectedValue = expected[0];
  if (expectedValue === undefined) return true;

  const actualText = stringValue(value);
  const expectedText = stringValue(expectedValue);

  switch (operator) {
    case "is_not":
    case "not_equals":
      return actualText !== expectedText;
    case "is_any_of":
      return expected.map(stringValue).includes(actualText);
    case "is_not_any_of":
      return !expected.map(stringValue).includes(actualText);
    case "contains":
      return actualText.includes(expectedText);
    case "not_contains":
      return !actualText.includes(expectedText);
    case "starts_with":
      return actualText.startsWith(expectedText);
    case "ends_with":
      return actualText.endsWith(expectedText);
    case "before":
    case "less_than":
      return value < expectedValue;
    case "after":
    case "greater_than":
      return value > expectedValue;
    case "between":
      return expected[1] === undefined
        ? true
        : value >= expectedValue && value <= expected[1];
    case "is":
    case "equals":
    default:
      return actualText === expectedText;
  }
}

export function matchesDocumentFilters(
  document: LifeDocument,
  filters: Filter<FilterValue>[],
) {
  return filters.every((filter) => {
    const value = documentFieldValue(document, filter.field);

    if (filter.operator === "empty") return isEmpty(value);
    if (filter.operator === "not_empty") return !isEmpty(value);
    if (value === undefined) return false;

    return Array.isArray(value)
      ? matchesArray(value, filter.operator, filter.values)
      : matchesScalar(value, filter.operator, filter.values);
  });
}
