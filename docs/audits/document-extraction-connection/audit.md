# Document details and extracted record audit

## Audit scope

- Surface: Rental Agreement detail sheet and extracted-record review.
- User goal: understand one document as a connected LifeOS record, inspect useful facts without entering a task flow, and review uncertain extraction only when needed.
- Accessibility target: preserve a clear reading order, explicit state text, named actions, and a source-of-truth relationship between the original document and structured facts.

## Overall verdict

The review workspace is strong, but the everyday document view and the extracted record currently behave like two separate products. The detail sheet stops at file metadata and connections, while the review page contains the meaningful document knowledge. Extracted values should become part of the document after review; the review screen should remain a temporary verification mode, not the only place those values can be seen.

## Step 1 — Document details, top

Evidence: `01-document-details-current.jpg`.

Health: visually strong, structurally incomplete.

- The title, issuer, original preview, expiry state, and LifeOS connections establish a trustworthy document identity.
- The preview dominates most of the sheet, leaving no hint that a structured record exists or that review is in progress.
- There is no direct review or continue-review action in the sheet, so the user must leave the document and rediscover the task from the card menu.

## Step 2 — Document metadata, lower sheet

Evidence: `02-document-metadata-current.jpg`.

Health: clear file information, weak information hierarchy.

- Connected areas and people feel appropriately LifeOS-specific.
- Issued and expiry dates are mixed with filename, size, source, and privacy even though the first pair are meaningful document facts and the rest are system/file metadata.
- The sheet ends without showing rent, deposit, parties, premises, or terms—the information a person is most likely to reopen the agreement for.

## Step 3 — Extracted review workspace

Evidence: `03-extracted-review-current.jpg`.

Health: strong task design, disconnected destination.

- The original/structured split, evidence highlighting, compact fields, review states, bulk review action, and optional LifeOS suggestions form a coherent verification task.
- The same document identity is preserved visually, but navigation only says “Back to Documents”; it does not return the user to the document they were working on.
- Every extracted field carries review machinery. That is correct during verification, but too technical for the everyday document view after the task is complete.

## Recommended connected model

Treat the document as three visible layers in one scroll:

1. **Original** — immutable preview and full-viewer access.
2. **What it says** — useful structured facts from the document.
3. **LifeOS context** — connections, reminders, attention, and system/file metadata.

The detail sheet becomes the canonical everyday view. The review workspace becomes a temporary task launched from—and returning to—that document.

## Recommended detail-sheet order

1. Header: kind, title, issuer, and review state.
2. Compact source preview with “Open source.”
3. Review banner only when needed: “2 details need review” with **Continue review**.
4. **Key details**: four to six high-value facts, such as monthly rent, deposit, start, and end.
5. **All details · 15**: grouped read-only sections matching the review page—At a glance, Parties, Premises, Terms.
6. **Connected to**: areas and people, plus accepted LifeOS suggestions such as reminders.
7. **File & privacy**: filename, size, upload source, and sensitivity in a quiet collapsible section.

## Presentation rules

- Use “Key details” or “From this document,” not “AI metadata.”
- Reviewed values become normal document facts; do not keep labeling every row “extracted” after review.
- Only unresolved fields carry a review marker. Their proposed value remains visible so the user understands the task.
- Keep evidence available as a secondary row action, “Show in source,” rather than permanent icon clutter.
- Preserve the same group names and field components between read-only detail and review modes.
- Avoid confidence percentages. Use explicit states: Needs review, Reviewed, or Updated by you.

## Component direction

- `DocumentStructuredSummary`: reusable key-fact grid for the detail sheet.
- `DocumentStructuredDetails`: grouped read-only presentation using the same section model as review.
- `DocumentReviewBanner`: ready, in-progress, and completed variants with the appropriate CTA.
- `StructuredFieldRow`: shared visual core with read-only and review-action variants.
- `DocumentFileDetails`: the existing technical metadata moved into a low-emphasis disclosure.

## Accessibility risks and evidence limits

- The current screenshots show explicit labels and a logical high-level reading order, but keyboard focus restoration from review back to the originating document cannot be confirmed.
- A long sheet needs headings and disclosure state announced semantically; visual grouping alone is not enough.
- “Show in source” should move focus to the highlighted source region and provide an accessible description of the evidence location.
- Responsive reflow, zoom behavior, and screen-reader announcements require implementation testing.

## Highest-impact next step

Add a compact structured-record section and review banner to the detail sheet, backed by the same field/section data as the review page. Make Finish review return to the document with the reviewed facts now presented as ordinary LifeOS information.
