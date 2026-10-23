# BerlinX Elements

Optional custom elements for the controls HTML has no element for: comboboxes,
searchable selects and multi-selects, menus, a command palette, tabs, a data
table, a date picker, a tree, a collapsible sidebar, tooltips, toasts and a
confirm dialog. BerlinX itself stays a stylesheet; Elements is a separate import
that you add only if you want it.

```html
<bx-data-table sortable filter page-size="10">
  <table>…</table>
</bx-data-table>
```

Three rules hold for every element:

- **Light DOM.** No shadow root. Everything an element shows is ordinary markup
  on your page, drawn by a BerlinX stylesheet with the same tokens as the rest.
  Your CSS, your theme and `density` reach inside without `::part()` or extra
  variables.
- **Your markup first.** Each element wraps native HTML — an `<input list>`, a
  `<select>`, a `popover`, a `<table>`, an `<input type="date">`,
  `<details>` — and only adds behaviour. Before the script loads, or without
  JavaScript, that HTML still works the native way.
- **Forms stay native.** Values live in the real inputs you wrote, so `name`,
  `required`, `FormData`, reset and validation work as they always did.

## Install

Add the Elements stylesheet after BerlinX's own, and the script:

```sh
npm install berlinx
```

```css
@import "berlinx/min";
@import "berlinx/elements.min.css";
```

```js
import "berlinx/elements";                 // every element and helper
import "berlinx/elements/data-table";      // or only the ones you use
import { toast, confirm, setLabels } from "berlinx/elements";
```

From a CDN:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/berlinx@1.2.0/dist/berlinx.min.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/berlinx@1.2.0/dist/berlinx-elements.min.css" />
<script type="module" src="https://cdn.jsdelivr.net/npm/berlinx@1.2.0/dist/elements/index.js"></script>
```

The stylesheet is about 3.5 KB gzipped. The scripts share the 4 KB
[Atomico](https://atomicojs.dev) runtime: one element with it is 5–10 KB, all of
them 24 KB, and `toast()`, `confirm()` and tooltips, which do not need it, 1–3 KB
each. Importing an element defines it; importing it twice is harmless.
TypeScript declarations are included.

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
| `load` | A function that fetches options for what was typed. See below |
| `src` | A URL fetched with `?q=` and what was typed, answering a JSON array of options. The same as `load`, without script |

To search a server, set `src="/api/cities"`, or `load` for any other request.
`load` is called a moment after typing pauses, with the text and an
`AbortSignal` that fires if the person types again before it answers. Its
options are shown as they arrive, without further filtering, "Loading…" shows
while it works, and a failed request says so:

```js
document.querySelector("#city").load = (query, { signal }) =>
  fetch(`/api/cities?q=${encodeURIComponent(query)}`, { signal }).then(response => response.json());
```

Keys: <kbd>↓</kbd> <kbd>↑</kbd> move through the list, <kbd>Enter</kbd> chooses,
<kbd>Esc</kbd> closes it, <kbd>Alt</kbd>+<kbd>↓</kbd> opens it without moving.
Choosing fires `input` and `change` on the input, as typing does.

## Select

A single choice you can search, from a list on the page or from a server. Write
a `<select>`; the element hides it, keeps it as the form value, and puts a text
field in its place that shows the chosen option and filters the others as you
type. The form gets the option's value and the person sees its label, so a list
of records can be searched by name and submit an id.

<form col gap-m items="stretch" style="max-width: 24rem">
  <label stack>
    Currency
    <bx-select>
      <select name="currency">
        <option value="">Choose a currency</option>
        <option value="CHF">Swiss franc</option>
        <option value="DKK">Danish krone</option>
        <option value="EUR" selected>Euro</option>
        <option value="GBP">Pound sterling</option>
        <option value="NOK">Norwegian krone</option>
        <option value="SEK">Swedish krona</option>
        <option value="USD">US dollar</option>
      </select>
    </bx-select>
  </label>
  <label stack>
    Client
    <bx-select id="demo-client" placeholder="Search clients">
      <select name="client">
        <option value="">No client</option>
      </select>
    </bx-select>
  </label>
</form>

```html
<label stack>
  Client
  <bx-select src="/api/clients" placeholder="Search clients">
    <select name="client" required>
      <option value="">No client</option>
      <option value="42" selected>Ada Lovelace</option>
    </select>
  </bx-select>
