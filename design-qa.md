# Me module quiet-profile redesign QA

**Comparison target**

- Source visual truth: `docs/design-qa/me-simple-option-1-reference.png`, copied from the first displayed ImageGen direction selected by the user.
- Browser-rendered implementation: `docs/design-qa/me-simple-option-1-desktop-final.png`.
- Responsive implementation: `docs/design-qa/me-simple-option-1-mobile-final.png` and `docs/design-qa/me-simple-option-1-mobile-lower-pass-1.png`.
- Route: `http://127.0.0.1:5173/me`.
- Viewports: 1440 × 1024 desktop and 390 × 844 mobile.
- State: authenticated dark-theme Overview for Amine Barchid using the account's real profile, fact, and upcoming-date data.

**Full-view comparison evidence**

The selected mock and the final browser-rendered implementation were normalized to the same 1440 × 1024 viewport and placed together in `docs/design-qa/me-simple-option-1-comparison-final.png`. The implementation preserves the source's compact AppHeader and tabs, one integrated profile surface, modest identity header, open two-column reading flow, restrained champagne accent, minimal separators, single upcoming-date rail, and fixed bottom-right Actions launcher.

**Focused region comparison evidence**

`docs/design-qa/me-simple-option-1-focused-comparison-final.png` compares the profile surface at a matched card crop. It confirms the selected hierarchy, avatar/name relationship, generated horizon artwork, two balanced data columns, row density, border treatment, and compact Next up rail at readable scale.

**Findings**

- No actionable P0, P1, or P2 findings remain.
- Fonts and typography: the implementation uses LifeOS's existing Roboto Slab variable heading face and Outfit variable UI face. The name remains the only large display treatment; section headings, labels, values, and muted support copy maintain the selected hierarchy without oversized titles or duplicate metadata.
- Spacing and layout rhythm: the 1440 px frame uses 32 px page gutters, a 16 px card radius, a 224 px integrated profile header, balanced 50/50 detail columns, 56 px reference rows, and a 112 px upcoming-date rail. The card and major anchors closely track the selected mock. At 390 px, the sections stack naturally and the document has no horizontal overflow (`clientWidth: 390`, `scrollWidth: 390`).
- Colors and visual tokens: shared LifeOS background, card, border, foreground, muted, and money-accent tokens are preserved. The warm accent is restricted to the monogram, edit icon, missing-value actions, horizon art, date icon, and active details.
- Image quality and asset fidelity: `apps/web/public/images/me/profile-horizon-v1.jpg` is a purpose-built 1600 × 533 raster generated from the selected mock's decorative motif. It is placed at its natural 3:1 aspect ratio with automatic width and full slot height, so it is neither stretched nor squashed. The subject, crop, low contrast, and negative space match the selected art direction; no CSS illustration or placeholder asset substitutes for it.
- Copy and content: visible profile copy matches the selected direction and uses real profile values. Empty quick-reference fields remain direct `Add` actions rather than invented personal data. The duplicated completion counts, record totals, and decorative object categories from the previous design are absent.
- Icons and controls: the repository's Lucide family matches the source's fine outline treatment. Edit profile, each quick-reference value, Add date, all four tabs, and the fixed Actions command are real accessible controls.
- Accessibility and responsiveness: the page keeps semantic tabs, headings, definition terms/values, time elements, named buttons, decorative-image empty alt text, visible focus treatments, and keyboard-reachable dialogs. Mobile tabs use concise labels instead of scrolling or clipping.

**Comparison history**

- First-pass P2 — the initial implementation sat about 9 px lower than the mock, used slightly narrow page gutters, undersized the avatar, placed the horizon art too far right, and made the Next up rail too shallow.
  - Fix: aligned the shell to 32 px desktop gutters and 24 px vertical padding, reduced the overview gap, increased the avatar to 128 px, refined the display-name scale/weight, shifted and softened the raster motif, and set the upcoming rail to a 112 px minimum height.
  - Post-fix evidence: `docs/design-qa/me-simple-option-1-desktop-pass-1.png`, `docs/design-qa/me-simple-option-1-desktop-final.png`, and `docs/design-qa/me-simple-option-1-comparison-final.png`.
- Responsive P2 — the full `IDs & records` mobile tab label truncated by a few characters even though the tab row no longer scrolled.
  - Fix: retained the full desktop labels while using the explicit mobile labels `Overview`, `IDs`, `Facts`, and `Dates` inside the same four fixed tracks.
  - Post-fix evidence: `docs/design-qa/me-simple-option-1-mobile-pass-1.png` and `docs/design-qa/me-simple-option-1-mobile-final.png`.

**Primary interactions tested**

- Switched from Overview to Useful facts and back, verifying selected-tab state and content changes.
- Opened and closed Edit profile and verified the real populated profile form.
- Opened and closed the Ring size quick-add dialog and verified its labeled empty field and disabled submit state.
- Opened and closed Add date and verified its name, date, recurrence, and disabled submit controls.
- Opened and closed the fixed Actions palette through both the floating button and the ⌘K keyboard shortcut.
- Verified the 390 px page has no horizontal overflow and that all four mobile tab destinations remain fully visible without an internally scrollable tab strip.

**Build and diagnostics**

- Web typecheck: passed.
- Web production build: passed.
- Prettier check for `me-page.tsx`: passed.
- Browser console errors after the final desktop reload: none.

**Follow-up polish**

- P3: the browser-rendered Roboto Slab variable weight is slightly firmer than the conceptual ImageGen lettering at close inspection. The established LifeOS font was intentionally preserved rather than introducing a one-page typeface.

final result: passed

---

# Authentication flow design QA

**Comparison target**

