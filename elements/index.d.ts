export { toast, type Toast, type ToastOptions } from "./toast.js";
export { confirm, type ConfirmOptions } from "./confirm.js";
export { labels, setLabels, type Labels } from "./labels.js";

type Option = string | { value: string; label?: string };

export declare class Combobox extends HTMLElement {
  options?: Option[];
  /** Loads options for what was typed; called a moment after typing pauses. */
  load?: (query: string, init: { signal: AbortSignal }) => Option[] | Promise<Option[]>;
  /** A URL fetched with ?q= for what was typed, answering a JSON array of options. */
  src?: string;
  strict?: string;
}

export declare class Command extends HTMLElement {
  shortcut?: string;
  show(): void;
  close(): void;
}

export declare class ContextMenu extends HTMLElement {}

type DataTableRow = HTMLTableRowElement | unknown[] | ({ id?: string | number } & Record<string, unknown>);
type DataTableResult = DataTableRow[] | { rows: DataTableRow[]; total?: number };

export interface DataTableRequest {
  page: number;
  pageSize?: number;
  /** The sorted column's data-key, or its index. */
  sort?: string | number;
  order?: "asc" | "desc";
  query: string;
  signal: AbortSignal;
}

export declare class DataTable extends HTMLElement {
  sortable?: boolean;
  filter?: string;
  pageSize?: number;
  selectable?: boolean;
  /** A URL fetched with ?page=&size=&sort=&order=&q=, answering { rows, total } or an array of rows. */
  src?: string;
  /** Loads the rows for a page; the server then sorts, filters and pages. */
  load?: (request: DataTableRequest) => DataTableResult | Promise<DataTableResult>;
  /** The selected body rows, in their original order. */
  readonly selectedRows: () => HTMLTableRowElement[];
  /** The ids (data-id) of the selected rows; with src or load, across every page loaded. */
  readonly selectedIds: () => string[];
  /** Load the current page again. */
  readonly reload: () => void;
}

export declare class DatePicker extends HTMLElement {
  placeholder?: string;
  weekStart?: number;
}

export declare class Dropdown extends HTMLElement {}

export declare class MultiSelect extends HTMLElement {
  placeholder?: string;
}

export declare class Select extends HTMLElement {
  placeholder?: string;
  /** A URL fetched with ?q= for what was typed, answering a JSON array of options. */
  src?: string;
  /** Loads options for what was typed; called a moment after typing pauses. */
  load?: (query: string, init: { signal: AbortSignal }) => Option[] | Promise<Option[]>;
}

export declare class Sidebar extends HTMLElement {
  /** The edge it sits on: "start" (the default) or "end". */
  side?: "start" | "end";
  collapsed?: boolean;
  persist?: string;
  shortcut?: string;
}

export declare class Tabs extends HTMLElement {
  /** The id of the panel shown. */
  selected?: string;
}

export declare class Tree extends HTMLElement {}

declare global {
  interface HTMLElementTagNameMap {
    "bx-combobox": Combobox;
    "bx-command": Command;
    "bx-context-menu": ContextMenu;
    "bx-data-table": DataTable;
    "bx-date-picker": DatePicker;
    "bx-dropdown": Dropdown;
    "bx-multi-select": MultiSelect;
    "bx-select": Select;
    "bx-sidebar": Sidebar;
    "bx-tabs": Tabs;
    "bx-tree": Tree;
  }
}
