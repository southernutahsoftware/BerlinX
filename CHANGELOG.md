# Changelog

All notable changes to BerlinX are documented here. This project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

- BerlinX Elements: optional, light-DOM custom elements in `dist/elements/`,
  imported as `berlinx/elements` or one at a time as `berlinx/elements/<name>`.
  `<bx-combobox>`, `<bx-dropdown>`, `<bx-context-menu>`, `<bx-data-table>`
  and `<bx-date-picker>` enhance native markup that still works without
  JavaScript; `toast()` and `confirm()` are helpers. About 12 KB gzipped.
- Styles for the elements, and for `[role="menu"]` and `[role="listbox"]`
  popovers, in a new section 10 of `berlinx.css`.
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