- Source visual truth: `/Users/gaasre/.codex/generated_images/019f4bf0-3dd0-7092-9c3a-af8a20dc62dd/exec-4b12b06b-6707-482c-9f16-dc166da2d2f0.png`.
- Browser-rendered implementation: `docs/design-qa/auth-login-desktop-final.png` and `docs/design-qa/auth-login-mobile-final.png`.
- Route: `http://127.0.0.1:5175/login`, with companion routes `/signup` and `/forgot-password`.
- Viewports: 1440 × 1024 desktop and 390 × 844 mobile.
- State: dark theme, populated email and password fields, email focused, sign-in selected.

**Full-view comparison evidence**

The approved direction and final browser capture were placed together in `docs/design-qa/auth-login-comparison.jpg` at the same 1440 × 1024 viewport. The final layout preserves the source's balanced split, atmospheric portrait field, LifeOS mark, lower-left editorial statement, compact segmented mode switch, narrow form column, generous negative space, and email/password-only sign-in path.

**Focused region comparison evidence**

- `docs/design-qa/auth-login-right-focused.jpg` compares the form regions at native scale. The final switch, heading, field widths, labels, focus treatment, password affordance, recovery link, primary action, account-creation link, and help position align with the approved hierarchy and density.
- `docs/design-qa/auth-login-left-focused.jpg` compares the visual field at native scale. The final image preserves the source subject, crop, black-to-copper palette, logo placement, headline measure, and lower-left spacing without stretching the raster artwork.

**Findings**

- No actionable P0, P1, or P2 findings remain.
- Fonts and typography: the existing Outfit variable font is preserved for product and display copy. Sizes, optical weights, line heights, wrapping, and muted-to-primary hierarchy match the selected direction; the two-line hero remains stable at the verified desktop width.
- Spacing and layout rhythm: the 50/50 desktop split, 372 px form column, 48 px segmented switch, 56 px inputs, 64 px sign-in action, 10–12 px radii, and major vertical anchors track the source. The 390 px layout has no horizontal overflow (`clientWidth: 390`, `scrollWidth: 390`) and keeps the primary action and create-account path within the initial viewport.
- Colors and visual tokens: the implementation stays on LifeOS background, foreground, muted, input, border, and ring tokens. The primary action uses the semantic foreground/background pair to reach the source's near-white emphasis; no new accent palette was introduced.
- Image quality and asset fidelity: `apps/web/public/images/auth-me-portrait.png` is a project-local portrait extension of the existing LifeOS “Me” artwork, generated for the selected crop and used as a real raster asset. It remains sharp at desktop size, retains the restrained copper linework, and fades into the form surface without a stretched landscape crop.
- Copy and content: visible sign-in copy matches the approved frame. Account creation, verification confirmation, password recovery, and validation copy remain calm and direct. No Apple, Google, passkey, phone, magic-link, or SSO entry was added.
- Accessibility and interaction: inputs have explicit labels, correct autocomplete values, focus rings, invalid states, live field errors, a named password-visibility control, keyboard-reachable tabs and links, loading states, and a touch-safe mobile layout.

**Comparison history**

- Earlier P2 — the first browser pass used a 32 px segmented control and centered the form slightly too far right and low.
  - Fix: set the selected 48 px control height, shifted the desktop form column to the source anchor, and matched the 1440 × 1024 top offset.
  - Post-fix evidence: `docs/design-qa/auth-login-desktop-pass-2.png` and `docs/design-qa/auth-login-right-focused.jpg`.
- Earlier P2 — the hero statement sat below the source anchor and the primary action was too muted.
  - Fix: raised the lower-left copy to the source baseline, retained the wider visual breathing room, and promoted the action to the semantic near-white foreground treatment.
  - Post-fix evidence: `docs/design-qa/auth-login-left-focused.jpg` and `docs/design-qa/auth-login-desktop-final.png`.
- Follow-up crop refinement — at the shorter 1280 × 720 desktop frame, the centered artwork crop clipped the top of the head.
  - Fix: moved the desktop artwork focal point upward within the image so the subject renders lower in the viewport without changing its scale, the copy, or the 1440 × 1024 composition.
  - Post-fix evidence: `docs/design-qa/auth-login-short-desktop-crop.png` and `docs/design-qa/auth-login-desktop-crop-adjusted.png`.

**Primary interactions tested**

- Switched between Sign in and Create account and verified the URL and selected tab update together.
- Submitted an empty create-account form and verified name, email, password, and terms errors appear with accessible alert semantics.
- Filled the complete create-account form, accepted the terms, toggled password visibility, submitted, and verified the confirmation-email state.
- Opened password recovery, submitted a valid email, and verified the reset-instructions state.
- Filled email and password, submitted sign-in, observed the loading state and confirmation toast, and verified navigation to the LifeOS home screen.
- Verified the login and sign-up surfaces at 390 × 844 with no horizontal overflow.

**Build and diagnostics**

- Web typecheck: passed.
- Web production build: passed.
- Browser console warnings/errors on the verified auth route: none.

**Follow-up polish**

- The generated portrait has minor contour differences from the conceptual mock at close inspection; this is acceptable P3 drift and remains faithful to the original LifeOS “Me” art direction.

final result: passed

---

# Me module editorial-wallet design QA

**Comparison target**

