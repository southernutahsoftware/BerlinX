# BerlinX cheatsheet

Every attribute, value and custom property on one page. The [usage guide](guide.md)
explains the reasoning; this is the lookup table.

Rules of thumb: variants are **bare attributes**, never classes. Anything taking
a value uses one of a fixed set — there are no arbitrary values. Base rules are
wrapped in `:where()`, so any CSS of your own wins without `!important`.

## Layout

| Attribute  | Values                            | Effect                                     |
| ---------- | --------------------------------- | ------------------------------------------ |
| `row`      | —                                 | `display: flex`, horizontal                |
| `col`      | —                                 | `display: flex`, vertical                  |
| `grid`     | bare; add `fit`                    | Responsive columns, minimum `--grid-min` (240px) |
| `grow`     | —                                 | Flex child fills/shrinks into remaining space |
| `nowrap`   | —                                 | Keep flex children on one line |
| `gap-xs`   | —                                 | 2px |
| `gap`      | —                                 | 6px (same as `gap-s`)                      |
| `gap-s`    | —                                 | 6px                                        |
| `gap-m`    | —                                 | 12px                                       |
| `gap-l`    | —                                 | 24px                                       |
| `justify`  | `start` `center` `end` `between`  | Along the main axis                        |
| `items`    | `start` `center` `end` `stretch`  | Across the axis                            |
| `full-width` | —                               | `width: 100%`                              |
| `scroll-x` | —                                 | Horizontal scroll container                |
| `scroll-y` | —                                 | Vertical scroll container                  |

```html
<header row justify="between" items="center">…</header>
<div row gap-m justify="end">…</div>
<main col gap-m items="stretch">…</main>
```

Two things worth knowing:

- **`col` packs children to the start.** A header or button row inside one
  shrink-wraps, which leaves its own `justify` nothing to distribute. Add
  `items="stretch"` to the `col` when you want full-width children.
- Headings, paragraphs and sectioning elements **drop their block margins inside
  a `row`** — the flex `gap` already spaces them. Inside a `col`, prose margins
  are left alone.

## Buttons and tags

| Attribute     | Applies to                 | Effect                                        |
| ------------- | -------------------------- | --------------------------------------------- |
| `primary`     | `button` `input` `[tag]`   | Primary fill                                   |
| `secondary`   | ”                          | Secondary fill                                 |
| `outline`     | ”                          | Outlined                                       |
| `ghost`       | ”                          | No fill or border until hover                  |
| `destructive` | ”                          | Danger fill                                    |
| `icon`        | ”                          | Square, icon-only — needs `aria-label`          |
| `tag`         | any element                | Renders as a button; takes every variant above  |
| `badge`       | any inline element         | Badge; combines with `secondary` `outline` `destructive` |

```html
<button>Save</button>
<button secondary>Cancel</button>
<button destructive>Delete</button>
<button icon secondary tooltip="Edit" aria-label="Edit invoice">…</button>
<span tag outline>CSS</span>
<span badge destructive>Overdue</span>
```

A `tag` is interactive when it is an `a`, `button`, `summary` or `label`. A plain
`<span tag>` is inert, so it never pretends to be clickable. A `label tag`
can wrap a native file input; use `visually-hidden` on the input to keep it
keyboard accessible, and its focus ring appears on the label.

## Forms

| Attribute       | Applies to                    | Effect                                  |
| --------------- | ----------------------------- | --------------------------------------- |
| `stack`         | `label`                       | Label above its control, not beside it   |
| `toggle`        | `label`                       | Icon toggle wrapping a checkbox          |
| `role="group"`  | `fieldset`                    | Joined input + button                    |
| `role="switch"` | `input[type=checkbox]`        | Switch                                   |
| `density`       | container or control          | `compact` for toolbars; `comfortable` for 44px text controls/buttons |

```html
<label stack>
  Email
  <input type="email" name="email" required />
</label>

<fieldset role="group">
  <input type="search" name="q" />
  <button type="submit">Search</button>
</fieldset>

<label><input type="checkbox" role="switch" /> Notify me</label>
```

Every `input[type]` is styled directly — `text` `email` `tel` `url` `search`
`password` `number` `date` `time` `color` `file` `range` `checkbox` `radio`
`submit` `reset` `button` — plus `select` and `textarea`. No attribute needed.
Inputs without `type`, plus `datetime-local`, `month` and `week`, are also styled.
Ordinary fieldsets wrap when needed; a joined control group stays on one line.

## Choices, validation and descriptions

