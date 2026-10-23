// <bx-tree>: a tree of folders and items, such as files or nested navigation.
//
//   <bx-tree>
//     <ul>
//       <li>
//         <details open>
//           <summary>src</summary>
//           <ul>
//             <li><a href="/src/index.js">index.js</a></li>
//           </ul>
//         </details>
//       </li>
//       <li><button>README.md</button></li>
//     </ul>
//   </bx-tree>
//
// A folder is a <details>, so it opens and closes without JavaScript, and the
// stylesheet draws the tree either way. With JavaScript the whole tree is one
// stop in the tab order and the arrow keys move through it: up and down, right
// to open a folder or go into it, left to close it or go up to its parent; Home
// and End go to the ends and typing jumps to an item.
//
// Items are links or buttons. A clicked button becomes aria-current="true", so
// it shows as the current one; set aria-current on a link for the page you are on.

import { c, useEffect, useHost } from "atomico";

const ITEM = "summary, a[href], button";

function tree() {
  const host = useHost();

  useEffect(() => {
    const root = host.current;
    let typed = "";
    let timer;

    // Items inside a closed folder are skipped. Asked of the folders rather than
    // the layout: engines may keep a closed folder's contents laid out.
    const shown = el => {
      let folder = el.matches("summary") ? el.parentElement.parentElement.closest("details") : el.closest("details");
      for (; folder && root.contains(folder); folder = folder.parentElement.closest("details")) if (!folder.open) return false;
      return true;
    };
    const items = () => [...root.querySelectorAll(ITEM)].filter(shown);
    const folderOf = summary => summary.parentElement;
    const parentSummary = el => {
      const details = el.matches("summary") ? folderOf(el).parentElement.closest("details") : el.closest("details");
      return details && root.contains(details) ? details.querySelector(":scope > summary") : null;
    };

    // One item takes Tab: the focused one, else the current one, else the first.
    const rove = (focused = root.querySelector(`:is(${ITEM}):focus`)) => {
      const all = [...root.querySelectorAll(ITEM)];
      const stop = focused ?? all.find(el => el.matches("[aria-current]:not([aria-current='false'])") && shown(el)) ?? items()[0];
      for (const el of all) el.tabIndex = el === stop ? 0 : -1;
    };

    const go = (el, event) => {
      if (!el) return;
      event.preventDefault();
      el.focus();
    };

    const onKey = event => {
      const el = event.target.closest(ITEM);
      if (!el || !root.contains(el) || event.altKey || event.ctrlKey || event.metaKey) return;
      const list = items();
      const index = list.indexOf(el);
      const rtl = getComputedStyle(root).direction === "rtl";
      const into = rtl ? "ArrowLeft" : "ArrowRight";
      const out = rtl ? "ArrowRight" : "ArrowLeft";
      const folder = el.matches("summary") ? folderOf(el) : null;

      if (event.key === "ArrowDown") go(list[index + 1], event);
      else if (event.key === "ArrowUp") go(list[index - 1], event);
      else if (event.key === "Home") go(list[0], event);
      else if (event.key === "End") go(list.at(-1), event);
      else if (event.key === into && folder) {
        event.preventDefault();
        if (!folder.open) folder.open = true;
        else go(items()[index + 1], event);
      } else if (event.key === out) {
        event.preventDefault();
        if (folder?.open) folder.open = false;
        else go(parentSummary(el), event);
      } else if (event.key.length === 1 && event.key !== " ") {
        clearTimeout(timer);
        timer = setTimeout(() => (typed = ""), 500);
        typed += event.key.toLowerCase();
        const ordered = [...list.slice(index + 1), ...list.slice(0, index + 1)];
        go(ordered.find(item => item.textContent.trim().toLowerCase().startsWith(typed)), event);
      }
    };

    const onClick = event => {
      const button = event.target.closest("button");
      if (!button || !root.contains(button)) return;
      for (const el of root.querySelectorAll("button[aria-current]")) el.removeAttribute("aria-current");
      button.setAttribute("aria-current", "true");
    };

    // Closing a folder that holds the focus moves it to the folder; one that
    // hides the tab stop hands it on, so the tree can always be tabbed into.
    const onToggle = event => {
      const details = event.target;
      if (!details.open && details.contains(document.activeElement)) {
        const summary = details.querySelector(":scope > summary");
        if (summary !== document.activeElement) summary.focus();
      }
      const stop = root.querySelector(`:is(${ITEM})[tabindex="0"]`);
      if (!stop || !shown(stop)) rove();
    };

    const onFocus = event => {
      const el = event.target.closest(ITEM);
      if (el && root.contains(el)) rove(el);
    };

    // Items added later join the tab order the same way.
    const observer = new MutationObserver(() => rove());

    rove();
    root.addEventListener("keydown", onKey);
    root.addEventListener("click", onClick);
    root.addEventListener("toggle", onToggle, true);
    root.addEventListener("focusin", onFocus);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      root.removeEventListener("keydown", onKey);
      root.removeEventListener("click", onClick);
      root.removeEventListener("toggle", onToggle, true);
      root.removeEventListener("focusin", onFocus);
    };
  }, []);

  return <host />;
}

export const Tree = c(tree);

if (!customElements.get("bx-tree")) customElements.define("bx-tree", Tree);
