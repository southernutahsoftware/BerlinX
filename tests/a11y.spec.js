// axe-core scans of every element, closed and open, in both themes.
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
  "toasts and confirm": page =>
    page.evaluate(async () => {
      const { toast, confirm } = await import("/dist/elements/index.js");
      toast({ title: "Saved", message: "Invoice sent", variant: "success", duration: 0 });
      toast({ message: "Failed", variant: "error", duration: 0, action: { label: "Retry" } });
      confirm({ title: "Delete?", message: "This cannot be undone.", destructive: true });
      await new Promise(resolve => setTimeout(resolve, 300));
    }),
};

for (const scheme of ["light", "dark"]) {
  for (const [name, open] of Object.entries(states)) {
    test(`${name}, ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      await page.goto("/tests/elements.html");
      await page.waitForFunction(() => document.querySelector("[bx-sort]"));
      await open(page);
      await page.waitForTimeout(250);
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
}

for (const scheme of ["light", "dark"]) {
  test(`the Elements guide, ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await page.goto("/elements.html");
    await page.waitForFunction(() => document.querySelector("[bx-sort]"));
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
}
