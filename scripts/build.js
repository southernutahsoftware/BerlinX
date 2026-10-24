// npm run build
//
// 1. dist/berlinx(.min).css from css/berlinx.css, dist/berlinx-elements(.min).css
//    from css/elements.css, and dist/berlinx-material(.min).css from css/material.css.
// 2. dist/elements/ from elements/: one ES module per element, plus index.js
//    with all of them. Atomico is bundled into a shared chunk, so the files run
//    straight from a CDN as well as through a bundler.
// 3. guide.html, elements.html and cheatsheet.html from docs/*.md, styled with
//    BerlinX itself.

const fs = require("node:fs");
const path = require("node:path");
const { buildSync } = require("esbuild");
const { transform } = require("lightningcss");
const { marked } = require("marked");

const root = path.resolve(__dirname, "..");
const pkg = require("../package.json");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const write = (file, content) => {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), content);
  console.log(`${file}  ${(Buffer.byteLength(content) / 1024).toFixed(1)} KB`);
};

// --- Stylesheets -------------------------------------------------------------

for (const [source, out] of [["css/berlinx.css", "berlinx"], ["css/elements.css", "berlinx-elements"], ["css/material.css", "berlinx-material"]]) {
  const css = read(source).replace(/^\/\*! BerlinX ((?:Elements |Material )?)v\S+/, (_, name) => `/*! BerlinX ${name}v${pkg.version}`);
  write(`dist/${out}.css`, css);
  write(`dist/${out}.min.css`, `${transform({ filename: `${out}.css`, code: Buffer.from(css), minify: true }).code.toString().trim()}\n`);
}

// --- Elements ----------------------------------------------------------------

// Atomico is bundled once, into atomico.js, which every element imports. Left to
// esbuild's code splitting it would be cut up and its internal circular imports
// run out of order.
// Every module in elements/ is an entry point, berlinx/elements/<name>, except
// the internals the others share.
const internal = ["shared.js", "use-labels.js"];
const elements = fs.readdirSync(path.join(root, "elements")).filter(file => /\.jsx?$/.test(file) && !internal.includes(file));
const options = {
  absWorkingDir: root,
  bundle: true,
  format: "esm",
  minify: !process.env.BX_DEV,
  write: false,
  target: ["chrome114", "edge114", "firefox125", "safari17"],
  legalComments: "none",
  banner: { js: `/*! BerlinX Elements v${pkg.version} | MIT License | Includes Atomico (MIT) and Lucide icons (ISC) */` },
};

fs.rmSync(path.join(root, "dist/elements"), { recursive: true, force: true });
const runtime = buildSync({
  ...options,
  stdin: { contents: 'export { c, useEffect, useHost, useId, useRef, useUpdate } from "atomico"; export { jsx, jsxs, Fragment } from "atomico/jsx-runtime";', resolveDir: root },
  outfile: "dist/elements/atomico.js",
});
const modules = buildSync({
  ...options,
  entryPoints: elements.map(file => ({ in: `elements/${file}`, out: file.replace(/\.jsx?$/, "") })),
  outdir: "dist/elements",
  chunkNames: "[name]-[hash]",
  splitting: true,
  jsx: "automatic",
  jsxImportSource: "atomico",
  external: ["atomico", "atomico/jsx-runtime"],
});
for (const file of [...runtime.outputFiles, ...modules.outputFiles]) {
  write(path.relative(root, file.path), file.text.replace(/(from|import)\s*"atomico(\/jsx-runtime)?"/g, '$1"./atomico.js"'));
}
// Hand-written declarations are copied; every other entry point gets one that
// re-exports its element class from index.d.ts, so each subpath has types.
const declared = fs.readdirSync(path.join(root, "elements")).filter(file => file.endsWith(".d.ts"));
for (const file of declared) write(`dist/elements/${file}`, read(`elements/${file}`));
const index = read("elements/index.d.ts");
for (const file of elements) {
  const name = file.replace(/\.jsx?$/, "");
  if (declared.includes(`${name}.d.ts`)) continue;
  const className = name.replace(/(^|-)(\w)/g, (_, dash, letter) => letter.toUpperCase());
  const exports = index.includes(`class ${className} `) ? `export { ${className} } from "./index.js";` : "export {};";
  write(`dist/elements/${name}.d.ts`, `${exports}\n`);
}
// --- Guides ------------------------------------------------------------------

