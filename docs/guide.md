# BerlinX usage guide

A powerful semantic CSS library. Write plain HTML; opt into variants with
attributes. No classes, no build step, no JavaScript.

```html
<button destructive>Delete</button>
<nav breadcrumb><a href="/">Home</a><a href="/docs">Docs</a></nav>
<aside><header>…</header><nav>…</nav><footer>…</footer></aside>
```

## Install

Download `dist/berlinx.min.css`, then link it locally:

```html
<link
  rel="stylesheet"
  href="./berlinx.min.css"
/>
```

npm:

```sh
npm install berlinx
```

```css
@import "berlinx";               /* readable build */
@import "berlinx/min";           /* minified */
```

Bundlers can also import the files directly, as `berlinx/dist/berlinx.min.css`.

From a CDN, pin the exact version so a release can never change under you:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/berlinx@1.2.0/dist/berlinx.min.css" />
```

BerlinX asks for **Inter** first and falls back to the system sans stack. It
does not fetch the font for you — add it yourself if you want it:

```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;display=swap"
/>
```

## Attribute vocabulary

Variants are bare attributes. One vocabulary, reused across components. The
[cheatsheet](cheatsheet.md) is the same vocabulary as a lookup table, with every
value and every theming token on one page.

| Attribute                                              | Applies to                    | Effect                                     |
| ------------------------------------------------------ | ----------------------------- | ------------------------------------------ |
| `primary` `secondary` `outline` `ghost` `destructive`   | `button`, `input`, `[tag]`    | Button appearance                          |
| `icon`                                                  | `button`, `input`, `[tag]`    | Square icon-only button (pair with `aria-label`, and `tooltip` or `title`) |
| `tag`                                                   | any element                   | Renders as a button; takes every button variant |
| `badge`                                                 | any inline element            | Badge; combine with `secondary`/`outline`/`destructive` |
| `breadcrumb`                                            | `nav`                         | Breadcrumb separators (opt-in); set `--separator` to change the mark |
| `drawer` / `drawer="top\|left\|right"`                  | `dialog`                      | Edge-anchored drawer                       |
| `toast`                                                 | `dialog`                      | Fixed corner toast                         |
| `responsive` / `responsive="stack"`                     | `table`, or a wrapper         | Scrolls sideways; `stack` instead cards each row on phones |
| `toggle`                                                | `label`                       | Icon toggle wrapping a checkbox            |
| `stack`                                                 | `label`                       | Label above its control instead of beside it |
| `placement="top\|bottom"` + `-start`/`-end`             | `[popover]`                   | Which side of its anchor the popover opens on |
| `reveal`                                                | any container (`tr`, `li`, …) | Hides the buttons and toggles inside until hover or focus; plain links stay |
| `tooltip="…"`                                           | any                           | Hover/focus label (visual only — keep `aria-label`) |
| `loading`                                               | any                           | Spinner, replacing any icon; pair with `aria-busy="true"` |
| `skeleton`                                              | any                           | Shimmering placeholder                     |
| `xl`                                                    | `h1`–`h6`                     | Larger heading step                        |
| `subheader`                                             | any                           | Muted lede directly after a heading        |
| `row` `col`                                             | any                           | Flex direction                             |
| `gap-xs` `gap` `gap-s` `gap-m` `gap-l`                  | any                           | 2px / 6px / 6px / 12px / 24px (`gap` is `gap-s`) |
| `justify="start\|center\|end\|between"`                 | any flex container            | Placement along the main axis              |
| `items="start\|center\|end\|stretch"`                   | any flex container            | Placement across the axis                  |
| `full-width`                                            | any                           | `width: 100%`                              |
| `grid` / `grid fit`                                     | any container                 | Responsive columns; `fit` expands short lists |
| `grow` / `nowrap`                                       | flex children / containers    | Fill remaining space / keep a row on one line |
| `density="compact\|comfortable"`                       | a container or control        | Smaller desktop controls / larger touch-friendly controls |
| `ellipsis` / `tabular`                                  | text                          | Single-line truncation / aligned numeric digits |
| `notice` / `notice="success\|warning\|error"`         | any                           | Feedback panel; add an appropriate live-region role |
| `visually-hidden`                                      | any                           | Visually hide while preserving keyboard and screen-reader access |
| `scroll-x` `scroll-y`                                   | any                           | Scroll container                           |
| `primary` `accent` `muted`                              | text elements                 | Text colour                                |
| `vertical`                                              | `hr`                          | Vertical rule                              |
| `theme="light\|dark"`                                   | `html`, or any container      | Pins a theme for the page or a region; otherwise the system setting decides |

> **A note on validation.** These are bare custom attributes, not `data-*`, so
> the W3C validator reports `Attribute X not allowed on element Y`. Browsers
> handle them correctly — attribute selectors have matched arbitrary attributes
> since CSS2 — but if your CI gates on HTML validation, be aware of it.

## Tags

`tag` gives any element the button's exact appearance — same pill, padding,
type scale and variants — for labels that are not form controls:

```html
<span tag>Design</span>
<span tag secondary>CSS</span>
<a href="/tags/html" tag outline>HTML</a>
<span tag destructive>Deprecated</span>
```

Tags and buttons share the same rules rather than duplicating them, so they
cannot drift apart, and `--button-bg` and friends theme both.

The one deliberate difference is interactivity. A tag gets the hand cursor and
the hover, active and focus states when it is an `a`, `button`, `summary` or
`label`; a plain `<span tag>` is inert, so it never pretends to be clickable.
`<a tag>` also drops the link colour and hover underline.

For a file picker, wrap the native control in the tag. Keep it focusable with
`visually-hidden`; a `hidden` input cannot be reached from the keyboard. The
label receives a visible focus ring when its control is focused:

```html
<label tag>
  <input type="file" visually-hidden />
  Choose a file
