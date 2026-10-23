// <bx-dropdown>: a button that opens a menu of actions.
//
//   <bx-dropdown>
//     <button popovertarget="actions">Actions</button>
//     <div popover id="actions">
//       <button>Edit</button>
//       <button destructive>Delete</button>
//     </div>
//   </bx-dropdown>
//
// The markup is a native popover, so it opens without JavaScript. The element
// adds menu semantics, arrow keys, type-ahead and placement under the button.

import { c, useEffect, useHost } from "atomico";
import { focusItem, follow, idOf, menuKeys, prepareMenu } from "./shared.js";

function dropdown() {
  const host = useHost();

  useEffect(() => {
    const menu = host.current.querySelector(":scope > [popover]");
    const trigger = host.current.querySelector(":scope > [popovertarget], :scope > button");
    if (!menu || !trigger) return;

    // The popovertarget attribute is optional once the element is defined.
    if (!trigger.popoverTargetElement) trigger.popoverTargetElement = menu;
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", idOf(menu));
    prepareMenu(menu);

    const placement = menu.getAttribute("placement") ?? "";
    const options = { side: placement.startsWith("top") ? "top" : "bottom", align: placement.endsWith("end") ? "end" : "start" };
    let unfollow;
    let focusLast = false;

    // Placed in the frame it opens in, before it is painted anywhere else.
    const onBeforeToggle = event => {
      const open = event.newState === "open";
      trigger.setAttribute("aria-expanded", String(open));
      if (!open) return unfollow?.();
      prepareMenu(menu);
      requestAnimationFrame(() => {
        if (!menu.matches(":popover-open")) return;
        unfollow = follow(menu, trigger, options);
        focusItem(menu, focusLast ? "last" : "first");
        focusLast = false;
      });
    };

    // Arrow keys on the button open the menu at its first or last item.
    const onTriggerKey = event => {
      if ((event.key === "ArrowDown" || event.key === "ArrowUp") && !menu.matches(":popover-open")) {
        event.preventDefault();
        focusLast = event.key === "ArrowUp";
        trigger.click();
      }
    };

    const stopKeys = menuKeys(menu);
    menu.addEventListener("beforetoggle", onBeforeToggle);
    trigger.addEventListener("keydown", onTriggerKey);
    return () => {
      stopKeys();
      unfollow?.();
      menu.removeEventListener("beforetoggle", onBeforeToggle);
      trigger.removeEventListener("keydown", onTriggerKey);
    };
  }, []);

  return <host />;
}

export const Dropdown = c(dropdown);

if (!customElements.get("bx-dropdown")) customElements.define("bx-dropdown", Dropdown);