// The Elements page runs its live examples, and wires its demo buttons here.
const elementsDemo = `
      import { confirm, toast } from "./dist/elements/index.js";
      const demos = {
        toast: () => toast({ title: "Invoice sent", message: "Ada will get it in a minute.", variant: "success" }),
        "toast-undo": () => toast({ message: "Client archived", action: { label: "Undo", onClick: () => toast("Client restored") } }),
        "toast-error": () => toast({ title: "Payment failed", message: "The card was declined.", variant: "error" }),
        confirm: async () => (await confirm({ title: "Send invoice #1024?", message: "Ada will get it by email.", confirm: "Send" })) && toast("Invoice sent"),
        command: () => document.querySelector("#demo-command").show(),
        "command-new": () => toast("New invoice started"),
        "command-export": () => toast("Exported 6 invoices"),
        "confirm-delete": async () =>
          (await confirm({ title: "Delete invoice #1024?", message: "This cannot be undone.", confirm: "Delete", destructive: true })) && toast("Invoice deleted"),
      };
      document.addEventListener("click", event => demos[event.target.closest("[data-demo]")?.dataset.demo]?.());

      // A fake server for the remote examples: 48 clients, answered after a delay.
      const first = ["Ada", "Alan", "Barbara", "Claude", "Donald", "Edsger", "Frances", "Grace", "Hedy", "John", "Katherine", "Linus"];
      const last = ["Hopper", "Kay", "Knuth", "Lamport", "Liskov", "Lovelace", "Shannon", "Turing"];
      const cities = ["Berlin", "Lisbon", "Oslo", "Vienna", "Zürich"];
      const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
      const clients = Array.from({ length: 48 }, (_, i) => ({
        id: i + 1,
        client: \`\${first[i % 12]} \${last[(i + Math.floor(i / 12)) % 8]}\`,
        city: cities[(i * 3) % cities.length],
        invoices: (i * 7) % 23 + 1,
        total: ((i * 7919) % 40000) + 500,
      }));
      const wait = (signal, ms = 350) =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, ms);
          signal.addEventListener("abort", () => (clearTimeout(timer), reject(signal.reason)));
        });
      const matching = query => clients.filter(c => !query || \`\${c.client} \${c.city}\`.toLowerCase().includes(query.toLowerCase()));

      document.querySelector("#demo-remote").load = async ({ page, pageSize, sort, order, query, signal }) => {
        await wait(signal);
        let rows = matching(query);
        if (sort) rows = [...rows].sort((a, b) => (a[sort] > b[sort] ? 1 : a[sort] < b[sort] ? -1 : 0) * (order === "desc" ? -1 : 1));
        const from = (page - 1) * pageSize;
        return { rows: rows.slice(from, from + pageSize).map(c => ({ ...c, total: money.format(c.total) })), total: rows.length };
      };
      document.querySelector("#demo-client").load = async (query, { signal }) => {
        await wait(signal, 250);
        return matching(query).slice(0, 8).map(c => ({ value: String(c.id), label: c.client }));
      };`;

const pages = [
  { source: "docs/guide.md", out: "guide.html", title: "Usage guide" },
  { source: "docs/elements.md", out: "elements.html", title: "Elements", styles: ["dist/berlinx-elements.min.css"], script: elementsDemo },
  { source: "docs/cheatsheet.md", out: "cheatsheet.html", title: "Cheatsheet" },
];
const github = "https://github.com/southernutahsoftware/BerlinX/blob/main/";

