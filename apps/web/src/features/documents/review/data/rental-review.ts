import type {
  ReviewField,
  ReviewSection,
  ReviewSuggestion,
} from "@/features/documents/review/types";

export const RENTAL_REVIEW_SOURCE = {
  filename: "oak-street-rental-agreement.pdf",
  preview: "/images/documents/rental-agreement.png",
  pageCount: 1,
};

export const RENTAL_NEEDS_REVIEW: ReviewField[] = [
  {
    id: "signature-status",
    label: "Signature status",
    value: "Unsigned",
    status: "needs-review",
    evidence: {
      page: 1,
      section: "Signatures",
      region: { left: 11, top: 82, width: 78, height: 12 },
    },
  },
  {
    id: "renewal-type",
    label: "Renewal type",
    value: "Automatic (12 months)",
    status: "needs-review",
    evidence: {
      page: 1,
      section: "Term",
      region: { left: 11, top: 37, width: 78, height: 8 },
    },
  },
];

export const RENTAL_REVIEW_SECTIONS: ReviewSection[] = [
  {
    id: "at-a-glance",
    title: "At a glance",
    fields: [
      {
        id: "monthly-rent",
        label: "Monthly rent",
        value: "$1,850.00",
        status: "extracted",
        evidence: {
          page: 1,
          section: "Rent",
          region: { left: 12, top: 55, width: 21, height: 7 },
        },
      },
      {
        id: "security-deposit",
        label: "Security deposit",
        value: "$1,850.00",
        status: "extracted",
        evidence: {
          page: 1,
          section: "Security deposit",
          region: { left: 11, top: 64, width: 78, height: 6 },
        },
      },
      {
        id: "starts",
        label: "Starts",
        value: "Jun 1, 2024",
        status: "extracted",
        evidence: {
          page: 1,
          section: "Term",
          region: { left: 11, top: 37, width: 78, height: 8 },
        },
      },
      {
        id: "ends",
        label: "Ends",
        value: "May 31, 2025",
        status: "extracted",
        evidence: {
          page: 1,
          section: "Term",
          region: { left: 11, top: 37, width: 78, height: 8 },
        },
      },
    ],
  },
  {
    id: "parties",
    title: "Parties",
    fields: [
      {
        id: "landlord",
        label: "Landlord",
        value: "Westfield Property Holdings, LLC",
        status: "extracted",
        evidence: {
          page: 1,
          section: "Parties",
          region: { left: 11, top: 21, width: 37, height: 12 },
        },
      },
      {
        id: "tenant",
        label: "Tenant",
        value: "Rowan Ellis",
        status: "extracted",
        evidence: {
          page: 1,
          section: "Parties",
          region: { left: 51, top: 21, width: 38, height: 12 },
        },
      },
    ],
  },
  {
    id: "premises",
    title: "Premises",
    fields: [
      {
        id: "property-address",
        label: "Address",
        value: "7427 Cedarbrook Lane, Apartment 4B, Portland, OR 97205",
        status: "extracted",
        multiline: true,
        evidence: {
          page: 1,
          section: "Premises",
          region: { left: 11, top: 33, width: 78, height: 9 },
        },
      },
      {
        id: "unit-type",
        label: "Unit type",
        value: "One Bedroom / One Bathroom Apartment",
        status: "extracted",
        multiline: true,
        evidence: {
          page: 1,
          section: "Premises",
          region: { left: 11, top: 33, width: 78, height: 9 },
        },
      },
      {
        id: "included",
        label: "Included",
        value:
          "Refrigerator, Range/Oven, Dishwasher, Microwave, In-Unit Washer & Dryer",
        status: "extracted",
        multiline: true,
        evidence: {
          page: 1,
          section: "Premises",
          region: { left: 11, top: 33, width: 78, height: 9 },
        },
      },
    ],
  },
  {
    id: "terms",
    title: "Terms",
    fields: [
      {
        id: "rent-due",
        label: "Rent due",
        value: "1st of each month",
        status: "extracted",
        evidence: {
          page: 1,
          section: "Rent",
          region: { left: 32, top: 55, width: 20, height: 7 },
        },
      },
      {
        id: "payment-method",
        label: "Payment method",
        value: "ACH transfer",
        status: "extracted",
        evidence: {
          page: 1,
          section: "Rent",
          region: { left: 52, top: 55, width: 20, height: 7 },
        },
      },
      {
        id: "late-fee",
        label: "Late fee",
        value: "$50 after 5 days",
        status: "extracted",
        evidence: {
          page: 1,
          section: "Rent",
          region: { left: 72, top: 55, width: 17, height: 7 },
        },
      },
      {
        id: "notice-period",
        label: "Notice period",
        value: "30 days",
        status: "extracted",
        evidence: {
          page: 1,
          section: "Term",
          region: { left: 11, top: 37, width: 78, height: 8 },
        },
      },
    ],
  },
];

export const RENTAL_REVIEW_SUGGESTIONS: ReviewSuggestion[] = [
  {
    id: "connect-home",
    title: "Connect to Home",
    description: "Link this rental to your Home profile.",
    kind: "connection",
  },
  {
    id: "renewal-reminder",
    title: "Remind me 30 days before renewal",
    description: "Create a reminder before this agreement renews.",
    kind: "reminder",
  },
];