</label>
```

## Responsive tables

A wide table is the one element that reliably breaks a phone layout. `responsive`
gives it its own horizontal scrollbar, so it can never stretch the page. Put it
on a wrapping element:

```html
<div responsive><table>…</table></div>
```

That form is worth preferring, because the attribute on the table itself has to
change the table's own `display` to a block before `overflow` applies to it at
all — and a block-displayed table shrink-wraps its columns instead of spreading
them across the container, as well as dropping the table role:

```html
<table responsive>…</table>
```

Either way the scrollbar only engages once the table genuinely cannot shrink any
further — a table squeezes itself by wrapping text first, so a few prose columns
will still cram rather than scroll. If you would rather the columns keep their
natural width, say so and let `responsive` catch the overflow:

```css
table { white-space: nowrap; }
```

Scrolling keeps the grid intact, which is what you want when readers compare
rows. When they only ever read one record at a time, `responsive="stack"` is
kinder: under 600px it breaks each row into its own card, printing every cell's
`data-label` beside its value, and above that it stays an ordinary full-width
table:

```html
<table responsive="stack">
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Email</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Ada Lovelace</th>
      <td data-label="Email">ada@example.com</td>
    </tr>
  </tbody>
</table>
```

The label has to be repeated on each cell because no selector can reach a cell's
`<th>` from the cell — CSS `attr()` only reads the element it is on, and closing
that gap would need JavaScript. A cell with no `data-label` simply prints its
content, which is what you want for a row's `<th scope="row">` and for an
actions cell full of buttons.

Both `<table responsive>` and `responsive="stack"` change the table's `display`
in the modes described above, and browsers drop the table role when they do. If
the tabular relationship matters to screen-reader users, put it back explicitly
with `role="table"`, `role="row"` and `role="cell"` — or wrap the table instead,
which leaves its semantics alone entirely.

## Layout

`row` and `col` pick the axis, `gap` sizes the space, `justify` and `items`
place the children. Between them they cover the two shapes every app needs — the
toolbar and the button row — without a stylesheet of your own:

```html
<header row justify="between" items="center">
  <h1 xl>ClientBook</h1>
  <button icon secondary aria-label="Account">…</button>
</header>

<div row gap-m justify="end">
  <button secondary>Cancel</button>
  <button type="submit">Save</button>
</div>
```

Headings, paragraphs and sectioning elements drop their block margins inside a
`row`, because a flex container already spaces its children with `gap` and the
two would otherwise add up. Prose margins inside a `col` are left alone.

The layout attributes are safe on a `popover` or a `dialog`: BerlinX restates the
"hidden while closed" rule at author level, which a bare `display: flex` from
`row`/`col` would otherwise outrank — leaving the menu on screen permanently.

`grid` creates responsive columns with a minimum width of 240px. Change
`--grid-min` for the content, and add `fit` to expand a short list into the space
available. The minimum is capped at the container width, so a phone gets a
single column rather than an overflowing card:

```html
<div grid fit gap-m style="--grid-min: 18rem">
  <article>First card</article>
  <article>Second card</article>
