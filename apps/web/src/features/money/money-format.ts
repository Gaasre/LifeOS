const moneyFormatters = new Map<string, Intl.NumberFormat>();

function moneyFormatter(currency: string) {
  const cached = moneyFormatters.get(currency);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  moneyFormatters.set(currency, formatter);
  return formatter;
}

export function formatMoney(minor: number, currency = "EUR") {
  return moneyFormatter(currency).format(minor / 100);
}

export function formatCompactMoney(minor: number, currency = "EUR") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    notation: Math.abs(minor) >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(minor) >= 1_000_000 ? 1 : 0,
  }).format(minor / 100);
}

export function parseMoneyMinor(value: string) {
  const normalized = value.replace(/[^0-9.,-]/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function moneyInputValue(minor: number) {
  return (minor / 100).toFixed(2);
}

export function formatShortDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(year, month - 1, day));
}

export function formatLongDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function todayDateInput() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function freshnessLabel(value: string) {
  const updated = new Date(value);
  if (Number.isNaN(updated.getTime())) return "Update date unavailable";
  const difference = Math.max(
    0,
    Math.floor((Date.now() - updated.getTime()) / 86_400_000),
  );
  if (difference === 0) return "Updated today";
  if (difference === 1) return "Updated yesterday";
  return `Updated ${difference} days ago`;
}

export function ownerLabel(people: Array<{ preferredName: string }>) {
  if (people.length === 0) return "Household";
  if (people.length === 1) return people[0]?.preferredName ?? "Household";
  return "Shared";
}

export function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());
}
