# Changelog

All notable changes to BerlinX are documented here. This project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

- Material skin: `dist/berlinx-material.css` (`berlinx/material.css`), loaded
  after BerlinX and the Elements styles, gives every component and element a
  Material Design 3 look with no change to the markup. The existing variants
  become filled, tonal, outlined and text buttons. It adds state layers and a
  CSS-only ripple, and its colours come from `--md-*` roles in both schemes.
  Text fields are filled; `fields="outlined"` on any element outlines the
  fields inside it.
- The demo site and guides have a palette button that switches the skin on.

## 1.2.0

- `<bx-data-table src>`, or a `load` function, hands sorting, filtering and
  paging to a server. Rows come back as objects keyed by the headers'
  `data-key`, arrays or `<tr>`s, and stay selected by id across pages
  (`selectedIds()`). `reload()` fetches the current page again.
- `<bx-select>`: a searchable single select around a native `<select>`, with
  options from the page or from a server (`src` or `load`). It shows the
  label and submits the value.
- `<bx-combobox src>` fetches options without script.
- Elements that load say so when a request fails (the `loadFailed` label).

## 1.1.0

- BerlinX Elements: optional, light-DOM custom elements in `dist/elements/`,
  imported as `berlinx/elements` or one at a time as `berlinx/elements/<name>`,
  with their own stylesheet, `dist/berlinx-elements.css`. `<bx-combobox>`
  (with options loaded as you type), `<bx-multi-select>`, `<bx-dropdown>`,
  `<bx-context-menu>`, `<bx-command>`, `<bx-tabs>`, `<bx-data-table>`,
  `<bx-date-picker>` (single dates and ranges), `<bx-tree>` and
  `<bx-sidebar>` (a drawer on phones) enhance native markup that still works without JavaScript.
  `toast()`, `confirm()` and accessible `[tooltip]`s are helpers, and
  `setLabels()` translates every word the elements add.
- Pagination buttons no longer flash the primary colour while pressed.

## 1.0.0

First public release.

- Classless styles for semantic HTML: typography, forms, buttons, tables,
  dialogs, popovers, details, navigation and more.
- Variants as bare attributes (`primary`, `outline`, `destructive`, `badge`,
  `tag`, …) and layout helpers (`row`, `col`, `grid`, `gap-*`, `justify`,
  `items`).
- Light and dark themes that follow the system, pinned with `theme="light"` or
  `theme="dark"` on any element.
- Theming through custom properties; every default colour pairing meets WCAG AA.
- Zero-specificity base rules (`:where()`), so your own CSS always wins.
