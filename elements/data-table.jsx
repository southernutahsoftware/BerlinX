// <bx-data-table>: sorting, filtering, paging and row selection for a table.
//
//   <bx-data-table sortable filter page-size="10" selectable>
//     <table>
//       <thead><tr><th scope="col">Name</th><th scope="col">Total</th></tr></thead>
//       <tbody>
//         <tr><th scope="row">Ada</th><td data-value="1200">$1,200</td></tr>
//       </tbody>
//     </table>
//   </bx-data-table>
//
// Without JavaScript this is the table as written. Each feature is an attribute:
//
//   sortable        header buttons sort by a column; <th nosort> opts one out.
//                   A cell's data-value, when present, is sorted on instead of
//                   its text, so dates and formatted numbers sort correctly.
//   filter          a search box that hides rows not containing the text; its
//                   value, if any, is the placeholder and label.
//   page-size="10"  pages of that many rows.
//   selectable      a checkbox per row. Selected rows carry [selected]; the
//                   element's selectedRows lists them and a "rowselect" event
//                   fires when they change.
//
// The element orders and hides the rows of the first <tbody>; rows the page adds
// or removes later are picked up.
//
// Rows can come from a server instead, which then sorts, filters and pages:
//
//   src="/api/clients"  fetched with ?page=&size=&sort=&order=&q= and answering
//                       { rows, total } (or just an array of rows).
//   table.load = ({ page, pageSize, sort, order, query, signal }) => …
//                       the same, written by hand; it returns or resolves to
//                       { rows, total } or an array.
//
// sort is the column's <th data-key>, or its index without one. A row is an
// object read through the headers' data-key, an array of cells in column order,
// or a <tr>; the first cell is the row's <th scope="row">. A cell that is a
// Node is put in as it is; anything else is text. A row object's id, or a
// <tr data-id>, keeps the row selected across loads.

import { c, useEffect, useHost, useId, useRef, useUpdate } from "atomico";
import { labels } from "./labels.js";
import { useLabels } from "./use-labels.js";
import { fold, getJSON, langOf } from "./shared.js";

const DELAY = 300;

// "$1,200.50", "-3", "12%" sort as numbers; anything else sorts as text.
function toNumber(text) {
  const bare = text.replace(/[\s,]/g, "").replace(/^[^\d.+-]+|%$/g, "");
  return /^[-+]?(\d+\.?\d*|\.\d+)$/.test(bare) ? Number(bare) : NaN;
}

const sortKey = (row, index) => {
  const cell = row.cells[index];
  return cell ? (cell.dataset.value ?? cell.textContent.trim()) : "";
};

// 1 … 4 5 6 … 20: the ends, the current page and its neighbours.
function pageList(current, count) {
  const pages = [...new Set([1, current - 1, current, current + 1, count])].filter(p => p >= 1 && p <= count).sort((a, b) => a - b);
  const list = [];
  let previous = 0;
  for (const page of pages) {
    if (page - previous === 2) list.push(previous + 1);
    else if (page - previous > 2) list.push("…");
    list.push(page);
    previous = page;
  }
  return list;
}

// A loaded row as a <tr>, its cells under the given header cells.
function toRow(item, columns) {
  if (item instanceof HTMLTableRowElement) return item;
  const row = document.createElement("tr");
  const values = Array.isArray(item) ? item : columns.map(th => item?.[th.dataset.key]);
  values.forEach((value, i) => {
    // The first cell names the row, as in a table written by hand.
    const cell = document.createElement(i === 0 ? "th" : "td");
    if (i === 0) cell.scope = "row";
    if (value instanceof Node) cell.append(value);
    else cell.textContent = value ?? "";
    row.append(cell);
  });
  if (!Array.isArray(item) && item?.id != null) row.dataset.id = item.id;
  return row;
}

const chevron = path => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d={path} />
  </svg>
);