- Source visual truth: `docs/design-qa/me-editorial-approved.png`.
- User-reported oversized implementation: `/var/folders/2m/j9gy8bn938z6djx1scs6lzfh0000gn/T/codex-clipboard-9290338d-fb68-4627-9dfe-94f4f2682e89.png`.
- User-reported oversized Useful facts cards: `/var/folders/2m/j9gy8bn938z6djx1scs6lzfh0000gn/T/codex-clipboard-30794be5-1f60-42e2-b329-020a9dba874b.png`.
- User-reported internally scrollable and clipped tab navigation: `/var/folders/2m/j9gy8bn938z6djx1scs6lzfh0000gn/T/codex-clipboard-c1870a8d-65a0-4dfb-852a-2e47da2a670c.png`.
- User-reported flattened Fit and Travel shelf artwork: `/var/folders/2m/j9gy8bn938z6djx1scs6lzfh0000gn/T/codex-clipboard-231f8e73-16e8-4582-97fe-39482f6f3cb7.png`.
- User-reported disconnected three-column Overview: `/var/folders/2m/j9gy8bn938z6djx1scs6lzfh0000gn/T/codex-clipboard-c33c0d44-c8c1-4fe9-8c86-f0d26312ad8f.png`.
- Latest browser-rendered implementation: `docs/design-qa/me-sizing-fix-final.png`.
- Latest Useful facts implementation: `docs/design-qa/me-useful-facts-sizing-final.png` and `docs/design-qa/me-useful-facts-focused-final.png`.
- Latest tab-navigation implementation: `docs/design-qa/me-tabs-final.png`, `docs/design-qa/me-tabs-focused-final.png`, and `docs/design-qa/me-tabs-mobile-final.png`.
- Latest shelf-proportion implementation: `docs/design-qa/me-shelf-proportions-final.png` and `docs/design-qa/me-shelf-proportions-focused-final.png`.
- Latest connected Overview implementation: `docs/design-qa/me-overview-cohesion-final.png`, `docs/design-qa/me-overview-cohesion-desktop-final.png`, and `docs/design-qa/me-overview-cohesion-focused-final.png`.
- Responsive implementation: `docs/design-qa/me-editorial-mobile-final.png` and `docs/design-qa/me-useful-facts-mobile-final.png`.
- Same-input comparisons: `docs/design-qa/me-editorial-comparison-final.png`, `docs/design-qa/me-sizing-comparison-final.png`, `docs/design-qa/me-useful-facts-comparison-final.png`, `docs/design-qa/me-tabs-comparison-final.png`, `docs/design-qa/me-shelf-proportions-comparison-final.png`, and `docs/design-qa/me-overview-cohesion-comparison-final.png`.
- Route: `http://127.0.0.1:5173/me`.
- Latest verified viewports: 1280 × 900 for the wide connected composition, 808 × 897 for the live in-app layout, and 390 × 844 for the responsive layout. The 1280 px page has no horizontal overflow and the Overview surface is exactly 960 px wide; at 808 px it is 760 px wide; at 390 px it is 358 px wide.
- State: authenticated dark-theme Overview and Useful facts views for Amine Barchid with the account's real empty optional fields. The approved mock contains illustrative populated values, while the implementation intentionally does not invent personal data.

**Full-view comparison evidence**

The approved source and original browser capture are stacked at their original 1487 × 1058 dimensions in `docs/design-qa/me-editorial-comparison-final.png`. The user-reported oversized Overview frame and corrected implementation are placed together in `docs/design-qa/me-sizing-comparison-final.png`. The oversized and corrected Useful facts groups are placed together in `docs/design-qa/me-useful-facts-comparison-final.png`. The disconnected triptych and connected Overview are placed together in `docs/design-qa/me-overview-cohesion-comparison-final.png`. The corrected page preserves the editorial-wallet direction while materially reducing the hero, name, folio, shelf, card, image-header, and column scale. Shared AppHeader padding remains consistent with the rest of LifeOS, and the fixed bottom-right Actions launcher remains visible.

**Focused region comparison evidence**

`docs/design-qa/me-overview-cohesion-focused-final.png` isolates the connected Overview. It confirms one bounded surface, a balanced 320 px Identity column beside a 448 px reference column, a shared compact label hierarchy, rounded shelf edges, and a full-width Next up continuation. `docs/design-qa/me-shelf-proportions-comparison-final.png` places the user-reported shelf artwork and corrected implementation together at a matched 524 × 305 region scale. The corrected side replaces the flattened shoe with a fuller, naturally proportioned low-top and the horizontal case with an upright cabin carry-on while preserving the shelf composition and UI rail. `docs/design-qa/me-tabs-comparison-final.png` places the user-reported clipped navigation and the corrected navigation side by side at the same 1048 × 184 input size. `docs/design-qa/me-tabs-focused-final.png` confirms that all four destinations remain fully visible, vertically centered, and bounded by the page divider with the active indicator inside the 48 px row. `docs/design-qa/me-useful-facts-focused-final.png` isolates the corrected category cards at readable scale. It confirms the 352 px card caps, 94 px exact-ratio image strips, natural unequal card heights, left-aligned 16 px group titles, compact descriptions, quick-add wrapping, and fixed Actions clearance. The production hero, folio, Fit shelf, Travel shelf, and Food & language still-life were additionally inspected at native resolution before placement to verify subject accuracy, clean crops, and the absence of generated text or logos.

**Findings**

