import type { FitnessWorkoutType } from "@lifeos/rpc";

export function getLocalDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export function formatCalendarDate(
  date: string,
  options?: { short?: boolean },
) {
  return new Intl.DateTimeFormat("en", {
    weekday: options?.short ? "short" : "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00.000Z`));
}

export function addCalendarDays(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

export function formatWorkoutType(type: FitnessWorkoutType) {
  const labels: Record<FitnessWorkoutType, string> = {
    strength: "Strength",
    easy_run: "Easy run",
    long_run: "Long run",
    intervals: "Intervals",
    tempo_run: "Tempo run",
    recovery_run: "Recovery run",
    rest: "Rest",
  };
  return labels[type];
}

export function formatPace(seconds: number | null) {
  if (seconds === null) return "No pace logged";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${remainder} /km`;
}

export function formatCompactNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits,
  }).format(value);
}

export function getDefaultMealSlot(
  title: string,
  tags: string[],
): "breakfast" | "lunch" | "snack" | "dinner" | "other" {
  const haystack = `${title} ${tags.join(" ")}`.toLowerCase();
  if (haystack.includes("breakfast") || haystack.includes("oat")) {
    return "breakfast";
  }
  if (haystack.includes("shake") || haystack.includes("snack")) return "snack";
  if (haystack.includes("lunch") || haystack.includes("bowl")) return "lunch";
  if (haystack.includes("dinner") || haystack.includes("pasta"))
    return "dinner";
  return "other";
}