function dataTable({ sortable, filter, pageSize, selectable, src, load }) {
  const host = useHost();
  const update = useUpdate();
  useLabels();
  const state = useRef({ rows: [], matching: [], sort: null, query: "", page: 1, pages: 1, from: 0, to: 0, total: 0, chosen: new Set() }).current;
  const tableId = `bx-table-${useId()}`;
  const table = host.current.querySelector(":scope > table, :scope > [responsive] > table");
  const paged = pageSize > 0;

  // Read through state, so listeners added on the first render see new values.
  state.load = load ?? (src && (({ page, pageSize, sort, order, query, signal }) => getJSON(src, { page, size: pageSize, sort, order, q: query }, signal)));
  const remote = () => Boolean(state.load);

  const selectedRows = () => state.rows.filter(row => row.hasAttribute("selected"));

  // The header cells of the data columns, without the checkbox column.
  const columns = () => {
    const header = table.tHead?.rows;
    return [...(header?.[header.length - 1]?.cells ?? [])].filter(th => !th.hasAttribute("bx-select"));
  };

  // --- Changes to the author's table -----------------------------------------

  // Header buttons and checkbox cells are added and removed to match the
  // attributes, and never twice.
  function enhance() {
    const header = table.tHead?.rows;
    for (const th of header?.[header.length - 1]?.cells ?? []) {
      const button = th.querySelector(":scope > [bx-sort]");
      if (sortable && !button && !th.hasAttribute("nosort") && !th.hasAttribute("bx-select") && th.textContent.trim()) {
        const sort = document.createElement("button");
        sort.type = "button";
        sort.setAttribute("bx-sort", "");
        sort.append(...th.childNodes);
        th.append(sort);
      } else if (!sortable && button) {
        button.replaceWith(...button.childNodes);
        th.removeAttribute("aria-sort");
      }
    }
    if (!sortable) state.sort = null;

    for (const row of table.rows) {
      const cell = row.querySelector(":scope > [bx-select]");
      if (!selectable) {
        cell?.remove();
        row.removeAttribute("selected");
        continue;
      }
      if (cell) continue;
      const head = row.parentElement === table.tHead;
      const added = document.createElement(head ? "th" : "td");
      added.setAttribute("bx-select", "");
      if (head && row === header[header.length - 1]) added.append(checkbox(labels.selectAll));
      if (row.parentElement === table.tBodies[0]) {
        const name = (row.querySelector("th[scope=row]") ?? row.cells[0])?.textContent.trim();
        added.append(checkbox(labels.selectRow(name), row.hasAttribute("selected")));
      }
      row.prepend(added);
    }
  }

  function checkbox(label, checked = false) {
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = checked;
    box.setAttribute("aria-label", label);
    return box;
  }

  // Order, filter and page the rows, then render the controls to match. Loaded
  // rows arrive ordered, filtered and paged, and are all shown.
  function apply() {
    const body = table.tBodies[0];
    if (!body) return;

    if (remote()) {
      state.matching = state.rows;
      state.pages = paged ? Math.max(1, Math.ceil(state.total / pageSize)) : 1;
      state.from = paged ? (state.page - 1) * pageSize : 0;
      state.to = state.from + state.rows.length;
    } else {
      let ordered = state.rows;
      if (state.sort) {
        // The header cell, not its index, is kept: a checkbox column can be added
        // in front of it after the sort was chosen.
        const { th, direction } = state.sort;
        const index = th.cellIndex;
        const collator = new Intl.Collator(langOf(table), { numeric: true, sensitivity: "base" });
        ordered = [...state.rows].sort((a, b) => {
          const [x, y] = [sortKey(a, index), sortKey(b, index)];
          const [m, n] = [toNumber(x), toNumber(y)];
          return direction * (Number.isNaN(m) || Number.isNaN(n) ? collator.compare(x, y) : m - n);
        });
      }

      const query = fold(state.query.trim());
      const matching = query ? ordered.filter(row => fold(row.textContent).includes(query)) : ordered;
      state.pages = paged ? Math.max(1, Math.ceil(matching.length / pageSize)) : 1;
      state.page = Math.min(state.page, state.pages);
      state.from = paged ? (state.page - 1) * pageSize : 0;
      state.to = paged ? Math.min(state.from + pageSize, matching.length) : matching.length;
      state.matching = matching;
      const visible = new Set(matching.slice(state.from, state.to));

      body.append(...ordered);
      for (const row of ordered) row.hidden = !visible.has(row);
    }
    // The element's own changes are taken back out of the observer's queue, so
    // only the page's changes to the table trigger another pass.
    state.observer?.takeRecords();

    const all = table.tHead?.querySelector("[bx-select] > input");
    if (all) {
      const selected = state.matching.filter(row => row.hasAttribute("selected")).length;
      all.checked = selected > 0 && selected === state.matching.length;
      all.indeterminate = selected > 0 && selected < state.matching.length;
      all.disabled = !state.matching.length;
    }
    update();
  }

  // Rows the page added go last in the original order; removed ones are dropped.
  function collectRows() {
    const current = [...(table.tBodies[0]?.rows ?? [])];
    const present = new Set(current);
    const known = new Set(state.rows);
    state.rows = [...state.rows.filter(row => present.has(row)), ...current.filter(row => !known.has(row))];
  }

  function refresh() {
    enhance();
    collectRows();
    apply();
  }

  function select(rows, selected) {
    for (const row of rows) {
      row.toggleAttribute("selected", selected);
      const box = row.querySelector(":scope > [bx-select] > input");
      if (box) box.checked = selected;
      const id = row.dataset.id;
      if (id != null) state.chosen[selected ? "add" : "delete"](id);
    }
    apply();
    host.current.dispatchEvent(new CustomEvent("rowselect", { bubbles: true, detail: { rows: selectedRows(), ids: selectedIds() } }));
  }

  // Loaded rows come and go with each page, so ids are what stays selected.
  const selectedIds = () => (remote() ? [...state.chosen] : selectedRows().flatMap(row => row.dataset.id ?? []));

  // --- Loading -------------------------------------------------------------------

  // Ask for the rows that match the sort, filter and page, dropping any answer a
  // newer request has overtaken. A filter waits for typing to pause.
  function fetchRows(delay = 0) {
    clearTimeout(state.timer);
    state.controller?.abort();
    state.loading = true;
    table.setAttribute("aria-busy", "true");
    update();
    state.timer = setTimeout(async () => {
      const controller = (state.controller = new AbortController());
      const sorted = state.sort && columns().indexOf(state.sort.th);
      try {
        const result = await state.load({
          page: state.page,
          pageSize: paged ? pageSize : undefined,
          sort: state.sort ? (state.sort.th.dataset.key ?? sorted) : undefined,
          order: state.sort ? (state.sort.direction === 1 ? "asc" : "desc") : undefined,
          query: state.query.trim(),
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const rows = (Array.isArray(result) ? result : result?.rows) ?? [];
        state.total = Number(result?.total ?? rows.length);
        state.failed = false;
        // Past the last page (rows were removed since): go to the last one.
        if (!rows.length && state.page > 1 && paged && state.total > 0) {
          state.page = Math.ceil(state.total / pageSize);
          return fetchRows();
        }
        const body = table.tBodies[0] ?? table.createTBody();
        const added = rows.map(item => toRow(item, columns()));
        for (const row of added) if (state.chosen.has(row.dataset.id)) row.setAttribute("selected", "");
        body.replaceChildren(...added);
        refresh();
      } catch (error) {
        if (controller.signal.aborted) return;
        state.failed = true;
        console.error(error);
      }
      state.loading = false;
      table.removeAttribute("aria-busy");
      update();
    }, delay);
  }

  // --- Lifecycle -----------------------------------------------------------------

  useEffect(() => {
    if (!table) return;
    table.id ||= tableId;
    host.current.selectedRows = selectedRows;
    host.current.selectedIds = selectedIds;
    host.current.reload = () => remote() && fetchRows();

    const observer = (state.observer = new MutationObserver(refresh));

    const onClick = event => {
      const button = event.target.closest("[bx-sort]");
      if (!button || !table.contains(button)) return;
      const th = button.parentElement;
      // Unsorted, then ascending, descending and back to the order written.
      const direction = state.sort?.th !== th ? 1 : state.sort.direction === 1 ? -1 : 0;
      state.sort = direction ? { th, direction } : null;
      for (const cell of th.parentElement.cells) cell.removeAttribute("aria-sort");
      if (direction) th.setAttribute("aria-sort", direction === 1 ? "ascending" : "descending");
      if (remote()) {
        state.page = 1;
        fetchRows();
      } else {
        apply();
      }
    };

    const onChange = event => {
      const box = event.target;
      if (!box.matches("[bx-select] > input")) return;
      // The header checkbox selects every row the filter leaves, on all pages.
      const row = box.closest("tr");
      select(row.parentElement === table.tHead ? state.matching : [row], box.checked);
    };

    refresh();
    observer.observe(table, { childList: true, subtree: true });
    table.addEventListener("click", onClick);
    table.addEventListener("change", onChange);
    return () => {
      observer.disconnect();
      state.observer = null;
      table.removeEventListener("click", onClick);
      table.removeEventListener("change", onChange);
    };
  }, [sortable, selectable, pageSize]);

  // A new source, or a new page size, starts again from the first page.
  useEffect(() => {
    if (!table || !remote()) return;
    state.page = 1;
    fetchRows();
    return () => {
      clearTimeout(state.timer);
      state.controller?.abort();
    };
  }, [src, load, pageSize]);

  // Checkbox names follow the labels, which can change after the boxes exist.
  useEffect(() => {
    if (!table) return;
    table.tHead?.querySelector("[bx-select] > input")?.setAttribute("aria-label", labels.selectAll);
    for (const row of state.rows) {
      const name = (row.querySelector("th[scope=row]") ?? row.cells[1])?.textContent.trim();
      row.querySelector(":scope > [bx-select] > input")?.setAttribute("aria-label", labels.selectRow(name));
    }
  });

  // --- Rendered controls ---------------------------------------------------------

  if (!table) return <host />;

  const go = page => {
    state.page = page;
    if (remote()) fetchRows();
    else apply();
  };

  const count = n => n.toLocaleString(langOf(host.current));
  const matching = remote() ? state.total : state.matching.length;
  const summary = state.failed
    ? labels.loadFailed
    : state.loading && !state.rows.length
      ? labels.loading
      : !matching
        ? labels.noMatchingRows
        : paged
          ? labels.showing(count(state.from + 1), count(state.to), count(matching))
          : labels.rows(remote() ? state.rows.length : matching, remote() ? state.total : state.rows.length);

  return (
    <host>
      {filter != null && (
        <input
          type="search"
          bx-filter=""
          placeholder={filter || labels.filter}
          aria-label={filter || labels.filterRows}
          aria-controls={table.id || tableId}
          value={state.query}
          oninput={event => {
            state.query = event.target.value;
            state.page = 1;
            if (remote()) fetchRows(DELAY);
            else apply();
          }}
        />
      )}
      {(paged || filter != null || remote()) && (
        <footer>
          <small muted="" aria-live="polite">
            {summary}
          </small>
          {state.pages > 1 && (
            <nav pagination="" aria-label={labels.pagination}>
              <button type="button" aria-label={labels.previousPage} disabled={state.page === 1} onclick={() => go(state.page - 1)}>
                {chevron("m15 18-6-6 6-6")}
              </button>
              {pageList(state.page, state.pages).map(page =>
                page === "…" ? (
                  <span aria-hidden="true">…</span>
                ) : (
                  <button type="button" aria-label={labels.page(page)} aria-current={page === state.page ? "page" : null} onclick={() => go(page)}>
                    {page}
                  </button>
                ),
              )}
              <button type="button" aria-label={labels.nextPage} disabled={state.page === state.pages} onclick={() => go(state.page + 1)}>
                {chevron("m9 18 6-6-6-6")}
              </button>
            </nav>
          )}
        </footer>
      )}
    </host>
  );
}

export const DataTable = c(dataTable, {
  props: {
    sortable: { type: Boolean },
    filter: { type: String },
    pageSize: { type: Number },
    selectable: { type: Boolean },
    src: { type: String },
    load: { type: Function },
  },
});

if (!customElements.get("bx-data-table")) customElements.define("bx-data-table", DataTable);