</div>

<header row nowrap gap-xs items="center">
  <strong grow ellipsis>A long document title</strong>
  <button icon secondary aria-label="More actions">…</button>
</header>
```

`grow` lets a flex child expand and shrink; `ellipsis` truncates its text without
pushing the adjacent action off screen. `tabular` gives numbers equal-width
digits for timers, totals and progress. `nowrap` keeps a toolbar on one line;
use shrinking children or a scroll container if its content is wider than the
available space.

The default page is a centred document. Apps can remove that constraint without
replacing the reset:

```css
body {
  --content-width: none;
  --page-padding: 0;
}
```

## Control density and feedback

Default buttons and text controls have a 2.5rem minimum height (40px at the
standard text size), with 12px horizontal input padding. Apply `density="compact"` to a desktop
toolbar or `density="comfortable"` to a form. The setting inherits through its
container and can be changed again on a nested container or a single control.
Comfortable buttons and text controls are at least 44px high with 16px text.
Checkboxes, radios and switches retain their native or dedicated sizing.

```html
<form density="comfortable">
  <label stack>Email<input type="email" autocomplete="email" required /></label>
  <button type="submit">Subscribe</button>
</form>

<p notice role="status">Your changes are being synced.</p>
<p notice="success" role="status">Changes saved.</p>
<p notice="warning" role="status">Your trial ends in 3 days.</p>
<p notice="error" role="alert">Could not save. Please try again.</p>
```

`notice` supplies appearance. Use `role="status"` for routine dynamic updates
and `role="alert"` for urgent errors; CSS alone does not announce messages.
Text inputs without `type`, and `datetime-local`, `month` and `week` inputs,
receive the same styling as the other text fields. Ordinary fieldsets can wrap
on narrow screens; joined `fieldset[role="group"]` controls remain on one line.

## Popovers

A popover opens centred above its anchor. `placement` moves it — `top` or
`bottom`, on its own or with `-start`/`-end` to line its edge up with the
anchor's:

```html
<button popovertarget="menu" icon aria-label="Account">…</button>
<div popover id="menu" placement="bottom-end" col gap>
  <p>Signed in as <strong>ada@example.com</strong></p>
  <button secondary>Sign out</button>
</div>
```

Anchored placement is progressive enhancement: engines without CSS anchor
positioning centre the popover in the viewport instead of misplacing it, and
where the feature exists a popover near an edge flips to the other side rather
than opening off-screen.

Anchoring uses CSS `position-area`, guarded by `@supports`, to avoid scrolled-page
coordinate mismatches. Set `placement="center"` to keep a popover centred in the
viewport on every engine. Use that for a popover opened programmatically without
an invoker; anchored popovers should be opened by their `popovertarget` button.

## Row actions

`reveal` hides the controls inside a container until it is hovered — the pattern
every table of records ends up wanting for its edit and delete buttons:

```html
<tr reveal>
  <td>Ada Lovelace</td>
  <td row justify="end" gap>
    <button icon secondary tooltip="Edit" aria-label="Edit">…</button>
    <button icon destructive tooltip="Delete" aria-label="Delete">…</button>
  </td>
