// <bx-context-menu>: a menu that opens where the content is right-clicked, or
// from the keyboard with the context menu key or Shift+F10.
//
//   <bx-context-menu>
//     <article>Right-click anywhere in this card.</article>
//     <div popover>
//       <button>Rename</button>
//       <button destructive>Delete</button>
//     </div>
//   </bx-context-menu>
//
// Everything in the element except the menu is the area it opens on. Without
// JavaScript the browser's own context menu stays.

import { c, useEffect, useHost } from "atomico";
import { focusItem, menuKeys, place, prepareMenu } from "./shared.js";

function contextMenu() {
  const host = useHost();

  useEffect(() => {
    const area = host.current;
    const menu = area.querySelector(":scope > [popover]");
    if (!menu) return;
    prepareMenu(menu);

    const open = point => {
      if (menu.matches(":popover-open")) menu.hidePopover();
      prepareMenu(menu);
      menu.showPopover();
      place(menu, point);
      focusItem(menu);
    };

    // Where the context menu event comes while the button is still down (Linux
    // and macOS), the release that follows would light-dismiss a menu opened
    // straight away, so it opens once the button is up.
    let pressed = false;
    const onPointerDown = event => {
      pressed = event.button === 2;
      if (pressed) addEventListener("pointerup", () => (pressed = false), { once: true });
    };
    const onContextMenu = event => {
      event.preventDefault();
      if (menu.contains(event.target)) return;

      // From the keyboard there is no pointer, so open under the focused element.
      let point = { x: event.clientX, y: event.clientY };
      if (!point.x && !point.y) {
        const box = event.target.getBoundingClientRect();
        point = { x: box.left, y: box.bottom };
      }

      if (!pressed) return open(point);
      const release = () => {
        removeEventListener("pointerup", release);
        removeEventListener("pointercancel", release);
        setTimeout(() => open(point));
      };
      addEventListener("pointerup", release);
      addEventListener("pointercancel", release);
    };

    // A context menu belongs to the spot it was opened on, so it closes rather
    // than drifting away from it when the page moves.
    const close = () => menu.matches(":popover-open") && menu.hidePopover();
    const onToggle = event => {
      const method = event.newState === "open" ? addEventListener : removeEventListener;
      method("scroll", close, { capture: true, passive: true });
      method("resize", close, { passive: true });
    };

    const stopKeys = menuKeys(menu);
    area.addEventListener("pointerdown", onPointerDown);
    area.addEventListener("contextmenu", onContextMenu);
    menu.addEventListener("toggle", onToggle);
    return () => {
      stopKeys();
      onToggle({ newState: "closed" });
      area.removeEventListener("pointerdown", onPointerDown);
      area.removeEventListener("contextmenu", onContextMenu);
      menu.removeEventListener("toggle", onToggle);
    };
  }, []);

  return <host />;
}

export const ContextMenu = c(contextMenu);

if (!customElements.get("bx-context-menu")) customElements.define("bx-context-menu", ContextMenu);
