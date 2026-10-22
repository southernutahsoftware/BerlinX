# Changelog

All notable changes to BerlinX are documented here. This project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
