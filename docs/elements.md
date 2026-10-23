# BerlinX Elements

Optional custom elements for the controls HTML has no element for: a combobox,
dropdown and context menus, a data table, a date picker, toasts and a confirm
dialog. BerlinX itself stays a stylesheet; Elements is a separate import that you
add only if you want it.

```html
<bx-data-table sortable filter page-size="10">
  <table>…</table>
</bx-data-table>
```

Three rules hold for every element:

- **Light DOM.** No shadow root. Everything an element shows is ordinary markup
  on your page, styled by `berlinx.css` with the same tokens as the rest. Your
  CSS, your theme and `density` reach inside without `::part()` or extra
  variables.
- **Your markup first.** Each element wraps native HTML — an `<input list>`, a
  `popover`, a `<table>`, an `<input type="date">` — and only adds behaviour.
  Before the script loads, or without JavaScript, that HTML still works the
  native way.
- **Forms stay native.** Values live in the real inputs you wrote, so `name`,
  `required`, `FormData`, reset and validation work as they always did.

## Install

The elements' styles are already in `berlinx.css`. Add the script beside it:

```sh
npm install berlinx
```

```js
import "berlinx/elements";                 // every element and helper
import "berlinx/elements/data-table";      // or only the ones you use
import { toast, confirm } from "berlinx/elements";
```

From a CDN, as an ES module:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/berlinx@1.0.0/dist/berlinx.min.css" />
<script type="module" src="https://cdn.jsdelivr.net/npm/berlinx@1.0.0/dist/elements/index.js"></script>
```

Everything together is about 12 KB gzipped, including the
[Atomico](https://atomicojs.dev) runtime the elements share. Importing an
element defines it; importing it twice is harmless. TypeScript declarations are
included.

## Combobox

A text input that suggests options as you type. Write an `<input list>` and its
`<datalist>`; the element turns the browser's suggestions into a styled listbox
that filters while ignoring case and accents.

<form col gap-m items="stretch" style="max-width: 24rem">
  <label stack>
    Country
    <bx-combobox strict>
      <input name="country" list="demo-countries" placeholder="Start typing…" />
      <datalist id="demo-countries">
        <option value="Austria"></option>
        <option value="Belgium"></option>
        <option value="Côte d'Ivoire"></option>
        <option value="Denmark"></option>
        <option value="Germany"></option>
        <option value="Netherlands"></option>
        <option value="Switzerland"></option>
      </datalist>
    </bx-combobox>
  </label>
</form>

```html
<label stack>
  Country
  <bx-combobox strict>
    <input name="country" list="countries" />
    <datalist id="countries">
      <option value="Austria"></option>
      <option value="Belgium"></option>
    </datalist>
  </bx-combobox>
</label>
```

| Attribute or property | Effect |
| --- | --- |
| `strict` | A value that is not an option is invalid. Give it a value to set the message: `strict="Pick a country"` |
| `options` | Options from script instead of a datalist: `["Oslo", { value: "BER", label: "Berlin" }]` |

Keys: <kbd>↓</kbd> <kbd>↑</kbd> move through the list, <kbd>Enter</kbd> chooses,
<kbd>Esc</kbd> closes it, <kbd>Alt</kbd>+<kbd>↓</kbd> opens it without moving.
Choosing fires `input` and `change` on the input, as typing does.

## Dropdown menu

A button that opens a menu of actions. It is a native popover, so it opens
without JavaScript; the element adds menu semantics, arrow keys, type-ahead and
placement under the button.

<bx-dropdown>
  <button outline popovertarget="demo-actions">Actions</button>
  <div popover id="demo-actions">
    <small>Invoice</small>
    <button>Edit</button>
    <button>Duplicate <kbd>⌘D</kbd></button>
    <button disabled>Archive</button>
    <hr />
    <button destructive>Delete</button>
  </div>
</bx-dropdown>

```html
<bx-dropdown>
  <button popovertarget="actions">Actions</button>
  <div popover id="actions" placement="bottom-end">
    <small>Invoice</small>
    <button>Edit</button>
    <button>Duplicate <kbd>⌘D</kbd></button>
    <hr />
    <a href="/invoices/1024.pdf">Download</a>
    <button destructive>Delete</button>
  </div>