</tr>
```

Focus reveals them too, so they stay reachable from the keyboard, and where the
pointer cannot hover at all they are never hidden in the first place. Only
controls hide — buttons, button-styled `a tag` links and `label toggle`s. A
plain link, such as the record's name, is content and always stays visible.

`tooltip` is a visual affordance only — assistive tech never sees the attribute,
which is why the `aria-label` beside it is not optional. Inside a `responsive`
scroll container a tooltip can be clipped by the scroll box; use `title` there.

## Semantic elements

Elements are styled directly. A few carry component meaning:

| Element                             | Renders as                     |
| ----------------------------------- | ------------------------------ |
| `article`                           | Card                           |
| `aside`                             | Sidebar panel                  |
| `aside > nav`                       | Sidebar's scrolling link list  |
| `details` / `summary`               | Accordion                      |
| `dialog`                            | Modal                          |
| `fieldset role="group"`             | Joined input + button          |
| `kbd`                               | Keycap                         |
| `menu > li > button`                | Menubar                        |
| `nav`                               | Nav bar                        |
| `table`                             | Data table                     |
| `input[type=checkbox][role=switch]` | Switch                         |

Because `aside` and `menu` are claimed by components, use `blockquote` for pull
quotes and `ul` for plain lists.

## More components

The demo includes each of these components. The library remains CSS-only;
native controls provide selection and validation, and application state supplies
page numbers, completed steps and notification counts.

| Markup | Purpose |
| --- | --- |
| `[field]`, `[hint]`, `[error]`, `[validation]` | Labels, descriptions and validation feedback |
| `<fieldset segmented>` | Radio options presented as compact selectable cards |
| `<label choice>` | Selectable radio or checkbox card |
| `<ul list>` / `<ol list>` | Rich rows with icons, descriptions and actions |
| `<dl>` / `<dt>` / `<dd>` | Responsive description list; optional `div` pair wrappers |
| `<nav pagination>` | Page links styled by `aria-current="page"` |
| `[avatar]`, `[avatars]` | Photo or initials avatar, or an overlapping group |
| `[empty]` | Centred explanation and action for an empty collection |
| `<ol steps>` | Horizontal progress steps, vertical below 600px |
| `<ol timeline>` | A vertical activity timeline |
| `<meter>` | A scalar measurement within a known range |
| `<fieldset rating>` | A star rating backed by native radio inputs |
| `[indicator]` containing `[badge]` or `[status]` | Notification count or status dot |
| `<nav tabs>` | Navigation links with an active underline |
| `[carousel]` | Manual carousel with CSS scroll snapping |

### Descriptions and validation

`field` groups a label and control with hint/error text. Keep explicit label and
description relationships in HTML. Inside a `validation` container, error text
is initially hidden and revealed when its field contains `aria-invalid="true"`
or, in supported engines, a native `:user-invalid` control. This avoids showing
errors on untouched required fields. Without `:user-invalid`, normal browser
validation still applies; explicit ARIA error states work in every supported engine.

```html
<form validation>
  <div field>
    <label for="email">Email</label>
    <input id="email" type="email" required aria-describedby="email-hint email-error" />
    <small id="email-hint" hint>We will send your receipt here.</small>
    <small id="email-error" error>Enter a valid email address.</small>
  </div>
  <button type="submit">Continue</button>
</form>
```

Set `aria-invalid="true"` in server-rendered HTML or application code for errors
the browser cannot determine, such as an unavailable username. CSS cannot update
ARIA attributes or validate business rules. Outside a `validation` container,
`error` text is always visible. Do not rely on colour alone or assume CSS visibility
changes will announce a message automatically.

### Native choices and ratings

Segmented options use the same outlined, selected-card treatment as choice
cards, with visible native radios. Both align the control with the first label
line, even when a description follows. Use a common radio `name` within a group
and a different name for each unrelated
group. The inputs remain focusable and contribute their normal form values.

```html
<fieldset segmented>
  <legend>Billing period</legend>
  <label><input type="radio" name="billing" value="monthly" checked />Monthly</label>
  <label><input type="radio" name="billing" value="yearly" />Yearly</label>
</fieldset>

<label choice>
  <input type="checkbox" name="backup" />
  <span col gap-xs><strong>Backups</strong><small muted>Keep a daily copy.</small></span>
</label>

<fieldset rating>
  <legend>Experience</legend>
  <label><input type="radio" name="rating" value="1" /><span aria-hidden="true">★</span><span visually-hidden>1 star</span></label>
  <label><input type="radio" name="rating" value="2" /><span aria-hidden="true">★</span><span visually-hidden>2 stars</span></label>
  <label><input type="radio" name="rating" value="3" /><span aria-hidden="true">★</span><span visually-hidden>3 stars</span></label>
</fieldset>
```

Tab into a radio group and use the arrow keys to select. Disabled inputs retain
their native disabled behavior. A native form reset restores the original rating;
with no initial `checked` value it clears the rating.

### Lists, identities and progress

Rich lists can contain ordinary rows or a single full-row anchor. Include
`role="list"` on lists whose native markers are removed, including `list`,
`steps` and `timeline`, to preserve list exposure across browser/assistive-tech
combinations. Do not nest a button inside a full-row anchor.

```html
<ul list role="list">
  <li><span avatar aria-hidden="true">AL</span><div col grow><strong>Ada Lovelace</strong><small muted>Owner</small></div><button secondary>View</button></li>
</ul>

<dl><dt>Client</dt><dd>Ada Lovelace</dd><dt>Plan</dt><dd>Team</dd></dl>

<ol steps role="list" aria-label="Setup">
  <li complete><strong>Account <span visually-hidden>completed</span></strong></li>
  <li aria-current="step"><strong>Plan</strong></li>
  <li><strong>Project</strong></li>