</label>
```

| Attribute or property | Effect |
| --- | --- |
| `placeholder` | Shown when nothing is chosen. Without it, the label of an `<option value="">` |
| `src` | A URL to search. It is fetched with `?q=` and the text typed, and answers a JSON array of options |
| `load` | A function that fetches options for what was typed, as on the [combobox](#combobox) |

Without `src` or `load` the options are the select's own, filtered while
ignoring case and accents. With either, the options are what the server sends
back, `"Oslo"` or `{ "value": "42", "label": "Ada Lovelace" }`, shown without
further filtering. The option chosen is added to the select, so the form has it;
the option written `selected` stays too, so a form reset goes back to it. The
second field above loads from a fake server with a short delay:

```js
document.querySelector("#client").load = (query, { signal }) =>
  fetch(`/api/clients?search=${encodeURIComponent(query)}`, { signal }).then(response => response.json());
```

An `<option value="">` is the placeholder. It is not listed, and clearing the
text and leaving the field chooses it, which a `required` select then rejects.
`disabled` and a disabled `<option>` work as they do on the select. Keys:
<kbd>↓</kbd> <kbd>↑</kbd> open and move through the list, <kbd>Enter</kbd>
chooses, <kbd>Esc</kbd> closes it and puts back the chosen option. A choice
fires `input` and `change` on the select.

## Multi-select

Several choices, shown as chips. Write a `<select multiple>`; the element hides
it, keeps it as the form value, and puts a field in its place that filters a
list of checkboxes as you type.

<form col gap-m items="stretch" style="max-width: 24rem">
  <label stack>
    Labels
    <bx-multi-select placeholder="Add labels">
      <select name="labels" multiple>
        <option value="bug" selected>Bug</option>
        <option value="design">Design</option>
        <option value="docs">Documentation</option>
        <option value="perf">Performance</option>
        <option value="security">Security</option>
      </select>
    </bx-multi-select>
  </label>
</form>

```html
<label stack>
  Labels
  <bx-multi-select placeholder="Add labels">
    <select name="labels" multiple required>
      <option value="bug" selected>Bug</option>
      <option value="design">Design</option>
    </select>
  </bx-multi-select>
</label>
```

`required`, `disabled` and a disabled `<option>` work as they do on the select.
Keys: <kbd>↓</kbd> <kbd>↑</kbd> open and move through the list, <kbd>Enter</kbd>
toggles an option and leaves the list open for the next, <kbd>Backspace</kbd> in
the empty field removes the last chip, <kbd>Esc</kbd> closes the list. Each
change fires `input` and `change` on the select.

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

## Command palette

A searchable list of everything the app can do, opened with <kbd>Ctrl</kbd>+<kbd>K</kbd>
or <kbd>⌘</kbd><kbd>K</kbd>. Write a `<dialog>` of links and buttons, grouped
like a menu; the element adds the search field, filtering and keys. Choosing a
command closes the palette and clicks it, so links navigate and buttons run their
own handlers.

<bx-command id="demo-command">
  <dialog>
    <small>Invoices</small>
    <button data-demo="command-new">New invoice <kbd>N</kbd></button>
    <button data-demo="command-export">Export as CSV</button>
    <small>Go to</small>
    <a href="#combobox">Combobox</a>
    <a href="#data-table">Data table</a>
    <a href="#date-picker">Date picker</a>
  </dialog>
</bx-command>

<button outline data-demo="command">Open the command palette <kbd>Ctrl K</kbd></button>

```html
<bx-command>
  <dialog>
    <small>Invoices</small>
    <a href="/invoices/new">New invoice <kbd>N</kbd></a>
    <button>Export as CSV</button>
    <small>Go to</small>
    <a href="/clients">Clients</a>
  </dialog>
