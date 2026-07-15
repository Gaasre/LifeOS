import {
  CircleDollarSignIcon,
  FootprintsIcon,
  GemIcon,
  LanguagesIcon,
  LuggageIcon,
  PaletteIcon,
  PlaneIcon,
  RulerIcon,
  ShirtIcon,
  UtensilsCrossedIcon,
} from "lucide-react";

export const usefulFactFields = [
  {
    key: "height",
    label: "Height",
    placeholder: "178 cm",
    icon: RulerIcon,
  },
  {
    key: "ring_size",
    label: "Ring size",
    placeholder: "EU 60",
    icon: GemIcon,
  },
  {
    key: "clothing_size",
    label: "Clothing size",
    placeholder: "M / EU 48",
    icon: ShirtIcon,
  },
  {
    key: "shoe_size",
    label: "Shoe size",
    placeholder: "EU 43",
    icon: FootprintsIcon,
  },
  {
    key: "food_restrictions",
    label: "Food restrictions",
    placeholder: "No shellfish; halal",
    icon: UtensilsCrossedIcon,
  },
  {
    key: "preferred_language",
    label: "Preferred language",
    placeholder: "English",
    icon: LanguagesIcon,
  },
  {
    key: "preferred_currency",
    label: "Preferred currency",
    placeholder: "EUR",
    icon: CircleDollarSignIcon,
  },
  {
    key: "home_airport",
    label: "Home airport",
    placeholder: "BER",
    icon: PlaneIcon,
  },
  {
    key: "style_preferences",
    label: "Style preferences",
    placeholder: "Minimal, neutral colours",
    icon: PaletteIcon,
  },
  {
    key: "travel_preferences",
    label: "Travel preferences",
    placeholder: "Aisle seat; direct flights when possible",
    icon: LuggageIcon,
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
