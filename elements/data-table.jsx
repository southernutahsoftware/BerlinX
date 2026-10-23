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

import { c, useEffect, useHost, useId, useRef, useUpdate } from "atomico";
import { labels } from "./labels.js";
import { useLabels } from "./use-labels.js";
import { fold, langOf } from "./shared.js";

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

const chevron = path => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d={path} />
  </svg>
);

function dataTable({ sortable, filter, pageSize, selectable }) {
  const host = useHost();
  const update = useUpdate();
  useLabels();
  const state = useRef({ rows: [], matching: [], sort: null, query: "", page: 1, pages: 1, from: 0, to: 0 }).current;
  const tableId = `bx-table-${useId()}`;
  const table = host.current.querySelector(":scope > table, :scope > [responsive] > table");
  const paged = pageSize > 0;

  const selectedRows = () => state.rows.filter(row => row.hasAttribute("selected"));

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
        added.append(checkbox(labels.selectRow(name)));
      }
      row.prepend(added);
    }
  }

  function checkbox(label) {
    const box = document.createElement("input");
    box.type = "checkbox";
    box.setAttribute("aria-label", label);
    return box;
  }

  // Order, filter and page the rows, then render the controls to match.
  function apply() {
    const body = table.tBodies[0];
    if (!body) return;

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
    // The element's own changes are taken back out of the observer's queue, so
    // only the page's changes to the table trigger another pass.
    state.observer?.takeRecords();

    const all = table.tHead?.querySelector("[bx-select] > input");
    if (all) {
      const selected = matching.filter(row => row.hasAttribute("selected")).length;
      all.checked = selected > 0 && selected === matching.length;
      all.indeterminate = selected > 0 && selected < matching.length;
      all.disabled = !matching.length;
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

  function select(rows, selected) {
    for (const row of rows) {
      row.toggleAttribute("selected", selected);
      const box = row.querySelector(":scope > [bx-select] > input");
      if (box) box.checked = selected;
    }
    apply();
    host.current.dispatchEvent(new CustomEvent("rowselect", { bubbles: true, detail: { rows: selectedRows() } }));
  }

  // --- Lifecycle -----------------------------------------------------------------

  useEffect(() => {
    if (!table) return;
    table.id ||= tableId;
    host.current.selectedRows = selectedRows;

    const refresh = () => {
      enhance();
      collectRows();
      apply();
    };
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
      apply();
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
    apply();
  };

  const count = n => n.toLocaleString(langOf(host.current));
  const matching = state.matching.length;
  const summary = !matching
    ? labels.noMatchingRows
    : paged
      ? labels.showing(count(state.from + 1), count(state.to), count(matching))
      : labels.rows(matching, state.rows.length);

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
            apply();
          }}
        />
      )}
      {(paged || filter != null) && (
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
  },
});

if (!customElements.get("bx-data-table")) customElements.define("bx-data-table", DataTable);
