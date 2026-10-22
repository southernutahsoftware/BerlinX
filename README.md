<div align="center">

<img src="icon.svg" alt="" width="96" height="96" />

# BerlinX

**Thoughtful defaults. Beautifully simple.**

A tiny, classless CSS library. Write plain semantic HTML; reach for an attribute
when you want a variant. No classes, no build step, no JavaScript.

[![MIT License](https://img.shields.io/badge/license-MIT-4f6ac6)](LICENSE)
![Classless](https://img.shields.io/badge/classless-✓-4f6ac6)
![Light and dark](https://img.shields.io/badge/light_%26_dark-✓-4f6ac6)

[**Live demo**](https://berlinx.southernutahsoftware.com) ·
[Usage guide](https://berlinx.southernutahsoftware.com/guide) ·
[Cheatsheet](https://berlinx.southernutahsoftware.com/cheatsheet)

<br />

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshot-dark.png" />
  <img src="docs/screenshot-light.png" alt="The BerlinX demo site: a sidebar of components beside the BerlinX introduction, with Get started and Explore buttons" width="800" />
</picture>

</div>

## Why BerlinX?

- **Just HTML.** `<button>`, `<dialog>`, `<details>`, `<table>` look good out
  of the box.
- **Attributes, not classes.** `<button destructive>` reads like what it is.
- **Light and dark.** Follows the system, or pin a theme on any element.
- **Accessible by default.** Every colour pairing meets WCAG AA, focus is
  always visible, and reduced motion is respected.
- **Yours to theme.** A handful of custom properties, and zero-specificity
  base rules so your CSS always wins.

## Get started

Drop the stylesheet into your page:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/berlinx@1.0.0/dist/berlinx.min.css" />
```

or install it:

```sh
npm install berlinx
```

```css
@import "berlinx/min";
```

Prefer to self-host? Download [`dist/berlinx.min.css`](dist/berlinx.min.css).

## A taste

```html
<header row justify="between" items="center">
  <nav breadcrumb><a href="/">Home</a><a href="/docs">Docs</a></nav>
  <button primary>Save</button>
</header>

<article>
  <h2>Invoice #1024</h2>
  <p>Due Friday. <span badge destructive>Overdue</span></p>
  <footer row gap-m justify="end">
    <button secondary>Cancel</button>
    <button destructive>Delete</button>
  </footer>
</article>
```

Make it yours:

```css
:root {
  --primary: #7c3aed;
  --radius: 12px;
}
```

## Learn more

- [**Usage guide**](docs/guide.md): installation, layout, components and theming.
- [**Cheatsheet**](docs/cheatsheet.md): every attribute and token on one page.
- [**Live demo**](https://berlinx.southernutahsoftware.com): every component, in
  light and dark.

## Development

```sh
npm install
npm run build    # dist/ stylesheets and the HTML guides
```

Edit `css/berlinx.css`; `dist/` is generated from it. Open `index.html` to see
the demo, no server needed.

## Thanks

Inspired by [shadcn/ui](https://ui.shadcn.com/) and [Pico](https://picocss.com).
Demo icons by [Lucide](https://lucide.dev).

## License

[MIT](LICENSE) © Southern Utah Software