</bx-command>
```

| Attribute or method | Effect |
| --- | --- |
| `shortcut` | The key used with <kbd>Ctrl</kbd> or <kbd>⌘</kbd>. Default `k`; empty for none |
| `show()`, `close()` | Open and close it from script. It is a `<dialog>`, so `showModal()` and `commandfor` work too |

## Tabs

One panel at a time, under a row of tabs. Write a `nav[tabs]` of links to the
panels' ids; the element turns the links into tabs and shows only the chosen
panel. Without JavaScript the links jump to each panel, all of them visible.

<bx-tabs>
  <nav tabs aria-label="Invoice">
    <a href="#demo-overview">Overview</a>
    <a href="#demo-items">Items</a>
    <a href="#demo-history">History</a>
  </nav>
  <section id="demo-overview"><p>Invoice #1024 for Ada Lovelace, due Friday.</p></section>
  <section id="demo-items"><p>Three line items totalling $18,200.</p></section>
  <section id="demo-history"><p>Created Monday; sent Tuesday; viewed today.</p></section>
</bx-tabs>

```html
<bx-tabs>
  <nav tabs aria-label="Invoice">
    <a href="#overview">Overview</a>
    <a href="#items">Items</a>
  </nav>
  <section id="overview">…</section>
  <section id="items">…</section>
</bx-tabs>
```

Tabs can also be buttons with `aria-controls="panel-id"`. The first tab shows
unless the address bar names a panel, a tab carries `aria-current`, or the
element has `selected="panel-id"`. Set `selected` to switch tabs from script; a
`change` event fires when the person switches. Keys: <kbd>←</kbd> <kbd>→</kbd>
move between tabs and show each as they go, <kbd>Home</kbd> and <kbd>End</kbd>
go to the ends, <kbd>Tab</kbd> moves into the panel.

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

### Data from a server

For more rows than a page should hold, give the table a `src`. The server then
sorts, filters and pages; the element asks for each page, writes its rows into
the `<tbody>` and keeps the sort buttons, filter, pager and checkboxes working
as before. Name each column's field with `data-key` on its header:

<bx-data-table id="demo-remote" sortable filter page-size="5" selectable>
  <table>
    <thead>
      <tr><th scope="col" data-key="client">Client</th><th scope="col" data-key="city">City</th><th scope="col" data-key="invoices">Invoices</th><th scope="col" data-key="total">Total</th></tr>
    </thead>
    <tbody></tbody>
  </table>
</bx-data-table>

```html
<bx-data-table src="/api/clients" sortable filter page-size="25" selectable>
  <table>
    <thead>
      <tr><th scope="col" data-key="name">Client</th><th scope="col" data-key="total">Total</th></tr>
    </thead>
    <tbody></tbody>
  </table>
</bx-data-table>
```

The URL is fetched with these parameters, and answers JSON:

```text
GET /api/clients?page=2&size=25&sort=total&order=desc&q=ada

