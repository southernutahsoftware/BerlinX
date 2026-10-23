export interface ToastOptions {
  message: string;
  title?: string;
  variant?: "success" | "warning" | "error";
  /** Milliseconds on screen. Default 5000; 0 keeps the toast until dismissed. */
  duration?: number;
  action?: { label: string; onClick?: () => void };
}

export interface Toast {
  dismiss(): void;
}

/** Show a toast. Takes a message, or an options object. */
export function toast(options: string | ToastOptions): Toast;
