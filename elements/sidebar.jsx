// <bx-sidebar>: a sidebar that collapses to its icons.
//
//   <bx-sidebar persist="app">
//     <aside>
//       <header>…</header>
//       <nav>
//         <a href="/inbox" aria-current="page"><svg …></svg> Inbox</a>
//         <a href="/clients"><svg …></svg> Clients</a>
//       </nav>
//     </aside>
//   </bx-sidebar>
//
// Without JavaScript this is BerlinX's <aside>, always open. With it a button on
// the edge collapses the sidebar to a rail of icons, so give each link a leading
// icon; collapsed, every link shows its name as a tooltip.
//
// Attributes: collapsed (set or read to change it), persist="name" to remember
// the choice in this browser, shortcut="b" for Ctrl+B or ⌘B. A `toggle` event
// fires when the person collapses or expands it.

import { c, useEffect, useHost, useRef } from "atomico";
import { useLabels } from "./use-labels.js";
import { idOf } from "./shared.js";
import "./tooltips.js";

const LINK = ":scope > aside nav :is(a, button)";
const key = name => `bx-sidebar:${name}`;

function read(name) {
  try {
    return localStorage.getItem(key(name));
  } catch {
    return null;
  }
}

function write(name, collapsed) {
  try {
    localStorage.setItem(key(name), collapsed ? "collapsed" : "expanded");
  } catch {}
}

function sidebar({ collapsed, persist, shortcut }) {
  const host = useHost();
  const labels = useLabels();
  const added = useRef(new Set()).current;
  const aside = host.current.querySelector(":scope > aside");

  const set = value => {
    if (host.current.collapsed === value) return;
    host.current.collapsed = value;
    if (persist) write(persist, value);
    host.current.dispatchEvent(new Event("toggle"));
  };

  // A remembered choice wins over the markup.
  useEffect(() => {
    const saved = persist && read(persist);
    if (saved) host.current.collapsed = saved === "collapsed";
  }, []);

  // Collapsed, the links' names are only in their tooltips; the ones added here
  // are taken off again when it expands.
  useEffect(() => {
    if (!aside) return;
    for (const link of host.current.querySelectorAll(LINK)) {
      if (collapsed && !link.hasAttribute("tooltip")) {
        link.setAttribute("tooltip", link.textContent.trim());
        added.add(link);
      } else if (!collapsed && added.has(link)) {
        link.removeAttribute("tooltip");
        added.delete(link);
      }
    }
  }, [collapsed]);

  useEffect(() => {
    if (!shortcut) return;
    const onKey = event => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== shortcut.toLowerCase()) return;
      event.preventDefault();
      set(!host.current.collapsed);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shortcut]);

  if (!aside) return <host />;

  return (
    <host>
      <button
        type="button"
        bx-collapse=""
        aria-controls={idOf(aside, "bx-sidebar")}
        aria-expanded={String(!collapsed)}
        aria-label={collapsed ? labels.expandSidebar : labels.collapseSidebar}
        tooltip={collapsed ? labels.expandSidebar : labels.collapseSidebar}
        onclick={() => set(!collapsed)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
    </host>
  );
}

export const Sidebar = c(sidebar, {
  props: {
    collapsed: { type: Boolean, reflect: true },
    persist: { type: String },
    shortcut: { type: String },
  },
});

if (!customElements.get("bx-sidebar")) customElements.define("bx-sidebar", Sidebar);