- No actionable P0, P1, or P2 findings remain.
- Fonts and typography: the implementation uses LifeOS's existing Roboto Slab display face and Outfit body/UI face. The name remains the sole hero headline; field labels use compact tracked caps; values, empty-state copy, and controls maintain readable optical hierarchy without repeating record counts or profile-completion metrics.
- Spacing and layout rhythm: the desktop shell is capped at 80 rem, the connected Overview at 60 rem, the hero at 320 px high, the display name at 56 px, the folio at 320 × 256 px, and the wide shelf panels at 448 × 119 px. The former 76 rem three-rail grid and full-height separators are gone. Identity and Everyday reference now occupy a centered 320/448 px pair within one 960 px surface, while Next up continues across the bottom in the same surface; its item grid uses auto-fit tracks so one date does not leave two empty columns. At 808 px, the top tracks resolve to 320/378 px and remain balanced. Useful facts groups are capped at 352 px wide, use 94 px image strips, and size to their content instead of stretching to a shared 339 px height. The page has no horizontal overflow (`scrollWidth: 1280`, `innerWidth: 1280`). The tab list and its shell share an exact 48 px height with no internal scroll range. At 390 px, the Overview becomes a single 358 px bounded surface, all four tabs fit the content width, and the document remains exactly 390 px wide.
- Colors and visual tokens: near-black LifeOS background/card/border/foreground tokens are preserved. The existing restrained warm accent token is limited to section labels, seals, active details, and focus points; there is no decorative rainbow card coloring or new module palette.
- Image quality and asset fidelity: all visible editorial artwork was generated specifically for its measured slot. The hero has a true 45% negative-space region; the folio contains blank inset areas for real UI text; Fit, Travel, and Food & language objects match their semantic categories. The Fit v4 artwork uses a fuller low-top sneaker with realistic heel, toe, upper, and sole proportions; the Travel v4 artwork uses a compact upright cabin spinner instead of a flattened horizontal case. Both final files are exact 1200 × 320, 3.75:1 compositions and render at 448 × 119.46 with `object-fit: cover`, so the file and layout ratios match without non-uniform scaling. No existing module photography, emoji, placeholder imagery, custom SVG art, or CSS illustration is reused as a substitute.
- Copy and content: the hero has one short purpose line instead of duplicate profile metadata. The folio and shelf values are connected to real profile/fact data and show compact Add affordances when absent. The repeated “Pick only the details…” filler was removed from every empty Useful facts group because each group description and Quick add label already explain the action. Next up uses real birthdays, record expiries, and personal dates, with a purposeful empty state when none exist.
- Icons and controls: Lucide icons match the existing LifeOS stroke family. Edit profile, edit identity, each shelf value, add date, tab navigation, and the floating Actions launcher are real controls with visible focus treatment and accessible names.
- Accessibility and responsiveness: the page keeps semantic headings, tabs, terms/definitions, time elements, named buttons, decorative-image empty alt text, dialog labels, and keyboard focus states. The 390 px capture shows stable wrapping and no overlap in the hero or folio.

**Comparison history**

- User-reported P1 — the Overview used three page-level headings, two full-height separators, and three columns with incompatible content densities. Identity and the shelves were visually dense while a single upcoming date floated in a mostly empty third rail, making the page read as three unrelated mini-pages.
  - Fix: replaced the triptych with one 60 rem bounded surface; balanced Identity and Everyday reference as a centered visual pair; reduced their labels to a shared compact hierarchy; rounded the shelf edges; and moved Next up into a full-width continuation below them. Existing data, dialogs, images, and actions were preserved.
  - Post-fix evidence: `docs/design-qa/me-overview-cohesion-final.png`, `docs/design-qa/me-overview-cohesion-desktop-final.png`, and `docs/design-qa/me-overview-cohesion-comparison-final.png`.
- Cohesion pass P2 — at the live 808 px width, shrinking the reference column to 378 px caused the third shelf value to clip because the original value rail still used the wide-state type size and 26% width.
  - Fix: widened the intermediate value rail to 31%, reduced its row padding and type size below the large breakpoint, and restored the 26%/14 px treatment at wide sizes. All three values now remain visible at 808 px and the compact mobile layout continues to separate the values below each image.
  - Post-fix evidence: `docs/design-qa/me-overview-cohesion-pass-2.png` and `docs/design-qa/me-overview-cohesion-final.png`.
- User-reported P1 — the earlier generated Fit and Travel objects were visibly flattened even though the CSS and file ratios matched: the shoe had an unnaturally low upper and the suitcase read as a stretched horizontal case.
  - Fix: generated new slot-specific v4 rasters with a naturally proportioned low-top shoe and upright carry-on, then cropped each source through an exact 2025 × 540 (3.75:1) window and exported at 1200 × 320. The component continues to preserve the same aspect ratio, layout, overlay, and theme.
  - Post-fix evidence: `docs/design-qa/me-shelf-proportions-focused-final.png` and `docs/design-qa/me-shelf-proportions-comparison-final.png`.
- User-reported P1 — the tab wrapper used `overflow-x-auto`, which also computed vertical overflow to `auto`; the shared shadcn list stayed 32 px high while its triggers were forced to 48 px. This created a 12 px internal vertical scroll range and let the navigation drift upward until its labels were clipped.
  - Fix: removed the overflow container, explicitly set the horizontal tab list to the same 48 px height as its triggers, moved the active indicator inside that bound, and made the four destinations flex to the available mobile width instead of relying on a loose scroll strip.
  - Post-fix evidence: `docs/design-qa/me-tabs-final.png`, `docs/design-qa/me-tabs-mobile-final.png`, and `docs/design-qa/me-tabs-comparison-final.png`.
- User-reported P1 — the Useful facts grid stretched three category cards across the full content width, enlarged each image header to 160 px, forced the groups to equal height, and repeated filler copy in every empty card.
  - Fix: capped the grid at three 352 px tracks, switched to small content-sized shadcn cards, separated the exact-ratio 94 px image strip from the title/content hierarchy, removed equal-height stretching and duplicate filler, and generated a matching 1200 × 320 Food & language asset.
  - Post-fix evidence: `docs/design-qa/me-useful-facts-sizing-final.png`, `docs/design-qa/me-useful-facts-mobile-final.png`, and `docs/design-qa/me-useful-facts-comparison-final.png`.
- User-reported P1 — the 92 rem shell allowed the hero and three-zone composition to scale like a billboard on a wide/retina canvas, and the original 7.5:1 shelf panoramas were being cropped into 3.75:1 slots at roughly double visual scale.
  - Fix: capped the shell and Overview widths, set explicit compact hero/type/folio/shelf bounds, generated new 3.75:1 shelf still lifes with smaller subjects and intentional negative space, and preserved their exact aspect ratio at desktop and mobile sizes.
  - Post-fix evidence: `docs/design-qa/me-sizing-fix-final.png` and `docs/design-qa/me-sizing-comparison-final.png`.
- Earlier P1 — the first production hero placed the instant photograph too far left, causing the image to compete with the name, and the initial headline scale was larger than the approved hierarchy.
  - Fix: generated a revised purpose-built 2205 × 713 hero with uninterrupted leather on the left 45%, reduced hero height and display scale, and tightened the content inset.
  - Post-fix evidence: `docs/design-qa/me-editorial-desktop-final.png` and `docs/design-qa/me-editorial-comparison-final.png`.