</ol>

<ol timeline role="list"><li><time datetime="2026-10-14">October 14</time><p>Project created.</p></li></ol>
```

Avatars accept `avatar="small"`, bare `avatar`, or `avatar="large"`; override
`--avatar-size` for another size. Images need `alt`; initials need accessible text
or a named `role="img"` when their meaning is not already supplied beside them.
Put avatars in an `avatars` wrapper for overlap. Initials are supplied in HTML;
CSS does not extract them or replace failed image downloads.

Wrap a control or avatar in `indicator`, then add a `badge` or `status` child.
Supply counts/status in accessible text and optionally set `--indicator-color`.
A colour-only status dot does not communicate its meaning to everyone.

Use `meter` for quotas, scores and other bounded measurements; its default height
is `1rem`. `min`, `max`,
`low`, `high`, `optimum` and `value` retain their native meanings. Associate it
with a label and show a textual value. Use `progress` for task completion.

### Navigation and carousels

Pagination and navigation tabs use real links. Supply current state with
`aria-current="page"` or `aria-current="location"`. Use a span or a native
disabled button for unavailable actions: `aria-disabled` alone does not stop a link.
Pagination does not fetch data, and `nav tabs` is link navigation, not an ARIA
tablist with hidden panels and a roving keyboard focus model.

```html
<nav pagination aria-label="Pages"><a href="?page=1" aria-current="page">1</a><a href="?page=2">2</a></nav>
<nav tabs aria-label="Project"><a href="/overview" aria-current="page">Overview</a><a href="/activity">Activity</a></nav>

<div carousel role="region" aria-label="Carousel" tabindex="0">
  <article id="slide-1" tabindex="-1">First slide</article>
  <article id="slide-2" tabindex="-1">Second slide</article>