| Markup | Effect |
| --- | --- |
| `[field]` | Stack a label, control and descriptions |
| `[hint]` / `[error]` | Muted help / error text; connect with `aria-describedby` |
| `[validation]` | Show a field's error after native interaction or `aria-invalid="true"` |
| `fieldset[segmented]` | Native radio options styled as compact selectable cards |
| `label[choice]` | Radio or checkbox card, highlighted when checked/focused |
| `fieldset[rating]` | Radio star rating; use labelled native inputs |
| `dl`, `dt`, `dd` | Label/value grid; stacks below 600px; `div` pair wrappers supported |
| `meter` | Bounded measurement, height 1rem, distinct from task `progress` |

Keep radio names shared within each group and unique between unrelated groups.
Native keyboard selection and form reset still work. `aria-invalid` is supplied
by your application; CSS cannot set ARIA state. Unsupported `:user-invalid`
engines retain native browser validation and explicit ARIA error styling.

## Lists, navigation and identity

| Markup | Effect |
| --- | --- |
| `ul[list]`, `ol[list]` | Rich rows, icons, descriptions, actions; one anchor can fill a row |
| `[avatar]` | Round image or initials; `small` / bare / `large` |
| `[avatars]` | Overlapping avatar group |
| `[indicator] > [badge]` | Notification count in the corner |
| `[indicator] > [status]` | Status dot; include accessible status text |
| `[empty]` | Centred empty-state heading, explanation and action |
| `ol[steps]` | Connected steps; use `complete` and `aria-current="step"` |
| `ol[timeline]` | Vertical activity list, optionally with native `time` elements |
| `nav[pagination]` | Page links; `aria-current="page"` selects the current one |
| `nav[tabs]` | Underlined navigation links; supplied `aria-current` selects one |
| `[carousel]` | Manual horizontal carousel with scroll snapping |

Use `role="list"` on marker-free `list`, `steps` and `timeline` lists. Avatars
need image alt text or named initials unless equivalent text is already present.
Tab navigation retains link semantics; it is not an interactive ARIA tablist.
Your application supplies pagination, counts and step state. For a gallery,
provide `tabindex="0"`, a region name, and optional fragment links to slide IDs.

## Tables

| Attribute            | Applies to          | Effect                                        |
| -------------------- | ------------------- | --------------------------------------------- |
| `responsive`         | wrapper, or `table` | Own horizontal scrollbar                       |
| `responsive="stack"` | `table`             | Under 600px each row becomes a card            |
| `data-label="…"`     | `td`                | Printed beside the value in stacked mode       |
| `reveal`             | `tr` `li`, any container | Hides buttons and toggles inside until hover or focus; plain links stay |

```html
<table responsive="stack">
  <thead>
    <tr><th scope="col">Name</th><th scope="col">Email</th></tr>
  </thead>
  <tbody>
    <tr reveal>
      <th scope="row">Ada Lovelace</th>
      <td data-label="Email">ada@example.com</td>
    </tr>
  </tbody>
</table>
```

Prefer the wrapper form `<div responsive><table>…</table></div>`: on the table
itself the attribute has to switch the table's own `display`, which shrink-wraps
the columns and drops the table role. A cell with no `data-label` prints only its
content — right for a `<th scope="row">` and for an actions cell.

## Overlays

| Attribute   | Applies to  | Values                                             |
| ----------- | ----------- | -------------------------------------------------- |
| `drawer`    | `dialog`    | bare (bottom) · `top` · `left` · `right`            |
| `toast`     | `dialog`    | —                                                  |
| `placement` | `[popover]` | `top` `bottom` · `top-start` `top-end` `bottom-start` `bottom-end` · `center` |

```html
<dialog id="editDialog">…</dialog>          <!-- modal -->
<dialog drawer="right">…</dialog>           <!-- edge drawer -->

<button popovertarget="menu" icon aria-label="Account">…</button>
<div popover id="menu" placement="bottom-end" col gap>…</div>
```

`row`/`col` are safe on a `dialog` or `popover` — BerlinX restates the "hidden
while closed" rule so a bare `display: flex` cannot leave the thing on screen.
Anchored placement is progressive enhancement: without CSS anchor positioning a
popover centres in the viewport and directional `placement` values do nothing.
`placement="center"` always centres it; use this when opening without an invoker.

## State and feedback

| Attribute           | Effect                                                    |
| ------------------- | --------------------------------------------------------- |
| `loading`           | Spinner, replacing any icon — pair with `aria-busy="true"` |
| `aria-busy="true"`  | The ARIA state itself (not a styling hook)                 |
| `skeleton`          | Shimmering placeholder                                     |
| `notice`            | Feedback panel; `success` / `warning` / `error` add a coloured edge. Add `role="alert"` / `role="status"` as appropriate |
| `tooltip="…"`       | Hover/focus label — **visual only**, keep the `aria-label` |
| `disabled`          | Native, styled                                             |
| `open`              | Native on `dialog`/`details`, styled                       |