</bx-dropdown>
```

Items are the `<button>`s and links in the popover. `<small>` labels a group,
`<hr>` separates groups, `destructive` colours an item, and a trailing `<kbd>`
shows its shortcut. `placement` takes `bottom-start` (the default),
`bottom-end`, `top-start` or `top-end`; near an edge the menu flips to fit.

Keys: <kbd>↓</kbd> <kbd>↑</kbd> on the button open the menu at the first or last
item. In the menu <kbd>↓</kbd> <kbd>↑</kbd> <kbd>Home</kbd> <kbd>End</kbd> move,
typing jumps to an item, <kbd>Esc</kbd> closes and returns focus to the button,
<kbd>Tab</kbd> closes and moves on.

## Context menu

The same menu, opened where the content is right-clicked, or from the keyboard
with the context-menu key or <kbd>Shift</kbd>+<kbd>F10</kbd>. Everything in the
element except the popover is the area it listens on.

<bx-context-menu>
  <article tabindex="0">Right-click this card.</article>
  <div popover>
    <button>Rename</button>
    <button>Share</button>
    <hr />
    <button destructive>Delete</button>
  </div>
</bx-context-menu>

```html
<bx-context-menu>
  <article tabindex="0">Right-click this card.</article>
  <div popover>
    <button>Rename</button>
    <button destructive>Delete</button>
  </div>
</bx-context-menu>
```

Give the area `tabindex="0"` (or put focusable content in it) so keyboard users
can reach it. iOS Safari never fires a context-menu event, so offer the same
actions somewhere else too — a dropdown in the card's header works well.

## Data table

Sorting, filtering, paging and row selection for a table you already have. Each
feature is an attribute; the table itself is the one you wrote.

<bx-data-table sortable filter page-size="4" selectable>
  <table>
    <thead>
      <tr><th scope="col">Client</th><th scope="col">Invoices</th><th scope="col">Total</th><th scope="col" nosort>Status</th></tr>
    </thead>
    <tbody>
      <tr><th scope="row">Ada Lovelace</th><td>12</td><td data-value="18200">$18,200</td><td><span badge>Active</span></td></tr>
      <tr><th scope="row">Grace Hopper</th><td>4</td><td data-value="3150">$3,150</td><td><span badge secondary>Paused</span></td></tr>
      <tr><th scope="row">Émile Baudot</th><td>9</td><td data-value="7400">$7,400</td><td><span badge>Active</span></td></tr>
      <tr><th scope="row">Linus Torvalds</th><td>21</td><td data-value="40900">$40,900</td><td><span badge>Active</span></td></tr>
      <tr><th scope="row">Barbara Liskov</th><td>2</td><td data-value="950">$950</td><td><span badge destructive>Overdue</span></td></tr>
      <tr><th scope="row">Alan Turing</th><td>7</td><td data-value="6100">$6,100</td><td><span badge>Active</span></td></tr>
    </tbody>
  </table>
</bx-data-table>

```html
<bx-data-table sortable filter page-size="10" selectable>
  <table>
    <thead>
      <tr><th scope="col">Client</th><th scope="col">Total</th><th scope="col" nosort>Status</th></tr>
    </thead>
    <tbody>
      <tr><th scope="row">Ada Lovelace</th><td data-value="18200">$18,200</td><td>Active</td></tr>
    </tbody>
  </table>
</bx-data-table>
```

| Attribute | Effect |
| --- | --- |
| `sortable` | Header buttons sort by their column: ascending, descending, then back to the order written. `<th nosort>` opts a column out |
| `data-value` | On a cell: sort by this instead of the text, for dates and formatted numbers |
| `filter` | A search box that hides rows not containing its text. Its value, if any, is the placeholder and label |
| `page-size="10"` | Pages of that many rows, with a summary and page buttons |
| `selectable` | A checkbox on each row; the header box selects every row the filter leaves |

Selected rows carry the `selected` attribute. `table.selectedRows()` returns
them, and a `rowselect` event fires whenever they change, with the rows in
`event.detail.rows`. Numbers such as `$1,200` and `12%` sort as numbers; other
text sorts in the page's language.

The element orders and hides the rows of the first `<tbody>` (it manages their
`hidden` attribute). Rows your app adds or removes are picked up, so re-render
the table's rows however you like. A wrapping `<div responsive>` and
`responsive="stack"` work as they do on any table.

## Date picker

A button that shows the date in the reader's language and opens a calendar.
The `<input type="date">` inside stays in the form, hidden, holding the value.

<form col gap-m items="stretch" style="max-width: 24rem">
  <label stack>
    Due date
    <bx-date-picker>
      <input type="date" name="due" value="2026-10-22" />
    </bx-date-picker>
  </label>
</form>

```html
<label stack>
  Due date
  <bx-date-picker placeholder="Pick a date">
    <input type="date" name="due" min="2026-01-01" required />
  </bx-date-picker>
