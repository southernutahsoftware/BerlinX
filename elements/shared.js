// Helpers shared by the elements: ids, text, stand-ins for hidden controls,
// popover placement and menu keyboard support.

let uid = 0;

/** The element's id, giving it a unique one first if it has none. */
export const idOf = (el, prefix = "bx") => el.id || (el.id = `${prefix}-${++uid}`);

/** Text folded for matching: no case, no accents. */
export const fold = text => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase();

/** The language of the page around an element, for Intl formatting. */
export const langOf = el => el.closest("[lang]")?.lang || navigator.language;

/** The text that labels a control an element hides and stands in for, without
 *  the element's own text (it usually sits inside the same <label>). */
export function labelOf(control, host) {
  if (control.hasAttribute("aria-label")) return control.getAttribute("aria-label");
  const ids = control.getAttribute("aria-labelledby");
  const nodes = ids
    ? ids.split(/\s+/).map(id => document.getElementById(id)).filter(Boolean)
    : [...(control.labels?.[0]?.childNodes ?? [])].filter(node => !node.contains(host));
  return nodes.map(node => node.textContent).join(" ").replace(/\s+/g, " ").trim();
}

/** Hide a native control the element stands in for. It stays in the form for its
 *  value and validation, out of sight, out of the tab order and unread, and a
 *  label click on it is passed to the stand-in. */
export function standIn(control, replacement) {
  control.tabIndex = -1;
  control.setAttribute("visually-hidden", "");
  control.setAttribute("aria-hidden", "true");
  const onFocus = () => replacement()?.focus();
  control.addEventListener("focus", onFocus);
  return () => control.removeEventListener("focus", onFocus);
}

/** Dispatch the events a person typing into a control would, so frameworks and
 *  form libraries see a value the element set. */
export function setValue(input, value) {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

const GAP = 6; // --space-s, the same gap BerlinX leaves under an anchored popover

/** Position an open popover against an anchor: below it, or above when below has
 *  no room, and always inside the viewport. The anchor is an element or a point
 *  ({ x, y }); side is "bottom" or "top", align "start", "center" or "end". Done
 *  in script rather than with CSS anchor positioning so it is the same in every
 *  engine, including ones without position-area. */
export function place(popover, anchor, { align = "start", side = "bottom" } = {}) {
  const box = anchor.getBoundingClientRect?.() ?? { left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y };
  const gap = anchor.getBoundingClientRect ? GAP : 0;
  Object.assign(popover.style, { positionArea: "none", inset: "auto", margin: "0", left: "0", top: "0" });

  const { width, height } = popover.getBoundingClientRect();
  const viewWidth = document.documentElement.clientWidth;
  const viewHeight = document.documentElement.clientHeight;
  const rtl = getComputedStyle(popover).direction === "rtl";

  let left = align === "center" ? (box.left + box.right - width) / 2 : (align === "end") !== rtl ? box.right - width : box.left;
  left = Math.max(GAP, Math.min(left, viewWidth - width - GAP));

  const below = box.bottom + gap;
  const above = box.top - gap - height;
  const fitsBelow = below + height <= viewHeight - GAP;
  const fitsAbove = above >= GAP;
  let top = side === "top" ? (fitsAbove || !fitsBelow ? above : below) : (fitsBelow || !fitsAbove ? below : above);
  top = Math.max(GAP, Math.min(top, viewHeight - height - GAP));

  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

/** Keep an open popover against its anchor while the page scrolls or resizes.
 *  Returns a function that stops. */
export function follow(popover, anchor, options) {
  const update = () => popover.matches(":popover-open") && place(popover, anchor, options);
  update();
  addEventListener("scroll", update, { capture: true, passive: true });
  addEventListener("resize", update, { passive: true });
  return () => {
    removeEventListener("scroll", update, { capture: true });
    removeEventListener("resize", update);
  };
}

// --- Menus --------------------------------------------------------------------

const ITEM = '[role^="menuitem"]';

/** The items a person can move to, in order. */
export const menuItems = menu =>
  [...menu.querySelectorAll(ITEM)].filter(el => !el.disabled && el.getAttribute("aria-disabled") !== "true" && el.getClientRects().length > 0);

/** Give a popover menu's buttons and links their roles. Items take focus from
 *  the arrow keys, not Tab, which leaves the menu. */
export function prepareMenu(menu) {
  menu.setAttribute("role", "menu");
  for (const el of menu.querySelectorAll("button, a[href]")) {
    if (!el.hasAttribute("role")) el.setAttribute("role", "menuitem");
    el.tabIndex = -1;
  }
  for (const el of menu.querySelectorAll("hr")) el.setAttribute("role", "separator");
}

/** Move focus into a menu: to the first item, or the last. */
export function focusItem(menu, which = "first") {
  const items = menuItems(menu);
  (which === "last" ? items.at(-1) : items[0])?.focus();
}

/** Arrow keys, Home and End, type-ahead, and closing on Tab or on choosing an
 *  item. Returns a function that removes the listeners. */
export function menuKeys(menu) {
  let typed = "";
  let timer;

  const onKey = event => {
    const items = menuItems(menu);
    const index = items.indexOf(document.activeElement);
    const go = i => {
      event.preventDefault();
      items[(i + items.length) % items.length]?.focus();
    };

    if (event.key === "ArrowDown") go(index + 1);
    else if (event.key === "ArrowUp") go(index < 0 ? -1 : index - 1);
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(-1);
    else if (event.key === "Tab") menu.hidePopover();
    else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      // Type-ahead: jump to the next item starting with what was typed.
      clearTimeout(timer);
      timer = setTimeout(() => (typed = ""), 500);
      typed += event.key.toLowerCase();
      const ordered = [...items.slice(index + 1), ...items.slice(0, index + 1)];
      const match = ordered.find(el => el.textContent.trim().toLowerCase().startsWith(typed));
      if (match) {
        event.preventDefault();
        match.focus();
      }
    }
  };

  // Choosing an item closes the menu, after the item's own click handlers ran.
  const onClick = event => {
    const item = event.target.closest(ITEM);
    if (item && menu.contains(item) && !item.disabled) menu.hidePopover();
  };

  menu.addEventListener("keydown", onKey);
  menu.addEventListener("click", onClick);
  return () => {
    menu.removeEventListener("keydown", onKey);
    menu.removeEventListener("click", onClick);
  };
}

// --- Remote data --------------------------------------------------------------

/** GET a URL as JSON, with the params added to its query string (empty ones are
 *  left out). Rejects on a response that is not ok, so the caller can say so. */
export async function getJSON(src, params, signal) {
  const url = new URL(src, document.baseURI);
  for (const [key, value] of Object.entries(params)) if (value != null && value !== "") url.searchParams.set(key, value);
  const response = await fetch(url, { signal, headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} from ${url}`);
  return response.json();
}
