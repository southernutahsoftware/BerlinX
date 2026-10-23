export { toast, type Toast, type ToastOptions } from "./toast.js";
export { confirm, type ConfirmOptions } from "./confirm.js";
export { labels, setLabels, type Labels } from "./labels.js";

type Option = string | { value: string; label?: string };

export declare class Combobox extends HTMLElement {
  options?: Option[];
  /** Loads options for what was typed; called a moment after typing pauses. */
  load?: (query: string, init: { signal: AbortSignal }) => Option[] | Promise<Option[]>;
  strict?: string;
}

export declare class Command extends HTMLElement {
  shortcut?: string;
  show(): void;
  close(): void;
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

export declare class MultiSelect extends HTMLElement {
  placeholder?: string;
}

export declare class Sidebar extends HTMLElement {
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
    "bx-sidebar": Sidebar;
    "bx-tabs": Tabs;
    "bx-tree": Tree;
  }
}
