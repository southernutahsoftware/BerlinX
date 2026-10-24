// axe-core scans of every element, closed and open, in both themes, with and
// without the Material skin.
const { test, expect } = require("@playwright/test");
const { default: AxeBuilder } = require("@axe-core/playwright");

const states = {
  closed: async () => {},
  dropdown: async page => {
    await page.getByRole("button", { name: "Actions" }).click();
    await page.keyboard.press("ArrowDown");
  },
  "context menu": page => page.locator("#contextArea").click({ button: "right" }),
  combobox: async page => {
    await page.locator("#country").fill("a");
    await page.keyboard.press("ArrowDown");
  },
  "date picker": page => page.locator("bx-date-picker [aria-haspopup]").first().click(),
  "data table": async page => {
    await page.getByRole("button", { name: "Total" }).click();
    await page.getByRole("checkbox", { name: "Select Grace" }).check();
  },
  "multi-select": async page => {
    await page.locator("bx-multi-select [role=combobox]").click();
    await page.keyboard.press("ArrowDown");
  },
  select: async page => {
    await page.locator("#status [role=combobox]").click();
    await page.keyboard.press("ArrowDown");
  },
  "command palette": async page => {
    await page.keyboard.press("Control+k");
    await page.keyboard.press("ArrowDown");
  },
  "date range": async page => {
    await page.locator("#stay [aria-haspopup]").click();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowRight");
  },
  "tabs, tree and tooltip": async page => {
    await page.getByRole("tab", { name: "History" }).click();
    await page.locator("#tree summary").nth(1).click();
    await page.locator("#tipArchive").hover();
  },
  "collapsed sidebar": async page => {
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await page.getByRole("link", { name: "Clients" }).hover();
  },
  "toasts and confirm": page =>
    page.evaluate(async () => {
      const { toast, confirm } = await import("/dist/elements/index.js");
      toast({ title: "Saved", message: "Invoice sent", variant: "success", duration: 0 });
      toast({ message: "Failed", variant: "error", duration: 0, action: { label: "Retry" } });
      confirm({ title: "Delete?", message: "This cannot be undone.", destructive: true });
      await new Promise(resolve => setTimeout(resolve, 300));
    }),
};

// Each state is scanned plain and again with the Material skin loaded over it.
for (const skin of [null, "material"]) {
  for (const scheme of ["light", "dark"]) {
    for (const [name, open] of Object.entries(states)) {
      test(`${name}, ${scheme}${skin ? `, ${skin}` : ""}`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
        await page.goto("/tests/elements.html");
        if (skin) await page.addStyleTag({ url: `/dist/berlinx-${skin}.css` });
        await page.waitForFunction(() => document.querySelector("[bx-sort]"));
        await open(page);
        await page.waitForTimeout(250);
        const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
        expect(violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).join(", ")}`)).toEqual([]);
      });
    }
  }
}

for (const skin of [null, "material"]) {
  for (const scheme of ["light", "dark"]) {
    test(`the demo site, ${scheme}${skin ? `, ${skin}` : ""}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      await page.goto("/");
      if (skin) await page.evaluate(() => (document.getElementById("skin").disabled = false));
      await page.waitForFunction(() => document.querySelector("[bx-sort]"));
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
}