`tooltip` never reaches assistive tech, which is why `aria-label` beside it is
not optional. Inside a `responsive` scroll container a tooltip can be clipped —
use `title` there instead.

## Themes

| Attribute       | Applies to             | Effect                                          |
| --------------- | ---------------------- | ----------------------------------------------- |
| *(none)*        | —                      | Light or dark, following the system setting     |
| `theme="light"` | `html`, any container  | Always light; on a container, a light region    |
| `theme="dark"`  | `html`, any container  | Always dark; on a container, a dark region      |

```html
<html theme="dark">                     <!-- the whole page -->
<aside theme="dark">…</aside>           <!-- one region -->
```

Colour tokens hold both values: `--background: light-dark(#fff, #09090b)`.
Override them the same way. Print is always light.

## Text

| Attribute    | Applies to    | Effect                              |
| ------------ | ------------- | ----------------------------------- |
| `xl`         | `h1`–`h6`     | Larger heading step                  |
| `subheader`  | any           | Muted lede directly after a heading  |
| `primary`    | text elements | Primary colour                       |
| `accent`     | text elements | Accent colour                        |
| `muted`      | text elements | Muted colour                         |
| `breadcrumb` | `nav`         | `›` separators; set `--separator`     |
| `vertical`   | `hr`          | Vertical rule                        |
| `ellipsis`   | text          | Single-line truncation in constrained space |
| `tabular`    | text          | Equal-width digits |
| `visually-hidden` | any      | Off-screen presentation with keyboard and screen-reader access |

```html
<h1 xl>Client<span primary>Book</span></h1>
<p subheader>Issued 2026-08-11</p>
<nav breadcrumb><a href="/">Home</a><a href="/clients">Clients</a></nav>
```

## Elements that are already components

No attribute required.

| Element                             | Renders as                    |
| ----------------------------------- | ----------------------------- |
| `article`                           | Card                          |
| `aside`                             | Sidebar panel                 |
| `aside > nav`                       | Sidebar's scrolling link list |
| `details` / `summary`               | Accordion                     |
| `dialog`                            | Modal                         |
| `fieldset role="group"`             | Joined input + button         |
| `kbd`                               | Keycap                        |
| `menu > li > button`                | Menubar                       |
| `nav`                               | Nav bar                       |
| `table`                             | Data table                    |
| `input[type=checkbox][role=switch]` | Switch                        |

`aside` and `menu` are claimed by components — use `blockquote` for pull quotes
and `ul` for plain lists.

## Elements

Optional custom elements: `berlinx/elements.min.css` and
`import "berlinx/elements"`. Details in the [Elements guide](elements.md).

| Markup | Effect |
| --- | --- |
| `<bx-combobox>` around `<input list>` + `<datalist>` | Filtering listbox; `strict` rejects other values; `.options` or `.load(query, { signal })` from script, or `src` for a URL |
| `<bx-select>` around `<select>` | Searchable single choice that submits the value and shows the label; `placeholder`; `src` or `.load(query, { signal })` for a server |
| `<bx-multi-select>` around `<select multiple>` | Chips and a filtering checkbox list; `placeholder` |
| `<bx-command>` around a `<dialog>` of links and buttons | Command palette on <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>K</kbd>; `shortcut`, `show()` |
| `<bx-tabs>` around `nav[tabs]` + panels | Tabs; `selected="panel-id"`; `change` event |
| `<bx-dropdown>` around a button + `[popover]` | Menu with arrow keys and type-ahead; `placement` on the popover |
| `<bx-context-menu>` around content + `[popover]` | The same menu on right-click or <kbd>Shift</kbd>+<kbd>F10</kbd> |
| `<bx-data-table>` around a `<table>` | `sortable` (`th[nosort]`, `td[data-value]`), `filter`, `page-size`, `selectable`; `src` or `.load(request)` to sort, filter and page on a server |
| `<bx-date-picker>` around `<input type="date">` | Calendar; two inputs make a range; `placeholder`, `week-start`; `min`/`max` on the input |
| `<bx-tree>` around nested `<ul>`, `<details>` | Tree with arrow keys; a clicked button becomes `aria-current` |
| `<bx-sidebar>` around `<aside>` | Collapses to icons, a drawer on phones; `collapsed`, `persist`, `shortcut`; `--sidebar-width` |
| `import "berlinx/elements/tooltips"` | `[tooltip]` in the top layer, read by screen readers |
| `toast(message \| { message, title, variant, duration, action })` | Stacked, self-dismissing messages |
| `await confirm(message \| { title, message, confirm, cancel, destructive })` | `true` or `false` |
| `setLabels({ … })` | Translate the words the elements add |

Menus and listboxes are styled by role, so `[popover][role="menu"]` with
`role="menuitem"` buttons looks the same without the elements.

