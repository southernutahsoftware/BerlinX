// The demo site's script, shared by index.html, guide.html and cheatsheet.html.
//
// The three pages share one frame: the toolbar, and the menu with the site's
// pages above this page's contents. This script switches the theme and the
// Material skin, opens the menu as a drawer on a phone, follows the reader
// through the page in the menu, and moves between the pages in place: the new
// page's <main> and contents replace the old, the URL and history follow, and
// the frame stays put. Every page is ordinary HTML, so without this script each
// link simply loads its page.
//
// It also runs the live examples: the Elements, and the few component samples
// that need a line of script.
//
// It is a classic script, so a page opened from disk, where browsers will not
// load modules, still gets its theme, menu and links. Only the Elements, a
// module, need the page served.

(() => {
  "use strict";

  const elements = import("../dist/elements/index.js");
  const menu = document.getElementById("menu");
  const siteNav = document.getElementById("siteNav");
  const phone = matchMedia("(max-width: 800px)");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

  // --- Theme and skin ------------------------------------------------------------

  // The library follows the system theme; this pins one with theme="…".
  const themeToggles = document.querySelectorAll("[data-theme-toggle]");
  const systemDark = matchMedia("(prefers-color-scheme: dark)");
  const isDark = () => {
    const theme = document.documentElement.getAttribute("theme");
    return theme ? theme === "dark" : systemDark.matches;
  };
  const syncThemeToggles = () => themeToggles.forEach(button => button.setAttribute("aria-pressed", String(isDark())));
  themeToggles.forEach(button =>
    button.addEventListener("click", () => {
      const theme = isDark() ? "light" : "dark";
      document.documentElement.setAttribute("theme", theme);
      try {
        localStorage.setItem("berlinx-theme", theme);
      } catch {}
      syncThemeToggles();
    }),
  );
  systemDark.addEventListener("change", syncThemeToggles);
  syncThemeToggles();

  // The Material skin is one more stylesheet, enabled or not.
  const skin = document.getElementById("skin");
  const skinToggles = document.querySelectorAll("[data-skin-toggle]");
  const syncSkinToggles = () => skinToggles.forEach(button => button.setAttribute("aria-pressed", String(!skin.disabled)));
  skinToggles.forEach(button =>
    button.addEventListener("click", () => {
      skin.disabled = !skin.disabled;
      try {
        localStorage.setItem("berlinx-skin", skin.disabled ? "" : "material");
      } catch {}
      syncSkinToggles();
    }),
  );
  syncSkinToggles();

  // --- Menu ----------------------------------------------------------------------

  // A regular sidebar on a wide screen; a native, dismissible popover on a phone.
  function syncMenu() {
    if (menu.matches(":popover-open")) menu.hidePopover();
    if (phone.matches) menu.setAttribute("popover", "auto");
    else menu.removeAttribute("popover");
  }
  phone.addEventListener("change", syncMenu);
  syncMenu();

  menu.addEventListener("click", event => {
    if (event.target.closest("a") && menu.matches(":popover-open")) menu.hidePopover();
  });

  // The contents link to the section in view is marked, and kept in sight in a
  // long menu.
  function setCurrentSection(hash) {
    const nav = document.getElementById("pageNav");
    let current;
    for (const link of nav.querySelectorAll(":scope > a")) {
      const match = link.getAttribute("href") === hash;
      if (match) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
      if (match) current = link;
    }
    if (!current || !nav.getClientRects().length) return;
    const box = nav.getBoundingClientRect();
    const item = current.getBoundingClientRect();
    if (item.top < box.top || item.bottom > box.bottom) nav.scrollTop += item.top - box.top - (box.height - item.height) / 2;
  }

  function markCurrentSection() {
    const target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    const section = target?.closest("main > section");
    setCurrentSection(`#${section?.id ?? "introduction"}`);
  }

  let scrollPending = false;
  let scrollSaved;
  addEventListener(
    "scroll",
    () => {
      // Where the reader was, for back and forward, once the scrolling stops:
      // Safari refuses more than a hundred history writes in ten seconds.
      clearTimeout(scrollSaved);
      scrollSaved = setTimeout(() => history.replaceState({ ...history.state, scroll: scrollY }, ""), 200);
      if (scrollPending) return;
      scrollPending = true;
      requestAnimationFrame(() => {
        scrollPending = false;
        const threshold = phone.matches ? 100 : 48;
        const sections = document.querySelectorAll("main > section[id]");
        const current = [...sections].filter(section => section.getBoundingClientRect().top <= threshold).at(-1);
        if (current) setCurrentSection(`#${current.id}`);
      });
    },
    { passive: true },
  );

  // --- Moving between pages --------------------------------------------------------

  // A page is known by its path, whichever form the server gives it: /, /index.html,
  // /guide and /guide.html.
  const pageKey = pathname => pathname.replace(/(^|\/)index\.html$/, "$1").replace(/\.html$/, "");
  const sitePages = new Set([...siteNav.querySelectorAll("a")].map(link => pageKey(link.pathname)));
  const isSitePage = url => url.origin === location.origin && sitePages.has(pageKey(url.pathname));

  const cache = new Map();
  function load(url) {
    const key = pageKey(url.pathname);
    if (!cache.has(key)) {
      const page = fetch(url.pathname)
        .then(response => {
          if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) throw new Error(response.statusText);
          return Promise.all([response.url, response.text()]);
        })
        .then(([address, html]) => {
          const doc = new DOMParser().parseFromString(html, "text/html");
          const main = doc.querySelector("main");
          const nav = doc.getElementById("pageNav");
          if (!main || !nav) throw new Error("Not a page of this site");
          return {
            url: new URL(address).pathname,
            title: doc.title,
            description: doc.querySelector('meta[name="description"]')?.content ?? "",
            label: doc.getElementById("pageLabel")?.textContent ?? "",
            nav: nav.innerHTML,
            main,
          };
        });
      page.catch(() => cache.delete(key));
      cache.set(key, page);
    }
    return cache.get(key);
  }

  let navigation = 0;
  async function go(url, { push = true } = {}) {
    const id = ++navigation;
    let page;
    try {
      page = await load(url);
    } catch {
      location.assign(url);
      return;
    }
    if (id !== navigation) return;
    if (push) history.pushState({ scroll: null }, "", page.url + url.hash);
    const scroll = push ? null : history.state?.scroll;
    const swap = () => render(page, url.hash, scroll);
    if (document.startViewTransition && !reduceMotion.matches) document.startViewTransition(swap);
    else swap();
  }

  function render(page, hash, scroll) {
    document.title = page.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", page.description);
    document.getElementById("pageLabel").textContent = page.label;
    document.getElementById("pageNav").innerHTML = page.nav;
    document.getElementById("pageNav").scrollTop = 0;
    const main = document.importNode(page.main, true);
    document.querySelector("main").replaceWith(main);
    for (const link of siteNav.querySelectorAll("a")) {
      if (pageKey(link.pathname) === pageKey(location.pathname)) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
    if (menu.matches(":popover-open")) menu.hidePopover();
    setUpPage();

    if (scroll != null) scrollTo(0, scroll);
    else if (hash) holdInView(document.getElementById(decodeURIComponent(hash.slice(1))));
    else scrollTo(0, 0);
    // Focus moves into the new page, as it would on a load, without scrolling.
    main.focus({ preventScroll: true });
    markCurrentSection();
  }

  function holdInView(target) {
    if (!target) return;
    target.scrollIntoView();
    const keep = new ResizeObserver(() => target.scrollIntoView());
    keep.observe(document.querySelector("main"));
    const events = ["wheel", "touchstart", "pointerdown", "keydown"];
    const release = () => {
      keep.disconnect();
      clearTimeout(timer);
      for (const type of events) removeEventListener(type, release, true);
    };
    const timer = setTimeout(release, 3000);
    for (const type of events) addEventListener(type, release, { capture: true, passive: true });
  }

  // Scrolling is the script's job across pages, so the browser leaves it alone.
  history.scrollRestoration = "manual";
  if (history.state?.scroll != null) scrollTo(0, history.state.scroll);

  document.addEventListener("click", event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest("a[href]");
    if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
    const url = new URL(link.href);
    if (!isSitePage(url)) return;
    if (pageKey(url.pathname) !== pageKey(location.pathname)) {
      event.preventDefault();
      go(url);
    } else if (url.hash) {
      // A section of this page, perhaps by another name, such as index.html#form
      // from /: a jump within it, never a reload.
      if (url.pathname === location.pathname) return;
      event.preventDefault();
      location.hash = url.hash;
    } else {
      // The page's own link, such as the brand: back to the top, not a reload.
      event.preventDefault();
      if (location.hash) history.pushState({ scroll: null }, "", location.pathname);
      scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
    }
  });

  addEventListener("popstate", event => {
    if (pageKey(location.pathname) !== document.body.dataset.page) {
      go(new URL(location.href), { push: false });
      return;
    }
    const target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    if (event.state?.scroll != null) scrollTo(0, event.state.scroll);
    else if (target) target.scrollIntoView();
    else if (!location.hash) scrollTo(0, 0);
  });

  // Pages load ahead of the click, when the pointer or focus reaches a link.
  const prefetch = event => {
    const link = event.target.closest?.("a[href]");
    if (!link) return;
    const url = new URL(link.href);
    if (isSitePage(url) && pageKey(url.pathname) !== pageKey(location.pathname)) load(url).catch(() => {});
  };
  document.addEventListener("pointerover", prefetch);
  document.addEventListener("focusin", prefetch);

  addEventListener("hashchange", () => {
    markCurrentSection();
    markNavigationTab();
  });

  // --- The page's live examples --------------------------------------------------------

  // Safari does not focus buttons on pointer clicks. Establish an invoker so
  // native dialog dismissal restores focus consistently in every engine.
  window.openDialog = (id, invoker) => {
    invoker.focus({ preventScroll: true });
    document.getElementById(id).showModal();
  };

  // Copy the installation markup.
  window.copyCode = async (id, button) => {
    const block = document.getElementById(id);
    const status = document.getElementById("copyStatus");
    try {
      await navigator.clipboard.writeText((block.querySelector("code")?.textContent || block.textContent).trim());
      button.textContent = "Copied!";
      button.classList.add("copied");
      status.textContent = "Stylesheet markup copied to clipboard.";
      setTimeout(() => {
        button.textContent = "Copy";
        button.classList.remove("copied");
      }, 1500);
    } catch {
      getSelection().selectAllChildren(block.querySelector("code"));
      status.removeAttribute("visually-hidden");
      status.textContent = "Clipboard unavailable. The markup is selected; use your device’s copy command.";
    }
  };

  // Every code sample in the guides gets a copy button. It is added here, so a
  // page without the script has no button that does nothing.
  function addCopyButtons() {
    for (const pre of document.querySelectorAll("main pre:not([data-copy])")) {
      pre.dataset.copy = "";
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("mini-button", "");
      button.setAttribute("copy-code", "");
      button.textContent = "Copy";
      button.setAttribute("aria-label", "Copy code");
      const frame = document.createElement("div");
      frame.setAttribute("code-block", "");
      pre.replaceWith(frame);
      frame.append(pre, button);
    }
  }

  document.addEventListener("click", async event => {
    const button = event.target.closest("[copy-code]");
    if (!button) return;
    const code = button.parentElement.querySelector("code");
    try {
      await navigator.clipboard.writeText(code.textContent.replace(/\n$/, ""));
      button.textContent = "Copied!";
    } catch {
      getSelection().selectAllChildren(code);
      button.textContent = "Selected";
    }
    button.classList.add("copied");
    setTimeout(() => {
      button.textContent = "Copy";
      button.classList.remove("copied");
    }, 1500);
  });

  // The samples stay local; native validation and reset still work normally.
  const formStatus = {
    newsletterForm: ["newsletterStatus", "Thanks for trying the preview. No subscription has been created."],
    sampleForm: ["sampleFormStatus", "Form validated. This preview does not send or store your data."],
    validationForm: ["validationResult"],
  };
  document.addEventListener("submit", event => {
    const form = event.target;
    if (!form.closest("main")) return;
    event.preventDefault();
    const [id, text] = formStatus[form.id] ?? [];
    const status = id && document.getElementById(id);
    if (status) {
      status.hidden = false;
      if (text) status.textContent = text;
    }
    if (form.id === "clientForm") document.getElementById("clientStatus").textContent = "Changes saved for this preview";
  });
  for (const type of ["input", "reset"]) {
    document.addEventListener(type, event => {
      const form = event.target.closest?.("form");
      if (!form) return;
      const [id] = formStatus[form.id] ?? [];
      if (id) document.getElementById(id).hidden = true;
      if (form.id === "clientForm") document.getElementById("clientStatus").textContent = type === "input" ? "Unsaved changes" : "All changes saved";
    });
  }

  // Only the pagination sample's data needs scripting; pagination itself is CSS.
  const pageNames = ["Ada Lovelace", "Grace Hopper", "Katherine Johnson"];
  document.addEventListener("click", event => {
    const link = event.target.closest("#paginationExample :is(a, button)[data-page]");
    if (!link) return;
    event.preventDefault();
    const page = Number(link.dataset.page);
    if (page < 1 || page > pageNames.length) return;
    for (const item of document.querySelectorAll("#paginationExample a")) {
      if (Number(item.dataset.page) === page) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    }
    const previous = document.getElementById("previousPage");
    previous.disabled = page === 1;
    previous.dataset.page = String(page - 1);
    document.getElementById("pageExample").textContent = `Page ${page} of 3 · ${pageNames[page - 1]}`;
  });

  function markNavigationTab() {
    const links = [...document.querySelectorAll("#navigationTabs a")];
    if (!links.some(link => link.hash === location.hash)) return;
    for (const link of links) {
      if (link.hash === location.hash) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
  }

  // The Elements' buttons.
  const demos = {
    toast: ({ toast }) => toast({ title: "Invoice sent", message: "Ada will get it in a minute.", variant: "success" }),
    "toast-undo": ({ toast }) => toast({ message: "Client archived", action: { label: "Undo", onClick: () => toast("Client restored") } }),
    "toast-error": ({ toast }) => toast({ title: "Payment failed", message: "The card was declined.", variant: "error" }),
    confirm: async ({ confirm, toast }) =>
      (await confirm({ title: "Send invoice #1024?", message: "Ada will get it by email.", confirm: "Send" })) && toast("Invoice sent"),
    command: () => document.getElementById("demo-command").show(),
    "command-new": ({ toast }) => toast("New invoice started"),
    "command-export": ({ toast }) => toast("Exported 6 invoices"),
    "confirm-delete": async ({ confirm, toast }) =>
      (await confirm({ title: "Delete invoice #1024?", message: "This cannot be undone.", confirm: "Delete", destructive: true })) &&
      toast("Invoice deleted"),
  };
  document.addEventListener("click", async event => {
    const demo = demos[event.target.closest("[data-demo]")?.dataset.demo];
    if (demo) demo(await elements);
  });

  // A fake server for the remote examples: 48 clients, answered after a delay.
  const first = ["Ada", "Alan", "Barbara", "Claude", "Donald", "Edsger", "Frances", "Grace", "Hedy", "John", "Katherine", "Linus"];
  const last = ["Hopper", "Kay", "Knuth", "Lamport", "Liskov", "Lovelace", "Shannon", "Turing"];
  const cities = ["Berlin", "Lisbon", "Oslo", "Vienna", "Zürich"];
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const clients = Array.from({ length: 48 }, (_, i) => ({
    id: i + 1,
    client: `${first[i % 12]} ${last[(i + Math.floor(i / 12)) % 8]}`,
    city: cities[(i * 3) % cities.length],
    invoices: ((i * 7) % 23) + 1,
    total: ((i * 7919) % 40000) + 500,
  }));
  const wait = (signal, ms = 350) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      signal.addEventListener("abort", () => (clearTimeout(timer), reject(signal.reason)));
    });
  const matching = query => clients.filter(c => !query || `${c.client} ${c.city}`.toLowerCase().includes(query.toLowerCase()));

  async function loadClients({ page, pageSize, sort, order, query, signal }) {
    await wait(signal);
    let rows = matching(query);
    if (sort) rows = [...rows].sort((a, b) => (a[sort] > b[sort] ? 1 : a[sort] < b[sort] ? -1 : 0) * (order === "desc" ? -1 : 1));
    const from = (page - 1) * pageSize;
    return { rows: rows.slice(from, from + pageSize).map(c => ({ ...c, total: money.format(c.total) })), total: rows.length };
  }

  async function searchClients(query, { signal }) {
    await wait(signal, 250);
    return matching(query).slice(0, 8).map(c => ({ value: String(c.id), label: c.client }));
  }

  // --- Each page, as it arrives --------------------------------------------------------

  function setUpPage() {
    document.body.dataset.page = pageKey(location.pathname);
    addCopyButtons();
    markNavigationTab();
    // Set once the elements are defined, so the property reaches the element's
    // own, rather than shadowing it on the plain element before the upgrade.
    elements.then(() => {
      const remote = document.getElementById("demo-remote");
      if (remote) remote.load = loadClients;
      const client = document.getElementById("demo-client");
      if (client) client.load = searchClients;
    }, () => {});
  }

  setUpPage();
  markCurrentSection();
  // A page that has just opened at a section is still settling: copy buttons
  // go in, elements draw themselves, the font arrives, remote rows load, and the
  // section moves. It is held in view while <main> changes size, until the
  // reader scrolls, taps or types, or a few seconds pass.
  if (location.hash && history.state?.scroll == null) holdInView(document.getElementById(decodeURIComponent(location.hash.slice(1))));
})();
