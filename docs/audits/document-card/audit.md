# Document card density audit

## Scope

- Surface: LifeOS Documents library card.
- User goal: scan several documents quickly while retaining useful preview, context, and open-loop state.
- Evidence: `01-current-card-grid.png` at 1440 × 1024 and the user-supplied focused Annual Health Summary card screenshot.

## Verdict

The visual idea is strong, especially the continuous fade from document preview into metadata. The card is oversized because the preview keeps a 4:5 aspect ratio at every width and the metadata then occupies three additional vertical bands beneath it. On a single-column layout the preview grows with the full card width, so the card becomes a page-sized object instead of a scannable library item.

## Strengths

- The preview-to-metadata fade creates a distinctive, calm LifeOS document object.
- Real document imagery makes recognition faster than generic file icons.
- File type, title, connections, review state, and offline state form a useful hierarchy.
- Status text is explicit and not communicated by color alone.

## High-impact issues

1. The fixed 4:5 preview ratio is the main source of excess height, especially below the `sm` breakpoint.
2. Preview, title/file data, connection chips, and footer are four vertically cumulative zones even though the fade can visually carry the metadata itself.
3. The image shows substantially more page content than is useful for recognition in a library. A document silhouette and a few identifying details are sufficient.
4. The separate footer is useful, but its current height and border make the card feel like another full section after an already tall metadata block.

## Recommended direction

- Preserve the fade as the card's signature.
- Move title, format, and connection chips into the lower portion of the preview fade instead of placing them in separate card sections.
- Cap preview height on single-column layouts rather than allowing the 4:5 ratio to scale indefinitely.
- Keep a compact 40–44 px footer for review/offline state.
- Retain the current desktop grid proportions, with an expected height reduction of roughly 20%; target a larger reduction on single-column layouts.

## Accessibility risks and limits

- The screenshot suggests adequate hierarchy, but contrast over every preview image must be verified after metadata is overlaid on the fade.
- Keyboard focus, screen-reader order, and zoom reflow cannot be fully established from screenshots alone; the implementation should preserve the existing named open and actions controls.

## Suggested component structure

1. `DocumentCardPreview`: image, file-type badge, actions trigger, gradient, and overlaid identity metadata.
2. `DocumentConnectionBadges`: compact areas/people row within the fade.
3. `DocumentCardStatus`: the existing review/attention/offline footer presentation.