{ "rows": [{ "id": 42, "name": "Ada Lovelace", "total": "$18,200" }], "total": 128 }
```

`size` is sent with `page-size`, `sort` and `order` (`asc` or `desc`) while a
column is sorted, and `q` while the filter has text, a moment after typing
pauses. `total` counts every matching row, for the summary and the pager. An
answer that is just an array of rows is one page with no more.

A row can be an object, read through the headers' `data-key`, an array of cells
in column order, or a `<tr>` you built. The first cell becomes the row's
`<th scope="row">`. A cell value that is a DOM node goes in as it is, anything
else as text, so format numbers and dates on the server or in `load`. A row's
`id` (or a `<tr data-id>`) keeps it selected as pages come and go:
`table.selectedIds()` returns every id selected, on any page, and the
`rowselect` event has them in `event.detail.ids`. The header checkbox selects
the rows on the page shown.

For another URL scheme, headers or a different shape of answer, set `load`
instead. It gets the request and returns `{ rows, total }`, or a promise of it.
The demo above uses one, with a fake server:

```js
const table = document.querySelector("#clients");
table.load = async ({ page, pageSize, sort, order, query, signal }) => {
  const response = await fetch(`/graphql?…`, { signal });
  const { items, count } = await response.json();
  return { rows: items.map(c => ({ id: c.id, name: c.name, total: money.format(c.total) })), total: count };
};
```

`sort` is the column's `data-key`, or its index when it has none. A request
still on its way is cancelled through `signal` when a newer one starts. While
one loads the table carries `aria-busy` and its rows fade; if it fails the
summary says so and the rows shown stay. `table.reload()` asks for the current
page again, after a change on the server.

## Date picker

A button that shows the date in the reader's language and opens a calendar.
The `<input type="date">` inside stays in the form, hidden, holding the value.
Two inputs make a range: the first pick is one end, the second the other.

<form col gap-m items="stretch" style="max-width: 24rem">
  <label stack>
    Due date
    <bx-date-picker>
      <input type="date" name="due" value="2026-10-22" />
    </bx-date-picker>
  </label>
  <label stack>
    Stay
    <bx-date-picker>
      <input type="date" name="from" aria-label="Check in" value="2026-10-12" />
      <input type="date" name="to" aria-label="Check out" value="2026-10-15" />
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

<label stack>
  Stay
  <bx-date-picker>
    <input type="date" name="from" aria-label="Check in" />
    <input type="date" name="to" aria-label="Check out" />
  </bx-date-picker>
</label>
```

| Attribute | Effect |
| --- | --- |
| `min`, `max`, `required`, `value` | On the inputs, as always. Days outside `min`–`max` are disabled; a required date has no Clear button |
| `placeholder` | Shown while there is no date. Default "Pick a date" |
| `week-start` | `0` (Sunday) to `6`. By default the week starts where the page's `lang` says it does |

A range is written to the form only once both ends are picked, earlier date
first; closing the calendar halfway leaves the old range. Keys in the calendar:
arrows move a day or a week, <kbd>Home</kbd> and <kbd>End</kbd> go to the start
and end of the week, <kbd>PgUp</kbd> <kbd>PgDn</kbd> change the month and, with
<kbd>Shift</kbd>, the year. <kbd>Enter</kbd> picks and <kbd>Esc</kbd> closes.

The button is named from the label around the element, or for a single date the
input's own label. A required date that is empty when the form is submitted
marks the button `aria-invalid`.

## Tree

Folders and items, such as files or nested navigation. Folders are `<details>`,
so they open and close without JavaScript and the stylesheet draws the tree
either way. The element makes the whole tree one stop in the tab order, moved
through with the arrow keys.

<bx-tree aria-label="Files" style="max-width: 18rem">
  <ul>
    <li>
      <details open>
        <summary>src</summary>
        <ul>
          <li><button>index.js</button></li>
          <li>
            <details>
              <summary>components</summary>
              <ul>
                <li><button>button.js</button></li>
                <li><button>dialog.js</button></li>
              </ul>
            </details>
          </li>
          <li><button>styles.css</button></li>
        </ul>
      </details>
    </li>
    <li><button>README.md</button></li>
  </ul>
</bx-tree>

```html
<bx-tree aria-label="Files">
  <ul>
    <li>
      <details open>
        <summary>src</summary>
        <ul>
          <li><a href="/src/index.js">index.js</a></li>
        </ul>
      </details>
    </li>
    <li><button>README.md</button></li>
  </ul>
</bx-tree>
```

Items are links or buttons. A clicked button becomes `aria-current="true"`, the
current item; set `aria-current="page"` on a link yourself. Keys: <kbd>↓</kbd>
<kbd>↑</kbd> move, <kbd>→</kbd> opens a folder or goes into it, <kbd>←</kbd>
closes it or goes up to its parent, <kbd>Home</kbd> and <kbd>End</kbd> go to the
ends, typing jumps to an item, and <kbd>Enter</kbd> or <kbd>Space</kbd> act as a
click does.

