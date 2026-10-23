export interface Labels {
  noResults: string;
  loading: string;
  invalidOption: string;
  remove: (label: string) => string;
  commands: string;
  searchCommands: string;
  pickDate: string;
  chooseDate: string;
  previousMonth: string;
  nextMonth: string;
  today: string;
  clear: string;
  filter: string;
  filterRows: string;
  selectAll: string;
  selectRow: (name: string) => string;
  pagination: string;
  previousPage: string;
  nextPage: string;
  page: (n: number) => string;
  showing: (from: string, to: string, total: string) => string;
  rows: (shown: number, total: number) => string;
  noMatchingRows: string;
  collapseSidebar: string;
  expandSidebar: string;
  openSidebar: string;
  notifications: string;
  dismiss: string;
  confirm: string;
  cancel: string;
}

/** The words the elements show or read out. */
export const labels: Readonly<Labels>;

/** Replace some or all of the labels, and update the elements on the page. */
export function setLabels(changes: Partial<Labels>): void;
