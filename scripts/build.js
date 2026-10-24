// npm run build
//
// 1. dist/berlinx(.min).css from css/berlinx.css, dist/berlinx-elements(.min).css
//    from css/elements.css, and dist/berlinx-material(.min).css from css/material.css.
// 2. dist/elements/ from elements/: one ES module per element, plus index.js
//    with all of them. Atomico is bundled into a shared chunk, so the files run
//    straight from a CDN as well as through a bundler.
// 3. The demo site: the Elements' sections of index.html from docs/elements.md,
//    then guide.html and cheatsheet.html from docs/*.md in index.html's frame.

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
// --- Demo site ---------------------------------------------------------------

// index.html is the demo, and the frame for the rest of the site. Two regions of
// it are written here: the Elements, from docs/elements.md, live examples and
// all, and their links in the menu. The guide and the cheatsheet are then that
// same frame, toolbar and menu, around their own Markdown, so assets/site.js can
// move between the three in place. elements.html only forwards old links.

const docs = [
  { source: "docs/elements.md", out: "index.html" },
  { source: "docs/guide.md", out: "guide.html", title: "Usage guide", label: "Guide", description: "How to use BerlinX: installation, the attribute vocabulary, layout, components, theming and the Material skin." },
  { source: "docs/cheatsheet.md", out: "cheatsheet.html", title: "Cheatsheet", label: "Cheatsheet", description: "Every BerlinX attribute, value and custom property on one page." },
];
const github = "https://github.com/southernutahsoftware/BerlinX/blob/main/";
const slug = text => text.replace(/<[^>]+>|&\w+;/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const plain = html => html.replace(/<[^>]+>/g, "");
// A replacement the frame must take exactly once, or the build stops.
const once = (text, pattern, replacement) => {
  const count = text.match(new RegExp(pattern.source, `${pattern.flags.replace("g", "")}g`))?.length ?? 0;
  if (count !== 1) throw new Error(`Expected one match for ${pattern}, found ${count}`);
  return text.replace(pattern, replacement);
};

const ELEMENTS = /(<!-- elements:start -->)[\s\S]*?(\n *<!-- elements:end -->)/;
const ELEMENTS_NAV = /(<!-- elements-nav:start -->)[\s\S]*?(\n *<!-- elements-nav:end -->)/;
let demo = read("index.html");

// The Elements share a page with the components, so a heading that would take
// an id the page already has, such as Select or Tabs, gets "-element" added.
const taken = new Set([...demo.replace(ELEMENTS, "$1$2").matchAll(/\sid="([^"]+)"/g)].map(match => match[1]));

for (const doc of docs) {
  doc.html = marked.parse(read(doc.source));
  doc.ids = new Map();
  const used = doc.out === "index.html" ? taken : new Set();
  for (const [, , text] of doc.html.matchAll(/<h([1-4])>([\s\S]*?)<\/h\1>/g)) {
    const base = slug(text);
    let id = used.has(base) ? `${base}-element` : base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    if (!doc.ids.has(base)) doc.ids.set(base, id);
  }
}

// Links between the docs point at their pages, and their sections' ids there;
// any other repository file points at GitHub, since the site only serves the demo.
function link(href, from) {
  if (/^[a-z]+:/.test(href)) return href;
  if (href.startsWith("#")) return `#${from.ids.get(href.slice(1)) ?? href.slice(1)}`;
  const [file, hash = ""] = href.split("#");
  const target = path.posix.normalize(path.posix.join("docs", file));
  const doc = docs.find(d => d.source === target);
  if (!doc) return github + target + (hash && `#${hash}`);
  // The Elements open at their overview, not the top of the demo.
  const section = hash ? doc.ids.get(hash) ?? hash : doc === docs[0] && "elements";
  return (doc === from ? "" : doc.out) + (section ? `#${section}` : "");
}

// A doc in sections: the part before the first <h2> is its introduction, and
// each <h2> opens a <section> that carries its id, as the demo's own do.
function sections(doc) {
  const ids = [...doc.ids.values()];
  let next = 0;
  const html = doc.html
    .replace(/<h([1-4])>([\s\S]*?)<\/h\1>/g, (_, level, text) => `<h${level} id="${ids[next++]}">${text}</h${level}>`)
    // Wide tables and code scroll on their own; keyboard users can reach them.
    .replace(/<table>/g, '<div responsive tabindex="0" role="region" aria-label="Table"><table>')
    .replace(/<\/table>/g, "</table></div>")
    .replace(/<pre><code/g, '<pre><code tabindex="0"')
    .replace(/href="([^"]+)"/g, (_, href) => `href="${link(href, doc)}"`)
    .trim();
  const [intro, ...parts] = html.split(/\n?(?=<h2 id=")/);
  const [, title = "", lead = intro] = intro.match(/^<h1 id="[^"]*">([\s\S]*?)<\/h1>\n?([\s\S]*)$/) ?? [];
  return {
    title,
    lead: lead.trim(),
    sections: parts.map(part => {
      const [, id, heading, body] = part.match(/^<h2 id="([^"]+)">([\s\S]*?)<\/h2>\n?([\s\S]*)$/);
      return { id, heading, html: `      <section id="${id}" doc>\n<h2>${heading}</h2>\n${body.trim()}\n      </section>` };
    }),
  };
}
const navLinks = list => list.map(s => `          <a href="#${s.id}">${plain(s.heading)}</a>`).join("\n");
const rule = "\n\n      <hr />\n\n";

// The Elements, in the demo.
const elementDocs = sections(docs[0]);
const overview = `      <section id="elements" doc>\n<h2>${elementDocs.title}</h2>\n${elementDocs.lead}\n      </section>`;
demo = once(demo, ELEMENTS, (_, start, end) => `${start}\n${[overview, ...elementDocs.sections.map(s => s.html)].join(rule)}${rule.trimEnd()}${end}`);
demo = once(demo, ELEMENTS_NAV, (_, start, end) =>
  `${start}\n          <small>Elements</small>\n          <a href="#elements">Overview</a>\n${navLinks(elementDocs.sections)}${end}`);
write("index.html", demo);

// The guide and the cheatsheet, in the same frame.
const footer = demo.match(/\n {6}<footer>[\s\S]*?<\/footer>\n/)[0];
for (const doc of docs.slice(1)) {
  const { title, lead, sections: parts } = sections(doc);
  const intro = `      <section id="introduction" doc-intro>
        <div id="introMeta" row gap-m items="center"><span>${doc.title}</span><span badge outline>v${pkg.version}</span></div>
        <h1>${title}</h1>
${lead}
      </section>`;
  let page = demo;
  page = once(page, /<!doctype html>\n/, `<!doctype html>\n<!-- Generated from ${doc.source}, in the frame of index.html, by npm run build. Edit those instead. -->\n`);
  page = once(page, /<title>[^<]*<\/title>/, `<title>BerlinX — ${doc.title}</title>`);
  page = once(page, /(<meta name="description" content=")[^"]*/, `$1${doc.description}`);
  page = once(page, /(<small id="pageLabel" muted>)[^<]*/, `$1${doc.title}`);
  page = once(page, /(<nav id="siteNav"[^>]*>)([\s\S]*?)(<\/nav>)/, (_, open, links, close) =>
    open + links.replace(/ aria-current="page"/g, "").replace(`href="${doc.out}"`, `href="${doc.out}" aria-current="page"`) + close);
  page = once(page, /(<nav id="pageNav"[^>]*>\n)[\s\S]*?(\n *<\/nav>)/, (_, open, close) =>
    `${open}          <small>${doc.title}</small>\n          <a href="#introduction">Overview</a>\n${navLinks(parts)}${close}`);
  page = once(page, /(<main id="main" tabindex="-1">\n)[\s\S]*(\n {4}<\/main>)/, (_, open, close) =>
    `${open}${[intro, ...parts.map(s => s.html)].join(rule)}${rule.trimEnd()}\n${footer.replace(/^\n|\n$/g, "")}${close}`);
  write(doc.out, page);
}

// elements.html was the Elements' own page. Links to it still land on the right
// section, now on the demo, under the id it has there.
const moved = Object.fromEntries([...docs[0].ids].filter(([from, to]) => from !== to));
write("elements.html", `<!doctype html>
<!-- Generated by npm run build. The Elements are on the demo page; this forwards links to their old page. -->
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>BerlinX Elements</title>
    <link rel="canonical" href="index.html#elements" />
    <script>
      const moved = ${JSON.stringify(moved)};
      const id = decodeURIComponent(location.hash.slice(1));
      location.replace("index.html#" + (moved[id] ?? (id || "elements")));
    </script>
    <meta http-equiv="refresh" content="0; url=index.html#elements" />
  </head>
  <body>
    <p><a href="index.html#elements">The Elements are on the demo page.</a></p>
  </body>
</html>
`);