</div>
<nav aria-label="Slides"><a href="#slide-1">Slide 1</a><a href="#slide-2">Slide 2</a></nav>
```

A carousel supports native touch, trackpad, keyboard and fragment-link navigation.
Set `--slide-size` to override the default 85% width. It never autoplays, and
reduced motion disables its smooth scrolling. Keep slide contents reachable and
give the focusable scroll region an accessible name.

## Light and dark themes

BerlinX ships both, and follows the reader's system setting by default. Pin one
for the whole page on `<html>`, or theme a single region — a dark sidebar in a
light app, a light card on a dark page:

```html
<html theme="dark">
<aside theme="dark">…</aside>
<article theme="light">…</article>
```

A themed region paints its own background and text colour, and every component
inside it follows. Printing always uses the light theme.

Each colour token holds both values with `light-dark()`. Override it the same
way to keep both themes, or give a plain value to use it in both:

```css
:root {
  --primary: #7c3aed; /* a fill: works on light and dark */
  --background: light-dark(#fffdf8, #12100e);
  --foreground: light-dark(#1c1917, #f5f5f4);
}
```

If you replace the surface colours (`--background`, `--card`, …) with plain
light values only, add `theme="light"` to `<html>` so a reader in dark mode does
not get your light surfaces with dark-theme text. Engines without `light-dark()`
(Chrome/Edge before 123, Safari before 17.5) always get the light theme.

## Theming

Headings use relative sizes and unitless leading, so they follow the reader's
chosen text size. Body leading is `--line-height: 1.65`. The default page has
24px padding, reduced to 16px below 600px; `--page-padding` overrides both.
Prose has extra space before subsequent headings. Cards, details and overlays
remove their first and last children's outer margins so padding stays consistent.

Every colour, space and radius is a custom property on `:root`. Override what
you want:

```css
:root {
  --primary: #7c3aed;
  --radius: 4px;
}
```

Base element rules are wrapped in `:where()`, so they carry **zero
specificity** — any class or element rule of yours wins without `!important`:

```css
.hero-button {
  background: black;
} /* just works */
```

A single button can be themed through the same properties the variants use:

```css
.brand-button {
  --button-bg: rebeccapurple;
  --button-fg: white;
  --button-bg-hover: #5b2d91;
}
```

A fill and text in the same colour cannot both reach 4.5:1 on a dark page, so
colours that appear as text have their own token:

| Fill | Text in that colour | Used for |
| --- | --- | --- |
| `--primary` | `--primary-text` | links, `[primary]` text, current tab and step |
| `--destructive` | `--destructive-text` | `[error]` messages |
| `--accent` | `--accent-text` | `[accent]` text, filled rating stars |

`--primary-text` and `--destructive-text` are derived from their fills, so
setting `--primary` alone recolours links in both themes. `--accent` is a
**fill** colour: `#ffbf00` as text on white is 1.65:1. `--success` and
`--warning` colour the edge of `notice="success|warning"` and the meter's
levels; `--input` is the background of text fields.

## Accessibility

- Every default text and fill pairing meets WCAG AA in both themes — 4.5:1 for
  text, 3:1 for fills and focus rings — including hover states.
  Check custom themes separately.
- Logical properties throughout: in a `dir="rtl"` document switches, steps,
  timelines, toasts, joined groups, breadcrumbs and select arrows mirror.
- Badge and tooltip text is sized in `rem`, so it follows the reader's font size.
- `aria-busy="true"` is a real ARIA state, not a styling hook. Use `loading`
  for the spinner and `aria-busy="true"` for the semantics. Add `disabled` to
  busy native buttons to prevent both pointer and keyboard activation;
  `loading` alone cannot block keyboard events or duplicate submissions.
- Icon-only buttons and unlabelled controls need an `aria-label`. `tooltip` does
  not count: it is drawn with CSS and never reaches assistive tech.
- Focus is visible on every interactive element via `:focus-visible`.
- Text controls use an outline that survives forced-colour modes. Custom switches
  also use system colours in that mode, and selects get the system arrow back. A named `tabindex="0"` scroll region
  keeps overflowing examples accessible to keyboard users.
- `reveal` hides controls from the eye, never from the keyboard: focus brings
  them back, and a pointer that cannot hover never triggers the hiding at all.
- `prefers-reduced-motion: reduce` stops decorative animation, including view
  transitions. A loading spinner keeps turning at a slower 1.4 seconds per
  revolution so ongoing work does not look frozen.

## Elements

Some controls have no HTML element: a combobox, a searchable select, a multi-select, menus, a command
palette, tabs, a data table, a date picker, a tree. BerlinX Elements adds them as
optional custom elements, rendered in the light DOM and drawn from the same
tokens, so your theme reaches them like anything else:

```css
@import "berlinx/elements.min.css";
```

```js
import "berlinx/elements";
```

See [the Elements guide](elements.md) for each one.

## Browser support

| Feature                | Requirement                                    |
| ---------------------- | ---------------------------------------------- |
| Core and native popovers | Chrome/Edge 114+, Firefox 125+, Safari 17+ |
| `:has()`, `:where()`   | Required                                       |
| `color-mix()`, `oklch()` | Required                                     |
| Dark theme, `theme` attribute | `light-dark()`: Chrome/Edge 123+, Firefox 120+, Safari 17.5+. Older engines keep the light theme. |
| RTL select arrow and breadcrumb chevron | `:dir()`: Chrome/Edge 120+. Everything else mirrors through logical properties. |
| Anchored popovers      | Progressive enhancement — guarded by `@supports (position-area: top)`. Without support a popover is centred in the viewport and directional `placement` values do nothing. Edge flipping (`position-try-fallbacks`) is a further enhancement on top. |

Native control appearance can vary by engine.

### Breadcrumb separators

`<nav breadcrumb>` gives `›`. To change it, set `--separator` — it inherits from
the `nav` down to the links that draw it:

```css
nav[breadcrumb] {
  --separator: "/";
}
```

```html
<nav breadcrumb style="--separator: '/'">…</nav>
```

This is a custom property rather than `breadcrumb="/"` on purpose. The separator
is drawn by an `::after` on each `<a>`, so `attr(breadcrumb)` would read the
*link's* attribute, not the nav's — it returns an empty string. The newer
`attr()` syntax that can cross that boundary is not portable yet, and it cannot
be feature-detected either, because `CSS.supports()` reports `true` for any
custom-property value. An inherited custom property works everywhere.

## Development

```sh
npm install
npm run build    # dist/ stylesheets and elements, and the HTML guides
npm test         # element tests in Chromium, Firefox and WebKit
npm run deploy   # build, then publish the demo site to Cloudflare
```

Edit `css/` and `elements/`; `dist/` is generated from them. The stylesheets
are minified with Lightning CSS and `dist/elements/` is bundled with esbuild. The guides are written in `docs/*.md` and rendered to
`guide.html`, `elements.html` and `cheatsheet.html` by the same build.
`index.html` is the demo — open it directly, no server needed.

## License

[MIT](../LICENSE) © Southern Utah Software
