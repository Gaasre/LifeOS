export const usefulFactFields = [
  { key: "height", label: "Height", placeholder: "178 cm" },
  { key: "ring_size", label: "Ring size", placeholder: "EU 60" },
  { key: "clothing_size", label: "Clothing size", placeholder: "M / EU 48" },
  { key: "shoe_size", label: "Shoe size", placeholder: "EU 43" },
  {
    key: "food_restrictions",
    label: "Food restrictions",
    placeholder: "No shellfish; halal",
  },
  {
    key: "preferred_language",
    label: "Preferred language",
    placeholder: "English",
  },
  {
    key: "preferred_currency",
    label: "Preferred currency",
    placeholder: "EUR",
  },
  { key: "home_airport", label: "Home airport", placeholder: "BER" },
  {
    key: "style_preferences",
    label: "Style preferences",
    placeholder: "Minimal, neutral colours",
  },
  {
    key: "travel_preferences",
    label: "Travel preferences",
    placeholder: "Aisle seat; direct flights when possible",
  },
] as const;

export type UsefulFactField = (typeof usefulFactFields)[number];

export const officialRecordTypes = [
  "Passport",
  "National ID",
  "Residence permit",
  "Tax ID",
  "Social security number",
  "Health insurance number",
  "Consular registration",
  "Driver’s licence",
] as const;

export const officialRecordStatuses = [
  { value: "current", label: "Current" },
  { value: "needs_review", label: "Needs review" },
  { value: "expired", label: "Expired" },
] as const;
