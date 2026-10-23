// toast(): short messages that stack in the corner and dismiss themselves.
//
//   import { toast } from "berlinx/elements";
//
//   toast("Invoice sent");
//   toast({ message: "Payment failed", variant: "error" });
//   toast({ message: "Client archived", action: { label: "Undo", onClick: restore } });
//
// Options:
//   message    the text
//   title      an optional heading above it
//   variant    "success" | "warning" | "error", the same edges as [notice]
//   duration   milliseconds on screen (default 5000); 0 keeps it until dismissed
//   action     { label, onClick } for a button beside the message
//
// Returns { dismiss() }. Timers pause while the pointer or focus is on a toast.
// At most three show at once; the rest wait their turn.

const MAX = 3;
const visible = new Set();
const queue = [];
let region;

const closeIcon =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';

// One region holds every toast, in the top layer so it shows over dialogs. It is
// made on first use and kept, so screen readers have a live region that already
// exists when a message arrives.
function getRegion() {
  if (region?.isConnected) return region;
  region = document.createElement("section");
  region.setAttribute("bx-toaster", "");
  region.setAttribute("popover", "manual");
  region.setAttribute("aria-label", "Notifications");
  region.setAttribute("aria-live", "polite");
  const hovered = () => region.matches(":hover");
  const focused = () => region.contains(document.activeElement);
  region.addEventListener("pointerenter", () => pause(true));
  region.addEventListener("pointerleave", () => pause(focused()));
  region.addEventListener("focusin", () => pause(true));
  region.addEventListener("focusout", event => pause(region.contains(event.relatedTarget) || hovered()));
  document.body.append(region);
  return region;
}

// While a modal dialog is open everything outside it is inert: still drawn, but
// not clickable and not announced. So the region moves into the dialog, which
// also lifts it above it, and comes back to the page when the dialog closes.
function raise() {
  const modals = [...document.querySelectorAll("dialog:modal")];
  const modal = document.activeElement?.closest("dialog:modal") ?? modals.at(-1);
  const parent = modal ?? document.body;
  if (region.parentElement !== parent) {
    parent.append(region);
    modal?.addEventListener(
      "close",
      () => {
        if (region.parentElement !== modal) return;
        document.body.append(region);
        if (visible.size) region.showPopover();
      },
      { once: true },
    );
  }
  if (!region.matches(":popover-open")) region.showPopover();
}

function pause(paused) {
  for (const handle of visible) handle.timer?.[paused ? "pause" : "resume"]();
}

// A countdown that can stop and carry on, with a second's grace after a pause.
function countdown(ms, done) {
  let left = ms;
  let started = Date.now();
  let id = setTimeout(done, left);
  return {
    pause() {
      if (id == null) return;
      clearTimeout(id);
      id = null;
      left -= Date.now() - started;
    },
    resume() {
      if (id != null) return;
      started = Date.now();
      id = setTimeout(done, Math.max(left, 1000));
    },
    stop: () => clearTimeout(id),
  };
}

function button(label, attributes) {
  const el = document.createElement("button");
  el.type = "button";
  for (const name of attributes) el.setAttribute(name, "");
  el.textContent = label;
  return el;
}

function render({ message = "", title, variant, action }, handle) {
  const el = document.createElement("div");
  el.setAttribute("notice", variant ?? "");
  if (variant === "error") el.setAttribute("role", "alert");

  const text = document.createElement("div");
  if (title) {
    const heading = document.createElement("strong");
    heading.textContent = title;
    text.append(heading);
  }
  const body = document.createElement("p");
  body.textContent = message;
  text.append(body);
  el.append(text);

  if (action) {
    const act = button(action.label, ["outline"]);
    act.addEventListener("click", () => {
      action.onClick?.();
      handle.dismiss();
    });
    el.append(act);
  }

  const close = button("", ["icon", "ghost"]);
  close.setAttribute("aria-label", "Dismiss");
  close.innerHTML = closeIcon;
  close.addEventListener("click", () => handle.dismiss());
  el.append(close);
  return el;
}

function open(handle) {
  visible.add(handle);
  getRegion();
  raise();
  // A frame's delay lets a region that was only just created register as live
  // before its first message lands in it.
  requestAnimationFrame(() => {
    if (handle.done) return;
    handle.el = render(handle.options, handle);
    const { duration = 5000 } = handle.options;
    if (duration > 0) {
      handle.timer = countdown(duration, () => handle.dismiss());
      if (region.matches(":hover") || region.contains(document.activeElement)) handle.timer.pause();
    }
    region.append(handle.el);
  });
}

/** Show a toast. Takes a message, or an options object. */
export function toast(options) {
  const handle = {
    options: typeof options === "string" ? { message: options } : { ...options },
    dismiss() {
      if (handle.done) return;
      handle.done = true;
      const waiting = queue.indexOf(handle);
      if (waiting >= 0) return void queue.splice(waiting, 1);

      visible.delete(handle);
      handle.timer?.stop();
      const el = handle.el;
      if (el) {
        // Focus would drop to the page if the toast holding it just vanished.
        if (el.contains(document.activeElement)) (el.nextElementSibling ?? el.previousElementSibling)?.querySelector("button")?.focus();
        el.remove();
      }
      const next = queue.shift();
      if (next) open(next);
    },
  };

  if (visible.size >= MAX) queue.push(handle);
  else open(handle);
  return handle;
}
