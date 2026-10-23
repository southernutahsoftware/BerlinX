export interface ConfirmOptions {
  title?: string;
  message?: string;
  /** Confirm button text. Default "Confirm". */
  confirm?: string;
  /** Cancel button text. Default "Cancel". */
  cancel?: string;
  /** A destructive confirm button, with focus starting on Cancel. */
  destructive?: boolean;
}

/** Ask a question. Resolves true for the confirm button, false for Cancel or Escape. */
export function confirm(options: string | ConfirmOptions): Promise<boolean>;