- Earlier P2 — the first shelf-value overlay began too far left and crossed into the fabric object area.
  - Fix: narrowed and right-aligned the desktop value rail; on sub-640 px layouts, values now become a dedicated row below the image.
  - Post-fix evidence: `docs/design-qa/me-editorial-desktop-final.png` and `docs/design-qa/me-editorial-mobile-final.png`.
- Earlier P2 — the Food & language group briefly reused the hero artwork, which did not semantically identify that category.
  - Fix: generated a dedicated bowl, cutlery, phrasebook, and fountain-pen still life and wired it only to that group.
  - Post-fix evidence: direct browser inspection of the final Useful facts tab with the dedicated asset.

**Primary interactions tested**

- Opened and closed the fixed floating Actions command palette.
- Verified the command palette exposes Edit profile, Add record/fact/date, and all four tab destinations.
- Opened the Shoe size quick-add dialog from the Fit shelf and confirmed its bounded header, scrolling body region, fixed action footer, placeholder, and disabled empty submit state.
- Opened and closed the Height quick-add dialog from the corrected Useful facts card and verified its labeled field and disabled empty submit state.
- Switched to Useful facts, verified all grouped quick-add controls and purpose-specific imagery, then returned to Overview.
- Verified both v4 shelf images report 1200 × 320 intrinsic dimensions and render at 448 × 119.46 with `object-fit: cover`, preserving the same 3.75:1 ratio end to end.
- Opened and closed Add personal date from the relocated Next up strip and verified its bounded dialog still exposes the name, date, annual-repeat, disabled empty submit, and close controls.
- Verified the connected Overview resolves to 320/448 px visual columns at 1280 px and 320/378 px columns at 808 px, with a full-width auto-fit Next up item rail.
- Rendered the connected surface at 390 × 844 and verified its 358 px width, stacked visual flow, readable separated shelf values, and zero horizontal document overflow.
- Verified the tab shell has no horizontal or vertical scroll range at 1280 × 720 and 390 × 844, and that an attempted retained scroll offset remains zero.
- Pressed Arrow Right from Overview and verified keyboard focus and selection moved to IDs & records.
- Verified the real-data empty Next up state and its Add important date actions.
- Rendered the authenticated page at 390 × 844 and verified the stacked composition, two-line name treatment, fitted tabs, folio, and fixed Actions control.

**Build and diagnostics**

- Web typecheck: passed.
- Web production build: passed.
- Prettier check for `me-page.tsx`: passed.
- Browser console warnings/errors on the latest verified desktop state: none.

**Implementation checklist**

- [x] Remove duplicate counts, completion meters, and repeated hero metadata.
- [x] Replace generic/reused photography with measured, purpose-built raster assets.
- [x] Keep Fit and Travel objects naturally proportioned inside exact-ratio shelf artwork.
- [x] Integrate identity, fit, travel, and dates into one scannable visual Overview.
- [x] Replace the disconnected three-rail triptych with one balanced, bounded Overview surface.
- [x] Cap Useful facts cards and use exact-ratio slot-specific artwork without equal-height stretching.
- [x] Preserve real data, edit dialogs, tabs, and empty states.
- [x] Keep the four module tabs fitted, vertically bounded, keyboard-operable, and free of internal scrolling.
- [x] Keep the shared perspective selector only in AppHeader.
- [x] Add the standard fixed Actions launcher and keyboard shortcut.
- [x] Verify desktop, responsive, interactions, console, typecheck, and production build.

**Follow-up polish**

- P3: the approved mock shows illustrative populated dates and preferences, while the real account is intentionally empty. Once the user adds values, the same layout will gain the denser timeline and reference rhythm shown in the source without any code change.

final result: passed

---

# Money module design QA

**Comparison target**

- Source visual truth: `/var/folders/2m/j9gy8bn938z6djx1scs6lzfh0000gn/T/codex-clipboard-2caacd64-812b-4ec5-9295-d7c9a2feb3a5.png`, used as the composition and mood reference, together with the established LifeOS Documents and Projects page structure requested by the user.
- Browser-rendered implementation: `docs/design-qa/money-overview-desktop-pass-2.png`, `docs/design-qa/money-overview-mobile-pass-1.png`, `docs/design-qa/money-overview-lower-previews.png`, and `docs/design-qa/money-calculation-dialog.png`.
- Route: `http://127.0.0.1:5173/money`.
- Viewports: 1680 × 941 desktop (source is 1672 × 941 and was normalized to 1680 px for comparison) and 390 × 844 mobile.
- State: dark theme, Household scope, realistic EUR account, recurring, activity, goal, and decision data; safe-to-spend period ending at the next known income on 25 July.

**Full-view comparison evidence**

The supplied reference and final desktop implementation were placed into the same original-resolution comparison input at `docs/design-qa/money-overview-comparison-pass-2.png`. The final implementation preserves the reference's graphite atmosphere, restrained champagne accent, quiet borders, real photographic Money artwork, upcoming-movement hierarchy, compact secondary summaries, and low-noise typography. The hero is intentionally reframed around safe-to-spend, rather than the reference's equal-weight monthly snapshot, because safe-to-spend is the product brief's primary household promise. The 128 px content indent and title scale follow the existing LifeOS Documents and Projects modules.

**Focused region comparison evidence**

`docs/design-qa/money-overview-focused-comparison.png` places the reference's recurring/goal/decision card region and the implementation's account/recurring/goal previews into one native-scale comparison. It confirms matching surface restraint, border opacity, card radius, compact row density, subdued secondary copy, progress treatment, and champagne accent. The different card selection is intentional: the written brief requires only Accounts, Recurring, and Goals previews on Overview, while Decisions has its own full section.

**Findings**

