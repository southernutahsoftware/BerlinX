// <bx-tabs>: tabs that show one panel at a time.
//
//   <bx-tabs>
//     <nav tabs aria-label="Invoice">
//       <a href="#overview">Overview</a>
//       <a href="#items">Items</a>
//     </nav>
//     <section id="overview">…</section>
//     <section id="items">…</section>
//   </bx-tabs>
//
// Without JavaScript these are links that jump to each section, all of them
// visible. With it the links become tabs and only the chosen panel shows. Each
// link's href, or a button's aria-controls, names its panel.
//
// The chosen panel's id is the `selected` attribute, which can also be set to
// switch tabs; a `change` event fires when the person switches. Arrow keys move
// between tabs and show each one as they go; Home and End go to the ends.

import { c, useEffect, useHost } from "atomico";
import { idOf } from "./shared.js";

const panelId = tab => tab.getAttribute("aria-controls") ?? tab.hash?.slice(1) ?? "";

function tabs({ selected }) {
  const host = useHost();

  const parts = () => {
    const list = host.current.querySelector(":scope > nav, :scope > [tabs]");
    const tabs = [...(list?.querySelectorAll(":scope > a[href^='#'], :scope > button") ?? [])];
    const panels = tabs.map(tab => document.getElementById(panelId(tab)));
    return { list, tabs, panels };
  };

  const show = (id, focus, announce) => {
    const { tabs, panels } = parts();
    const index = Math.max(0, panels.findIndex(panel => panel?.id === id));
    tabs.forEach((tab, i) => {
      const chosen = i === index;
      tab.setAttribute("aria-selected", String(chosen));
      tab.tabIndex = chosen ? 0 : -1;
      if (panels[i]) panels[i].hidden = !chosen;
    });
    if (focus) tabs[index]?.focus();
    const current = panels[index]?.id;
    if (current && host.current.selected !== current) {
      host.current.selected = current;
      if (announce) host.current.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  useEffect(() => {
    const { list, tabs, panels } = parts();
    if (!list || !tabs.length) return;

    // The selected attribute wins, then the address bar, then a tab marked
    // current in the markup, then the first.
    const fromHash = panels.find(panel => panel && `#${panel.id}` === location.hash)?.id;
    const marked = tabs.find(tab => tab.matches("[aria-current]:not([aria-current='false'])"));
    const initial = selected || fromHash || (marked && panelId(marked)) || panels[0]?.id;

    list.setAttribute("role", "tablist");
    tabs.forEach((tab, i) => {
      tab.setAttribute("role", "tab");
      // aria-current would claim the tab is the current page; aria-selected says it.
      tab.removeAttribute("aria-current");
      if (panels[i]) {
        tab.setAttribute("aria-controls", panels[i].id);
        panels[i].setAttribute("role", "tabpanel");
        panels[i].setAttribute("aria-labelledby", idOf(tab, "bx-tab"));
        panels[i].tabIndex = 0;
      }
    });

    show(initial);

    const onClick = event => {
      const tab = event.target.closest("[role=tab]");
      if (!tab || !list.contains(tab)) return;
      event.preventDefault();
      show(panelId(tab), true, true);
    };

    const onKey = event => {
      const { tabs } = parts();
      const index = tabs.indexOf(event.target);
      if (index < 0) return;
      const rtl = getComputedStyle(list).direction === "rtl";
      const steps = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 };
      let next;
      if (event.key in steps) next = (index + steps[event.key] + tabs.length) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else return;
      event.preventDefault();
      show(panelId(tabs[next]), true, true);
    };

    list.addEventListener("click", onClick);
    list.addEventListener("keydown", onKey);
    return () => {
      list.removeEventListener("click", onClick);
      list.removeEventListener("keydown", onKey);
    };
  }, []);

  // Set from outside: <bx-tabs selected="items"> or tabs.selected = "items".
  useEffect(() => {
    if (selected) show(selected);
  }, [selected]);

  return <host />;
}

export const Tabs = c(tabs, {
  props: {
    selected: { type: String, reflect: true },
  },
});

if (!customElements.get("bx-tabs")) customElements.define("bx-tabs", Tabs);