// Links between the guides point at their pages; any other repository file
// points at GitHub, since the demo site only serves the demo.
function link(href) {
  if (/^([a-z]+:|#)/.test(href)) return href;
  const [file, hash = ""] = href.split("#");
  const target = path.posix.join("docs", file);
  const page = pages.find(p => p.source === target);
  return page ? page.out + (hash && `#${hash}`) : github + path.posix.normalize(target) + (hash && `#${hash}`);
}

const slug = text => text.replace(/<[^>]+>|&\w+;/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

for (const page of pages) {
  const contents = [];
  const body = marked.parse(read(page.source))
    .replace(/<h([1-4])>([\s\S]*?)<\/h\1>/g, (_, level, text) => {
      const id = slug(text);
      if (level === "2") contents.push(`<a href="#${id}">${text.replace(/<[^>]+>/g, "")}</a>`);
      return `<h${level} id="${id}">${text}</h${level}>`;
    })
    // Wide tables and code scroll on their own; keyboard users can reach them.
    .replace(/<table>/g, '<div responsive tabindex="0" role="region" aria-label="Table"><table>')
    .replace(/<\/table>/g, "</table></div>")
    .replace(/<pre><code/g, '<pre><code tabindex="0"')
    .replace(/href="([^"]+)"/g, (_, href) => `href="${link(href)}"`)
    .replace(/(<\/h1>\n)/, `$1<details>\n<summary>Contents</summary>\n<nav aria-label="Contents" col gap-xs>\n${contents.join("\n")}\n</nav>\n</details>\n`);

  const nav = [{ out: "index.html", title: "Components" }, ...pages]
    .map(p => `<a href="${p.out}"${p === page ? ' aria-current="page"' : ""}>${p.title}</a>`).join("");

  write(page.out, `<!doctype html>
<!-- Generated from ${page.source} by npm run build. Edit the Markdown instead. -->
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>BerlinX ${page.title}</title>
    <meta name="color-scheme" content="light dark" />
    <script>
      try {
        const theme = localStorage.getItem("berlinx-theme");
        if (theme === "light" || theme === "dark") document.documentElement.setAttribute("theme", theme);
      } catch {}
    </script>
    <link rel="icon" href="icon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="dist/berlinx.min.css" />${(page.styles ?? []).map(href => `
    <link rel="stylesheet" href="${href}" />`).join("")}
    <link id="skin" rel="stylesheet" href="dist/berlinx-material.min.css" disabled />
    <script>
      try { if (localStorage.getItem("berlinx-skin") === "material") document.getElementById("skin").disabled = false; } catch {}
    </script>
    <!-- Lucide SVG paths: https://lucide.dev · license: docs/LUCIDE-LICENSE.txt -->
    <style>
      @font-face { font-family: Inter; src: url("assets/fonts/InterVariable.woff2") format("woff2"); font-weight: 100 900; font-display: swap; }
      body { padding: var(--space-l); }
      body > header { margin-bottom: var(--space-l); }
      body > header > a { font-weight: 700; font-size: 1.25rem; text-decoration: none; color: var(--foreground); }
      body > header nav { margin-left: auto; }
      body > header nav a[aria-current] { color: var(--foreground); font-weight: 600; }
      @media (max-width: 600px) { body > header nav { order: 1; width: 100%; } }
      main :where(p, li, td) a { text-decoration: underline; }
      [data-theme-toggle][aria-pressed="true"] > [data-icon="moon"],
      [data-theme-toggle][aria-pressed="false"] > [data-icon="sun"] { display: none; }
    </style>
  </head>
  <body>
    <header row justify="between" items="center" gap-m>
      <a href="index.html">Berlin<span primary>X</span></a>
      <nav aria-label="Documentation" row gap-m>${nav}</nav>
      <button data-skin-toggle icon ghost aria-pressed="false" aria-label="Material skin">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" /><circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" /><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /></svg>
      </button>
      <button data-theme-toggle icon ghost aria-pressed="false" aria-label="Dark theme">
        <svg data-icon="moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
        <svg data-icon="sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2m-7.07-17.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
      </button>
    </header>
    <main>
${body}
    </main>
    <footer><small muted>BerlinX v${pkg.version} · MIT License</small></footer>${page.script ? `
    <script type="module">${page.script}
    </script>` : ""}
    <script>
      const toggle = document.querySelector("[data-theme-toggle]");
      const systemDark = matchMedia("(prefers-color-scheme: dark)");
      const isDark = () => (document.documentElement.getAttribute("theme") || (systemDark.matches ? "dark" : "light")) === "dark";
      const sync = () => toggle.setAttribute("aria-pressed", String(isDark()));
      toggle.addEventListener("click", () => {
        const theme = isDark() ? "light" : "dark";
        document.documentElement.setAttribute("theme", theme);
        try { localStorage.setItem("berlinx-theme", theme); } catch {}
        sync();
      });
      systemDark.addEventListener("change", sync);
      sync();
      const skin = document.getElementById("skin");
      const skinToggle = document.querySelector("[data-skin-toggle]");
      const syncSkin = () => skinToggle.setAttribute("aria-pressed", String(!skin.disabled));
      skinToggle.addEventListener("click", () => {
        skin.disabled = !skin.disabled;
        try { localStorage.setItem("berlinx-skin", skin.disabled ? "" : "material"); } catch {}
        syncSkin();
      });
      syncSkin();
    </script>
  </body>
</html>
`);
}