- No actionable P0, P1, or P2 findings remain.
- Fonts and typography: the final page uses the existing Outfit variable family and the same display hierarchy as Documents and Projects. The page title is 53.6 px at desktop, safe-to-spend is the single dominant numeric treatment, row labels remain compact, and the 390 px capture has no clipped or awkwardly wrapped text.
- Spacing and layout rhythm: the desktop uses the LifeOS 92 rem shell, 128 px module indent, a 12-column 8/4 hero split, 16 px section gaps, 10–12 px surface radii, and low-contrast dividers. The mobile layout stacks cleanly, keeps horizontal tabs scrollable, and has equal `scrollWidth` and `innerWidth` at 390 px.
- Colors and visual tokens: Money adds one semantic `--money-accent` mapped to a subdued champagne OKLCH value. Background, card, border, foreground, muted, warning, success, and focus states continue to use shared LifeOS tokens.
- Image quality and asset fidelity: the hero uses the existing project-local `apps/web/public/images/money.jpg` raster at its native financial subject and a measured full-bleed crop. The source's ocean and mountain imagery was treated as mood inspiration rather than copied because the user explicitly allowed alignment with the other LifeOS modules. No placeholder imagery, emoji, handcrafted SVG, or newly improvised decorative asset was introduced.
- Copy and content: safe-to-spend, calculation boundaries, account-source-of-truth behavior, missing-income fallback, stale-balance warnings, currency exclusions, scenario-only Decisions, and the exact requested empty states are all stated in calm plain language.
- Icons and controls: Lucide icons match the existing LifeOS icon family and remain optically aligned at 14–16 px. Tabs, selectors, dropdown actions, progress bars, command palette, filters, switches, and dialogs expose real interaction states.
- Accessibility and responsiveness: sections and loading/error states are named, form controls have explicit labels, dialogs and menus use Radix primitives, keyboard focus is visible, reduced motion is respected, and the 340 px-wide mobile goal dialog has no horizontal overflow and a scrollable 737 px task surface.
- Document and project connections: source documents remain references in Documents and surface as linked evidence badges in relevant Money records. Goals and Decisions also surface related-project state without duplicating project data.

**Comparison history**

- Earlier P2 — the first browser implementation used an oversized slab-serif module title and left the Money content full-width, which drifted from the current Documents and Projects hierarchy.
  - Fix: moved the module content onto the established 128 px desktop indent, changed the title to the shared Outfit display treatment, reduced the title and hero heights, and kept safe-to-spend—not the page title—as the visual anchor.
  - Post-fix evidence: `docs/design-qa/money-overview-desktop-pass-1.png`, `docs/design-qa/money-overview-desktop-pass-2.png`, and `docs/design-qa/money-overview-comparison-pass-2.png`.
- Earlier P2 — the calculation dialog correctly excluded future income from safe-to-spend but labeled the next known income as €0, which made a transparent formula look internally inconsistent.
  - Fix: the calculation now reports the next income amount separately while continuing to exclude it from the conservative safe-to-spend operand chain. Zero-value deductions no longer render as negative zero.
  - Post-fix evidence: `docs/design-qa/money-calculation-dialog.png` and the passing calculation test suite.

**Primary interactions tested**

- Loaded `/money` with an authenticated Household and verified the real service response.
- Opened the calculation dialog and verified all operands, the period boundary, the next income label, and the corrected €4,250 separate income value.
- Navigated through Overview, Accounts, Recurring, Activity, Goals, and Decisions.
- Opened Add account and verified its account, balance, inclusion, Household/person, source-statement, and notes fields.
- Opened a recurring-item overflow menu and verified Edit and Pause actions.
- Filtered Activity by the search term “Groceries” and verified the list narrowed to the matching record.
- Opened the command palette with ⌘K and verified add actions and section navigation.
- Opened a mobile Add financial goal flow and verified the 390 px page and dialog had no horizontal overflow.
- Verified the 390 × 844 Overview layout, scrollable tab row, selectors, dominant amount, calculation action, and summary metrics.

**Build and diagnostics**

- Money calculation tests: 4 passed, covering the main operand chain, next income, protected goals, missing income, stale balances, currency exclusion, and month-end recurrence.
- Workspace typecheck: 16 tasks passed.
- Workspace production build: 16 tasks passed.
- Browser runtime/API errors on the verified Money route: none. The browser made one benign request for the repository's existing missing `favicon.ico`; it does not affect the Money module and is classified as P3 repository polish.

**Follow-up polish**

- P3: add a project-level favicon asset in a separate brand pass to remove the existing browser-only 404.

final result: passed

---

# Documents page design QA

**Comparison target**

- Source visual truth: `/var/folders/2m/j9gy8bn938z6djx1scs6lzfh0000gn/T/codex-clipboard-82505f55-b754-488d-b89c-452eebc41b09.png` (document-card art direction), `/var/folders/2m/j9gy8bn938z6djx1scs6lzfh0000gn/T/codex-clipboard-64220c94-9c58-4fa4-a7d1-74a9f7fa0eab.png` (redundant Library region), and `/var/folders/2m/j9gy8bn938z6djx1scs6lzfh0000gn/T/codex-clipboard-5454dca6-f250-4f7c-b8f0-aaf0a15144de.png` (oversized attention panel identified for rework).
- Browser-rendered implementation: `docs/design-qa/attention-collapsed-final.png`, `docs/design-qa/attention-expanded-final.png`, and `docs/design-qa/attention-mobile-collapsed-final.png`.
- Route: `http://127.0.0.1:5173/documents`.
- Viewports: 1280 × 720 desktop and 390 px mobile responsive override.
- State: dark theme, populated library, default collapsed attention state plus expanded attention state.

**Full-view comparison evidence**

The oversized attention source and the final collapsed implementation were opened together for a same-input visual comparison. The final default state preserves the source's alert, title, scope, and count while reducing the persistent section from a large two-tier panel to a 56–64 px disclosure. The expanded capture confirms that all three realistic records remain available without recreating the original vertical weight.

