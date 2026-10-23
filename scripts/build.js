// npm run build
//
// 1. dist/berlinx.css and dist/berlinx.min.css from css/berlinx.css.
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

const css = read("css/berlinx.css").replace(/^\/\*! BerlinX v\S+/, `/*! BerlinX v${pkg.version}`);
write("dist/berlinx.css", css);
write("dist/berlinx.min.css", `${transform({ filename: "berlinx.css", code: Buffer.from(css), minify: true }).code.toString().trim()}\n`);

// --- Elements ----------------------------------------------------------------

// Atomico is bundled once, into atomico.js, which every element imports. Left to
// esbuild's code splitting it would be cut up and its internal circular imports
// run out of order.
const elements = ["index", "combobox", "confirm", "context-menu", "data-table", "date-picker", "dropdown", "toast"];
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
  entryPoints: elements.map(name => ({ in: `elements/${name}${["index", "confirm", "toast"].includes(name) ? ".js" : ".jsx"}`, out: name })),
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
for (const name of ["index", "confirm", "toast"]) write(`dist/elements/${name}.d.ts`, read(`elements/${name}.d.ts`));
// --- Guides ------------------------------------------------------------------

// The Elements page runs its live examples, and wires its demo buttons here.
const elementsDemo = `
      import { confirm, toast } from "./dist/elements/index.js";
      const demos = {
        toast: () => toast({ title: "Invoice sent", message: "Ada will get it in a minute.", variant: "success" }),
        "toast-undo": () => toast({ message: "Client archived", action: { label: "Undo", onClick: () => toast("Client restored") } }),
        "toast-error": () => toast({ title: "Payment failed", message: "The card was declined.", variant: "error" }),
        confirm: async () => (await confirm({ title: "Send invoice #1024?", message: "Ada will get it by email.", confirm: "Send" })) && toast("Invoice sent"),
        "confirm-delete": async () =>
          (await confirm({ title: "Delete invoice #1024?", message: "This cannot be undone.", confirm: "Delete", destructive: true })) && toast("Invoice deleted"),
      };
      document.addEventListener("click", event => demos[event.target.closest("[data-demo]")?.dataset.demo]?.());`;

const pages = [
  { source: "docs/guide.md", out: "guide.html", title: "Usage guide" },
  { source: "docs/elements.md", out: "elements.html", title: "Elements", script: elementsDemo },
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
    <link rel="stylesheet" href="dist/berlinx.min.css" />
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
    </script>
  </body>
</html>
`);
}
