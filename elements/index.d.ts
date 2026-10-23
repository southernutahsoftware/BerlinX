export { toast, type Toast, type ToastOptions } from "./toast.js";
export { confirm, type ConfirmOptions } from "./confirm.js";

export declare class Combobox extends HTMLElement {
  options?: Array<string | { value: string; label?: string }>;
  strict?: string;
}

export declare class ContextMenu extends HTMLElement {}

export declare class DataTable extends HTMLElement {
  sortable?: boolean;
  filter?: string;
  pageSize?: number;
  selectable?: boolean;
  /** The selected body rows, in their original order. */
  readonly selectedRows: () => HTMLTableRowElement[];
}

export declare class DatePicker extends HTMLElement {
  placeholder?: string;
  weekStart?: number;
}

export declare class Dropdown extends HTMLElement {}

declare global {
  interface HTMLElementTagNameMap {
    "bx-combobox": Combobox;
    "bx-context-menu": ContextMenu;
    "bx-data-table": DataTable;
    "bx-date-picker": DatePicker;
    "bx-dropdown": Dropdown;
  }
}