**Focused region comparison evidence**

The source attention screenshot was compared against `docs/design-qa/attention-collapsed-focused-final.png` in one visual input. The focused crop makes the typography, badge, semantic warning accent, and Review disclosure legible at native scale. The expanded state was inspected separately in `docs/design-qa/attention-expanded-final.png`.

**Findings**

- No actionable P0, P1, or P2 findings remain.
- Fonts and typography: existing LifeOS font families, weights, line heights, truncation, and hierarchy remain consistent. The compact attention title uses the existing small-card heading scale, and supporting text is secondary rather than competing with the page title.
- Spacing and layout rhythm: the attention card is 56 px high on the verified 390 px mobile layout and approximately 64 px high on desktop when collapsed. The expanded desktop state adds one dense item row instead of a second large section.
- Colors and visual tokens: surfaces use the existing dark neutrals and semantic tokens; the warm accent is reserved for attention/status and primary actions rather than used decoratively.
- Image quality and asset fidelity: all document previews are real raster assets with appropriate crops and readable silhouettes; no placeholder boxes, emoji, CSS drawings, or improvised SVG artwork are used.
- Copy and content: the long explanatory sentence was replaced with the more scannable “Dates, renewals, and details waiting for you.” The count and record-specific actions remain explicit.
- Review lifecycle: card status now distinguishes “Review extracted details,” “Review in progress,” and “Review complete” without replacing expiry or renewal data in the document model. The in-progress state uses a quiet outlined activity marker and changes the Rental Agreement action to “Continue review.”
- Responsiveness: the 390 px capture has no horizontal overflow (`clientWidth: 390`, `scrollWidth: 390`) and keeps the primary actions reachable.
- Accessibility: the disclosure uses the installed Collapsible primitive, exposes expanded state, and has explicit “Review attention items” / “Hide attention items” accessible names. Each revealed document remains a named button.

**Comparison history**

- Earlier P2 — redundant library navigation block: the visible “Library” heading, instructional sentence, quick-view segmented control, and repeated document count duplicated concepts already represented by the attention panel, search, sort, and modular filters.
  - Fix: removed the visible block and its dedicated quick-view state; preserved a screen-reader-only region heading. Search, sort, and exhaustive filters now follow the attention panel directly.
  - Post-fix evidence: `docs/design-qa/documents-desktop-final.png` and `docs/design-qa/documents-mobile-final.png`.
- P2 — attention panel dominated the library and had no collapse affordance: the source permanently rendered a tall header and three preview rows, consuming roughly 246 px before the document controls.
  - Fix: changed the panel to a controlled disclosure, collapsed by default. The compact summary retains the warning, scope, count, and an explicit Review control. The expanded state uses smaller previews and a dense three-column row on desktop.
  - Post-fix evidence: `docs/design-qa/attention-collapsed-focused-final.png`, `docs/design-qa/attention-expanded-final.png`, and `docs/design-qa/attention-mobile-collapsed-final.png`.

**Primary interactions tested**

- Loaded `/documents` directly.
- Searched the library and verified the result set updates.
- Opened the modular filter field chooser and verified the exhaustive field list.
- Opened the mobile filter sheet.
- Expanded and collapsed the attention disclosure.
- Opened Rental Agreement from the expanded attention list and verified the detail sheet.
- Verified the compact attention state at desktop and mobile widths.
- Verified ready and in-progress review states side by side in the document grid, including the “Continue review” menu action.

**Console errors checked**

- Browser console warnings/errors: none in the verified route state.

**Implementation checklist**

- [x] Remove the redundant visible Library section.
- [x] Preserve semantic region labeling for assistive technology.
- [x] Keep search, sort, and modular filters adjacent to the documents they control.
- [x] Verify document-card fidelity and image quality.
- [x] Verify desktop and mobile rendering with no overflow.
- [x] Verify core library interactions and console state.
- [x] Collapse the attention section by default.
- [x] Preserve all open-loop actions in a denser expanded state.
- [x] Provide explicit accessible Review and Hide controls.

**Follow-up polish**

- No remaining P3 visual refinements are required for this scoped change.

---

# Extracted document review design QA

**Comparison target**

- Selected option 1 visual truth: `/Users/gaasre/.codex/generated_images/019f4aee-5d86-7123-ada1-7c53a6cc8079/exec-b9d31332-66d2-4018-83f0-8b84a22b4734.png`.
- Browser-rendered implementation: `docs/design-qa/document-review-desktop-final.png`, `docs/design-qa/document-review-mobile-final.png`, and `docs/design-qa/document-review-mobile-actions.png`.
- Route: `http://127.0.0.1:5173/documents/rental-agreement/review`.
- Viewports: 1440 × 1024 desktop and 390 × 844 mobile.
- State: dark theme, realistic rental agreement source, structured draft with two unresolved fields, default evidence selection on signature status.

**Same-input comparison evidence**

The selected option and final 1440 × 1024 browser capture were opened together twice: once after the initial implementation and again after the density refinement. The final pass preserves option 1's source/draft split, compact table-like extracted record, restrained amber review state, separate optional suggestions, and consolidated finish actions while conforming to the existing LifeOS typography, radius, and surface tokens.

**Findings**

- No actionable P0, P1, or P2 findings remain.
- Information architecture: the document remains the source of truth on the left; the reviewable structured draft remains the task surface on the right. Suggestions are visually and behaviorally separate from extracted facts.
- Evidence UX: selecting a field updates the source-section label, scrolls the document to the matching evidence region, and renders a restrained highlight over the exact region.
- Review states: extracted, needs-review, and verified are communicated with text and semantic color; no confidence percentages or opaque AI scoring are shown.
- Editing: inline editing preserves context and promotes a saved value to verified. Verify, evidence, and edit controls remain individually named for assistive technology.
- Safety and agency: the interface explicitly states that the original remains unchanged. Suggested connections and reminders require explicit acceptance and can be dismissed.
- Responsiveness: the 390 px verification had no horizontal overflow (`clientWidth: 390`, `scrollWidth: 390`). The source and draft stack in reading order, and the consolidated save/finish surface remains reachable without covering content.
- Asset fidelity: the existing rental agreement raster is used directly; no placeholder imagery, improvised SVG, CSS illustration, or generated decoration was introduced.

