// <bx-sidebar>: a sidebar that collapses to its icons, and on a phone becomes a
// drawer.
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
// At 600px wide and below (BerlinX's phone breakpoint) the sidebar leaves the
// layout: a menu button stands in its place and opens it as a drawer from the
// start edge. Tapping outside, Escape or choosing a link closes it.
//
// Attributes: collapsed (set or read to change it), persist="name" to remember
// the choice in this browser, shortcut="b" for Ctrl+B or ⌘B, which opens the
// drawer on a phone. A `toggle` event fires when the person collapses or expands
// it.

import { c, useEffect, useHost, useRef, useUpdate } from "atomico";
import { useLabels } from "./use-labels.js";
import { idOf } from "./shared.js";
import "./tooltips.js";

const PHONE = "(max-width: 600px)";
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

const icon = path => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d={path} />
  </svg>
);

function sidebar({ collapsed, persist, shortcut }) {
  const host = useHost();
  const update = useUpdate();
  const labels = useLabels();
  const added = useRef(new Set()).current;
  const state = useRef({ open: false }).current;
  const phone = useRef(matchMedia(PHONE)).current;
  const aside = host.current.querySelector(":scope > aside");
  const drawer = phone.matches;

  const set = value => {
    if (host.current.collapsed === value) return;
    host.current.collapsed = value;
    if (persist) write(persist, value);
    host.current.dispatchEvent(new Event("toggle"));
  };

  // A remembered choice wins over the markup, and is put back at once rather
  // than animated as the page loads.
  useEffect(() => {
    const saved = persist && read(persist);
    if (!saved) return;
    host.current.setAttribute("bx-still", "");
    host.current.collapsed = saved === "collapsed";
    requestAnimationFrame(() => requestAnimationFrame(() => host.current.removeAttribute("bx-still")));
  }, []);

  // On a phone the aside is a popover in the top layer; elsewhere it is not.
  useEffect(() => {
    if (!aside) return;
    const onChange = () => update();
    const onClick = event => {
      if (event.target.closest("nav :is(a, button)") && aside.matches(":popover-open")) aside.hidePopover();
    };
    const onToggle = event => {
      state.open = event.newState === "open";
      update();
      if (!state.open) return;
      aside.querySelector("nav [aria-current]:not([aria-current='false']), nav :is(a, button)")?.focus({ preventScroll: true });
    };
    phone.addEventListener("change", onChange);
    aside.addEventListener("click", onClick);
    aside.addEventListener("toggle", onToggle);
    return () => {
      phone.removeEventListener("change", onChange);
      aside.removeEventListener("click", onClick);
      aside.removeEventListener("toggle", onToggle);
    };
  }, []);

  useEffect(() => {
    if (!aside) return;
    host.current.toggleAttribute("bx-drawer", drawer);
    if (drawer) {
      aside.popover = "auto";
    } else if (aside.hasAttribute("popover")) {
      if (aside.matches(":popover-open")) aside.hidePopover();
      aside.removeAttribute("popover");
    }
  }, [drawer]);

  // Collapsed, the links' names are only in their tooltips; the ones added here
  // are taken off again when it expands or becomes a drawer.
  useEffect(() => {
    if (!aside) return;
    for (const link of host.current.querySelectorAll(LINK)) {
      if (collapsed && !drawer && !link.hasAttribute("tooltip")) {
        link.setAttribute("tooltip", link.textContent.trim());
        added.add(link);
      } else if ((!collapsed || drawer) && added.has(link)) {
        link.removeAttribute("tooltip");
        added.delete(link);
      }
    }
  }, [collapsed, drawer]);

  useEffect(() => {
    if (!shortcut || !aside) return;
    const onKey = event => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== shortcut.toLowerCase()) return;
      event.preventDefault();
      if (phone.matches) aside.togglePopover();
      else set(!host.current.collapsed);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shortcut]);

  if (!aside) return <host />;
  const id = idOf(aside, "bx-sidebar");

  return (
    <host>
      {drawer ? (
        <button type="button" icon="" ghost="" bx-menu="" popovertarget={id} aria-expanded={String(state.open)} aria-label={labels.openSidebar}>
          {icon("M4 6h16M4 12h16M4 18h16")}
        </button>
      ) : (
        <button
          type="button"
          bx-collapse=""
          aria-controls={id}
          aria-expanded={String(!collapsed)}
          aria-label={collapsed ? labels.expandSidebar : labels.collapseSidebar}
          tooltip={collapsed ? labels.expandSidebar : labels.collapseSidebar}
          onclick={() => set(!collapsed)}
        >
          {icon("m15 18-6-6 6-6")}
        </button>
      )}
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
