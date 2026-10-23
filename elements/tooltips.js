// Tooltips: BerlinX's tooltip="…" attribute, made accessible.
//
//   import "berlinx/elements/tooltips";
//
//   <button icon tooltip="Delete" aria-label="Delete">…</button>
//
// The markup is unchanged. Without this import a tooltip is drawn by CSS: seen
// on hover and focus, never read out, and clipped by a scrolling container. With
// it the tooltip is one shared popover in the top layer, so nothing clips it; it
// describes its control to screen readers, stays while the pointer moves onto
// it, and Escape dismisses it.

import { idOf, place } from "./shared.js";

const SHOW_DELAY = 300;
const PLACEMENT = { side: "top", align: "center" };
const HIDE_DELAY = 100;

let tip;
let anchor;
let showTimer;
let hideTimer;
let addedDescription = false;

function getTip() {
  if (tip) return tip;
  tip = document.createElement("div");
  tip.setAttribute("bx-tooltip", "");
  tip.setAttribute("popover", "manual");
  tip.setAttribute("role", "tooltip");
  idOf(tip, "bx-tooltip");
  // Moving onto the tooltip keeps it, so it can be read at any zoom (WCAG 1.4.13).
  tip.addEventListener("pointerenter", () => clearTimeout(hideTimer));
  tip.addEventListener("pointerleave", event => !anchor?.contains(event.relatedTarget) && hideSoon());
  return tip;
}

// The name it would already be read by: no point saying it twice.
const nameOf = el => (el.getAttribute("aria-label") ?? el.textContent).trim();

function show(el) {
  clearTimeout(showTimer);
  clearTimeout(hideTimer);
  if (anchor === el) return;
  hide();
  const text = el.getAttribute("tooltip");
  if (!text || !el.isConnected) return;
  anchor = el;

  const tooltip = getTip();
  tooltip.textContent = text;
  // Outside an open modal dialog the tooltip would be inert, so it goes inside.
  const parent = el.closest("dialog") ?? document.body;
  if (tooltip.parentElement !== parent) parent.append(tooltip);

  addedDescription = text !== nameOf(el);
  if (addedDescription) {
    const ids = el.getAttribute("aria-describedby");
    el.setAttribute("aria-describedby", ids ? `${ids} ${tooltip.id}` : tooltip.id);
  }

  tooltip.showPopover();
  place(tooltip, el, PLACEMENT);
}

function hide() {
  clearTimeout(showTimer);
  clearTimeout(hideTimer);
  if (!anchor) return;
  if (addedDescription) {
    const ids = anchor.getAttribute("aria-describedby")?.split(" ").filter(id => id !== tip.id).join(" ");
    if (ids) anchor.setAttribute("aria-describedby", ids);
    else anchor.removeAttribute("aria-describedby");
  }
  anchor = null;
  if (tip.matches(":popover-open")) tip.hidePopover();
}

function hideSoon() {
  clearTimeout(showTimer);
  clearTimeout(hideTimer);
  hideTimer = setTimeout(hide, HIDE_DELAY);
}

const target = event => event.target.closest?.("[tooltip]");

function start() {
  if (document.documentElement.hasAttribute("bx-tooltips")) return;
  // Tells the stylesheet to stop drawing its own tooltips.
  document.documentElement.setAttribute("bx-tooltips", "");

  document.addEventListener("pointerover", event => {
    const el = target(event);
    if (!el || event.pointerType === "touch") return;
    if (el === anchor) return clearTimeout(hideTimer);
    clearTimeout(showTimer);
    showTimer = setTimeout(() => show(el), anchor ? 0 : SHOW_DELAY);
  });

  document.addEventListener("pointerout", event => {
    const el = target(event);
    if (!el || el.contains(event.relatedTarget) || tip?.contains(event.relatedTarget)) return;
    if (el === anchor) hideSoon();
    else clearTimeout(showTimer);
  });

  document.addEventListener("focusin", event => {
    const el = target(event);
    if (el?.matches(":focus-visible")) show(el);
  });

  document.addEventListener("focusout", event => {
    if (target(event) === anchor) hide();
  });

  // Pressing or clicking means the person has moved on from reading.
  document.addEventListener("pointerdown", hide);

  // Scrolling, including the scroll that focusing a control can cause, carries
  // the tooltip along with its control.
  addEventListener("scroll", () => anchor && place(tip, anchor, PLACEMENT), { capture: true, passive: true });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && anchor) hide();
  });
}

start();