**Primary interactions tested**

- Entered the review route from the Rental Agreement card's named “Review extracted data” menu item.
- Returned to the Documents library through “Back to Documents.”
- Selected monthly rent and verified that the source label and evidence region synchronized.
- Verified signature status and observed the open-review count update.
- Marked all open review items reviewed in one action and verified the count, field statuses, and disabled completed state update together.
- Edited signature status inline, saved it, and observed the verified value.
- Accepted the Home connection suggestion and dismissed the renewal reminder.
- Accepted all remaining LifeOS suggestions in one action and verified both suggestion states plus the disabled “All accepted” control.
- Saved the draft and observed confirmation feedback.
- Finished the review and verified the completed, disabled primary action state.
- Increased document zoom from 100% to 110%.

**Build and diagnostics**

- Workspace typecheck: passed.
- Workspace production build: passed.
- Browser console warnings/errors in the verified route state: none.

final result: passed

---

# Compact document card design QA

**Comparison target**

- Source visual truth: `docs/audits/document-card/01-current-card-grid.png` and the user-supplied Annual Health Summary card screenshot at `/var/folders/2m/j9gy8bn938z6djx1scs6lzfh0000gn/T/codex-clipboard-e8fce06a-55a0-48d0-8855-f849de1dbb1c.png`.
- Browser-rendered implementation: `docs/design-qa/document-card-compact-desktop-final.png` and `docs/design-qa/document-card-compact-mobile-final.png`.
- Same-input comparison: `docs/design-qa/document-card-compact-comparison.jpg`.
- Route: `http://127.0.0.1:5174/documents`.
- Viewports: the in-app browser rendered the desktop state at 1280 × 720 with a 1353 px full-page height and the mobile state at 390 × 844. The source capture is 1440 × 1024; source and desktop implementation both show the same four-column state.
- State: dark theme, populated library, compact attention disclosure, default card state.

**Full-view comparison evidence**

The source and implementation were placed together in `docs/design-qa/document-card-compact-comparison.jpg` and inspected at original resolution. The implementation preserves the four-column library, real document previews, grayscale-to-color treatment, and preview-to-metadata fade while removing the separate header/content bands below the preview. The first implementation card measures 256 × 396 px at the verified viewport, including its 44 px status strip.

**Focused region comparison evidence**

A separate crop was not needed because the original-resolution comparison keeps the title, format, relationship chips, fade, and footer boundaries legible. The Rental Agreement overflow menu was inspected directly in the browser: it measures 240 px wide, every item is 28 px high, and “Make available offline” has equal client and scroll widths with no wrapping.

**Findings**

- No actionable P0, P1, or P2 findings remain.
- Fonts and typography: the existing Outfit and Roboto Slab hierarchy is preserved. Titles remain the visual anchor, support two lines, and keep format information secondary.
- Spacing and layout rhythm: the fixed 4:5 preview plus separate metadata bands were replaced by capped responsive preview heights. Identity content is overlaid within the fade, and the independent status footer is 44 px high.
- Colors and visual tokens: existing card, muted, foreground, info, warning, and success tokens are reused. The fade overlaps the lower image edge by one pixel to avoid the earlier light seam/flicker.
- Image quality and asset fidelity: every card continues to use its real raster preview with an intentional top crop. No generated placeholder, improvised SVG, or CSS illustration was introduced.
- Copy and content: title, file type/page count or size, connected life areas, review/attention state, and offline/cloud state all remain visible. No structured-data or review affordance was removed.
- Responsiveness: single-column previews are capped at 448 px instead of growing at a 4:5 ratio with the full viewport. The verified 390 px state has no horizontal overflow (`clientWidth: 390`, `scrollWidth: 390`), and breakpoint-specific caps keep two-, three-, and four-column cards scannable.
- Accessibility: each card remains labeled by its visible title, the full preview is a named open button, action menus retain named controls, and review state is communicated with text rather than color alone.

**Primary interactions tested**

- Loaded the Documents route with all seven records.
- Opened the Rental Agreement action menu.
- Verified Open, Continue review, Make available offline, and Archive items.
- Measured the overflow menu and confirmed no item wraps.
- Verified the compact card at 390 × 844 with the touch-accessible action trigger visible and no horizontal overflow.
- Checked browser warnings/errors: none.

**Build and diagnostics**

- Web typecheck: passed.
- Web production build: passed.
- Browser console warnings/errors: none.

**Component structure**

- `DocumentCard`: composition only.
- `DocumentCardPreview`: preview, fade, identity metadata, and relationship chips.
- `DocumentCardActions`: overflow actions and review navigation.
- `DocumentCardStatus`: review/attention/date plus offline state.

**Comparison history**

- P2 — cards were oversized because a 4:5 preview was followed by separate title, metadata, chip, and footer regions.
  - Fix: capped preview height by breakpoint and moved title, format, and relationship chips into the lower fade.
  - Post-fix evidence: `docs/design-qa/document-card-compact-comparison.jpg`.
- P2 — a transient light line could appear at the preview/metadata boundary on hover.
  - Fix: preview and identity now share one isolated surface; the gradient overlaps the lower edge by one pixel and no image/content seam remains.
  - Post-fix evidence: `docs/design-qa/document-card-compact-desktop-final.png`.
- P2 — the action-menu label could wrap awkwardly.
  - Fix: card action items use a 240 px minimum menu and explicit no-wrap labels.
  - Post-fix evidence: direct browser geometry inspection of the Rental Agreement menu.

**Follow-up polish**

- No remaining P3 refinements are required for this scoped card-density change.

final result: passed