## Theming tokens

Every one is a custom property on `:root`. Override the ones you want; the rest
follow.

**Surfaces and text**

| Token | Token |
| ----- | ----- |
| `--background` | `--foreground` |
| `--card` | `--card-foreground` |
| `--popover` | `--popover-foreground` |
| `--sidebar` | `--sidebar-foreground` |
| `--muted` | `--muted-foreground` |
| — | `--header-foreground` |

**Roles**

| Fill | Foreground | Hover/active | Text in this colour |
| ---- | ---------- | ------------ | ------------------- |
| `--primary` | `--primary-foreground` | `--primary-variant` | `--primary-text` |
| `--secondary` | `--secondary-foreground` | `--secondary-variant` | — |
| `--destructive` | `--destructive-foreground` | `--destructive-variant` | `--destructive-text` |
| `--accent` | `--accent-foreground` | — | `--accent-text` |
| `--success` | — | — | — |
| `--warning` | — | — | — |

Fills keep one value in both themes; the `*-text` tokens are what links, `[error]`
messages and `[accent]` text use, because a fill and text in the same colour
cannot both reach 4.5:1 on a dark page. `--primary-text` and `--destructive-text`
follow their fills automatically. `--accent` is a **fill**: `#ffbf00` as text
is 1.65:1. `--success` and `--warning` colour notice edges and meter levels.

**Lines, shape and space**

| Token | Default |
| ----- | ------- |
| `--border-color` | the line colour |
| `--border` | `1px solid var(--border-color)` — the whole shorthand |
| `--input` | text field background; `#fff` light, `#09090b` dark |
| `--ring` | focus ring colour |
| `--shadow` | the elevation shadow |
| `--radius` | `8px` |
| `--radius-pill` | `9999px` |
| `--space-xs` | `2px` |
| `--space-s` | `6px` |
| `--space-m` | `12px` |
| `--space-l` | `24px` |
| `--font-sans` | Inter, then the system stack |
| `--font-mono` | ui-monospace, SF Mono, Menlo, Consolas… |
| `--content-width` | `1000px`; use `none` for an app shell |
| `--page-padding` | Optional override; otherwise 24px, or 16px under 600px |
| `--line-height` | `1.65`; body leading |
| `--grid-min` | `240px`; grid column minimum |
| `--control-font-size` | `0.875rem` |
| `--control-line-height` | `1.5rem` |
| `--control-padding-block` | `var(--space-s)` |
| `--control-padding-inline` | `var(--space-m)` |
| `--button-padding-inline` | `var(--space-l)` |
| `--control-min-height` | `2.5rem`; `0px` in compact, `44px` in comfortable density |
| `--avatar-size` | Optional; defaults to 2.5rem (small 1.75rem, large 3.5rem) |
| `--indicator-color` | Optional; defaults to `var(--primary)` |
| `--slide-size` | Optional; defaults to `85%` |

```css
:root {
  --primary: #7c3aed;
  --radius: 4px;
}
```

**Per-element button theming** — these are scoped, so one button can differ
without touching the roles above:

```css
.brand-button {
  --button-bg: rebeccapurple;
  --button-fg: white;
  --button-bg-hover: #5b2d91;
  --button-bg-active: #4a2475;
  --button-border: transparent;
}
```

## Gotchas

- **`icon` without `aria-label`** is an unlabelled button. `tooltip` does not
  count — it is drawn in CSS and assistive tech never sees it.
- **`justify` on a `col` does nothing visible** until the children stretch — add
  `items="stretch"`.
- **`responsive="stack"` needs `data-label` on every `td`** you want labelled;
  there is no way for CSS to read a cell's `<th>`.
- **`loading` is the spinner, `aria-busy="true"` is the meaning.** Set both.
  Add `disabled` to busy native buttons to block keyboard activation too.
  Reduced motion slows the spinner to 1.4s per revolution; decorative animations stop.
- **The W3C validator rejects bare attributes** (`Attribute row not allowed on
  element div`). Browsers have matched arbitrary attributes since CSS2 and handle
  them correctly, but CI that gates on HTML validation will complain.
- **Style a `select` with `background-color`, not `background`.** The arrow is a
  background image, so the shorthand removes it along with the native one.
- **Overriding a surface colour with a plain value** (`--background: #fffdf8`)
  applies it in dark mode too. Use `light-dark(light, dark)`, or add
  `theme="light"` to `<html>` if your design is light-only.
- **Requires** Chrome/Edge 114+, Firefox 125+, Safari 17+ — native popovers, `:has()`,
  `:where()`, `color-mix()` and `oklch()` are all load-bearing. The dark theme
  needs `light-dark()` (Chrome/Edge 123+, Safari 17.5+); older engines stay light.