## Sidebar

BerlinX's `<aside>`, collapsible to a rail of icons. A button on its edge
collapses and expands it; collapsed, each link shows its name as a tooltip. Give
every link in its `<nav>` a leading icon.

At 600px wide and below the sidebar leaves the layout and a menu button takes
its place, opening it as a drawer from the start edge. Tapping outside,
<kbd>Esc</kbd> or choosing a link closes the drawer and returns focus to the
button.

```html
<bx-sidebar persist="app">
  <aside>
    <header>Acme</header>
    <nav aria-label="Main">
      <a href="/inbox" aria-current="page"><svg …></svg> Inbox</a>
      <a href="/clients"><svg …></svg> Clients</a>
    </nav>
  </aside>
</bx-sidebar>
```

| Attribute | Effect |
| --- | --- |
| `collapsed` | Set it, or read it, to collapse the sidebar. A `toggle` event fires when the person collapses or expands it |
| `persist="name"` | Remember the choice in this browser, under that name |
| `shortcut` | A key used with <kbd>Ctrl</kbd> or <kbd>⌘</kbd> to toggle it, such as `b`; on a phone it opens the drawer |

`--sidebar-width` (16rem) and `--sidebar-icon` (1.25rem) size it. Without
JavaScript it is an ordinary `<aside>`, always open.

## Tooltips

BerlinX's `tooltip="…"` attribute, made accessible. Import it and nothing in your
markup changes:

```js
import "berlinx/elements/tooltips";       // included in berlinx/elements
```

<div row gap scroll-x style="padding-block: var(--space-l)">
  <button icon outline tooltip="Archive this invoice" aria-label="Archive"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4" /></svg></button>
  <button icon outline tooltip="Delete" aria-label="Delete"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg></button>
</div>

The stylesheet's tooltip is seen on hover and focus, but never read out and
clipped inside a scrolling container. With the script it is one shared popover
in the top layer, so nothing clips it; it describes its control to screen readers
(unless it only repeats the control's name), stays while the pointer moves onto
it, and <kbd>Esc</kbd> dismisses it.

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
| `confirm`, `cancel` | Button text. Defaults come from the labels: "Confirm" and "Cancel" |
| `destructive` | A red confirm button, and focus starts on Cancel so <kbd>Enter</kbd> cannot destroy anything by accident |

## Labels and languages

Dates and numbers follow the page's `lang`. The words the elements add — button
names, "No results", "Page 2" — are English until you change them, all at once:

```js
import { setLabels } from "berlinx/elements";

setLabels({
  noResults: "Aucun résultat",
  previousMonth: "Mois précédent",
  nextMonth: "Mois suivant",
  page: n => `Page ${n}`,
  selectRow: name => `Sélectionner ${name}`,
});
```

Elements already on the page update to match. Entries that take a value are
functions; `labels` holds the current set, and the TypeScript `Labels` type lists
every entry.

## Frameworks

The elements are standard custom elements, so they work in plain HTML and in
any framework that renders HTML. A few notes:

- **Attributes in markup, properties in script.** `page-size="10"` in HTML is
  `pageSize = 10` in script. Values such as a combobox's `options` and `load` are
  properties.
- **Events are DOM events.** Listen for `change` on the inputs inside, `rowselect`
  on a data table and `change` on tabs, with `addEventListener` or your
  framework's own syntax (React 19: `onrowselect`).
- **Re-rendering is fine.** A data table picks up rows your framework adds or
  removes. Keep the wrapped input or table the same element across renders, as
  frameworks do by default.
- **Import in the browser.** The elements define themselves on import, so in a
  framework that also renders on a server, import them from client-only code.

## Browser support

The elements need what BerlinX needs — Chrome and Edge 114, Firefox 125,
Safari 17 — and nothing more. Menus, listboxes, calendars and tooltips are placed
by script, so they line up with their controls in every engine, whether or not it
supports CSS anchor positioning.