</label>
```

| Attribute | Effect |
| --- | --- |
| `min`, `max`, `required`, `value` | On the input, as always. Days outside `min`–`max` are disabled; a required date has no Clear button |
| `placeholder` | Shown while there is no date. Default "Pick a date" |
| `week-start` | `0` (Sunday) to `6`. By default the week starts where the page's `lang` says it does |

Keys in the calendar: arrows move a day or a week, <kbd>Home</kbd> and
<kbd>End</kbd> go to the start and end of the week, <kbd>PgUp</kbd>
<kbd>PgDn</kbd> change the month and, with <kbd>Shift</kbd>, the year.
<kbd>Enter</kbd> chooses and <kbd>Esc</kbd> closes.

The button is named from the input's label, so put the element inside the
`<label>` or give the input an `aria-label`. A required date that is empty when
the form is submitted marks the button `aria-invalid`.

## Toasts

Short messages that stack in the corner. Up to three show at once and the rest
wait their turn. Each dismisses itself after five seconds, pausing while the
pointer or focus is on it.

<div row gap>
  <button data-demo="toast">Show a toast</button>
  <button secondary data-demo="toast-undo">With an action</button>
  <button outline data-demo="toast-error">Error</button>
</div>

```js
import { toast } from "berlinx/elements";

toast("Invoice sent");
toast({ title: "Payment failed", message: "The card was declined.", variant: "error" });
toast({ message: "Client archived", action: { label: "Undo", onClick: restore } });

const saving = toast({ message: "Saving…", duration: 0 });
saving.dismiss();
```

| Option | Effect |
| --- | --- |
| `message`, `title` | The text, and an optional heading above it |
| `variant` | `success`, `warning` or `error`: the same coloured edge as `[notice]` |
| `duration` | Milliseconds on screen. Default 5000; `0` keeps it until dismissed |
| `action` | `{ label, onClick }` for a button beside the message |

Toasts are announced politely; errors are announced as alerts. While a modal
dialog is open they appear inside it, so they can still be read and clicked.

## Confirm dialog

Ask a yes-or-no question in a BerlinX dialog and wait for the answer. It
resolves `true` for the confirm button, and `false` for Cancel or <kbd>Esc</kbd>.

<div row gap>
  <button data-demo="confirm">Send invoice</button>
  <button destructive data-demo="confirm-delete">Delete invoice</button>
</div>

```js
import { confirm } from "berlinx/elements";

if (await confirm("Discard your changes?")) discard();

const remove = await confirm({
  title: "Delete invoice #1024?",
  message: "This cannot be undone.",
  confirm: "Delete",
  destructive: true,
});
```

| Option | Effect |
| --- | --- |
| `title`, `message` | The heading and the question |
| `confirm`, `cancel` | Button text. Default "Confirm" and "Cancel" |
| `destructive` | A red confirm button, and focus starts on Cancel so <kbd>Enter</kbd> cannot destroy anything by accident |

## Frameworks

The elements are standard custom elements, so they work in plain HTML and in
any framework that renders HTML. A few notes:

- **Attributes in markup, properties in script.** `page-size="10"` in HTML is
  `pageSize = 10` in script. Complex values such as a combobox's `options` are
  properties.
- **Events are DOM events.** Listen for `change` on the inputs inside, and for
  `rowselect` on a data table, with `addEventListener` or your framework's own
  syntax (React 19: `onrowselect`).
- **Re-rendering is fine.** A data table picks up rows your framework adds or
  removes. Keep the wrapped input or table the same element across renders, as
  frameworks do by default.

## Browser support

The elements need what BerlinX needs — Chrome and Edge 114, Firefox 125,
Safari 17 — and nothing more. Menus, listboxes and calendars are placed by
script, so they line up under their controls in every engine, whether or not it
supports CSS anchor positioning.
