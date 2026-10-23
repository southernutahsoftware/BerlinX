// The words the elements show or read out. Change them for every element at once:
//
//   import { setLabels } from "berlinx/elements";
//   setLabels({ previousMonth: "Mois précédent", noResults: "Aucun résultat" });
//
// Elements already on the page update to match. Entries that take a value are
// functions: setLabels({ page: n => `Seite ${n}` }).

export const labels = {
  // Combobox, multi-select and command palette
  noResults: "No results",
  loading: "Loading…",
  invalidOption: "Choose an option from the list.",
  remove: label => `Remove ${label}`,
  commands: "Commands",
  searchCommands: "Type a command or search…",

  // Date picker
  pickDate: "Pick a date",
  chooseDate: "Choose a date",
  previousMonth: "Previous month",
  nextMonth: "Next month",
  today: "Today",
  clear: "Clear",

  // Data table
  filter: "Filter…",
  filterRows: "Filter rows",
  selectAll: "Select all rows",
  selectRow: name => (name ? `Select ${name}` : "Select row"),
  pagination: "Pagination",
  previousPage: "Previous page",
  nextPage: "Next page",
  page: n => `Page ${n}`,
  showing: (from, to, total) => `${from}–${to} of ${total}`,
  rows: (shown, total) => (shown === total ? `${total} ${total === 1 ? "row" : "rows"}` : `${shown} of ${total} rows`),
  noMatchingRows: "No matching rows",

  // Sidebar
  collapseSidebar: "Collapse sidebar",
  expandSidebar: "Expand sidebar",

  // toast() and confirm()
  notifications: "Notifications",
  dismiss: "Dismiss",
  confirm: "Confirm",
  cancel: "Cancel",
};

export const listeners = new Set();

/** Replace some or all of the labels, and update the elements on the page. */
export function setLabels(changes) {
  Object.assign(labels, changes);
  for (const update of listeners) update();
}
