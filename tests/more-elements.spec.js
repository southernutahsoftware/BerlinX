// Behaviour tests for the second set of elements and helpers, on tests/elements.html.
const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.errors = errors;
  await page.goto("/tests/elements.html");
  await page.waitForFunction(() => customElements.get("bx-tree") && document.querySelector("#command [role=listbox]"));
});

test.afterEach(async ({ page }) => {
  expect(page.errors).toEqual([]);
});

const elements = page => page.evaluate(() => import("/dist/elements/index.js")).then(() => null);
const isOpen = locator => locator.evaluate(el => el.matches(":popover-open"));
const focused = page => page.evaluate(() => document.activeElement?.textContent.trim());

test.describe("setLabels()", () => {
  test("changes the words of elements already on the page", async ({ page }) => {
    await page.evaluate(async () => {
      const { setLabels } = await import("/dist/elements/index.js");
      setLabels({ nextPage: "Page suivante", selectRow: name => `Choisir ${name}`, pickDate: "Choisir une date" });
    });
    await expect(page.getByRole("button", { name: "Page suivante" })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Choisir Ada" })).toBeVisible();
    await page.locator("#due").evaluate(input => (input.value = ""));
    await page.locator("#due").dispatchEvent("change");
    await expect(page.locator("bx-date-picker").first().locator("[aria-haspopup]")).toHaveText("Choisir une date");
  });
});

test.describe("bx-combobox load()", () => {
  test("loads options as you type, after a pause, and drops stale answers", async ({ page }) => {
    await page.evaluate(() => {
      window.queries = [];
      document.querySelector("#city").load = async (query, { signal }) => {
        window.queries.push(query);
        await new Promise(resolve => setTimeout(resolve, query === "b" ? 400 : 50));
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
        return ["Berlin", "Bern", "Bonn", "Basel"].filter(city => city.toLowerCase().startsWith(query.toLowerCase()));
      };
    });
    const input = page.locator("#cityInput");
    await input.click();
    await expect(page.locator("#city [role=listbox]")).toHaveAttribute("aria-busy", "true");
    await expect(page.locator("#city [hint]")).toHaveText("Loading…");
    await expect(page.locator("#city [role=option]")).toHaveCount(4);

    await input.pressSequentially("ber", { delay: 20 });
    await expect(page.locator("#city [role=option]")).toHaveText(["Berlin", "Bern"]);
    // Only the query typed before the pause was asked for.
    expect(await page.evaluate(() => window.queries)).toEqual(["", "ber"]);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(input).toHaveValue("Bern");
  });
});

test.describe("bx-tabs", () => {
  test("starts on the tab the markup marks current and shows one panel", async ({ page }) => {
    await expect(page.getByRole("tablist", { name: "Invoice" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Items" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toHaveText("Items panel");
    await expect(page.getByRole("tabpanel")).toHaveAccessibleName("Items");
    await expect(page.locator("#overview")).toBeHidden();
  });

  test("arrow keys, Home and End switch tabs; clicks do too, without navigating", async ({ page }) => {
    await page.evaluate(() => {
      window.changes = 0;
      document.querySelector("#tabs").addEventListener("change", () => window.changes++);
    });
    await page.getByRole("tab", { name: "Items" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "History" })).toBeFocused();
    await expect(page.getByRole("tabpanel")).toHaveText("History panel");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Overview" })).toBeFocused();
    await page.keyboard.press("End");
    await expect(page.getByRole("tab", { name: "History" })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page.getByRole("tabpanel")).toHaveText("Overview panel");
    expect(page.url()).not.toContain("#overview");
    expect(await page.evaluate(() => window.changes)).toBe(4);
    await expect(page.locator("#tabs")).toHaveAttribute("selected", "overview");
  });

  test("selected switches tabs from outside, and Tab moves into the panel", async ({ page }) => {
    await page.evaluate(() => (document.querySelector("#tabs").selected = "history"));
    await expect(page.getByRole("tabpanel")).toHaveText("History panel");
    await page.getByRole("tab", { name: "History" }).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("tabpanel")).toBeFocused();
  });
});

test.describe("tooltips", () => {
  test("show above a scroll box that would clip them, and describe their control", async ({ page }) => {
    const archive = page.locator("#tipArchive");
    await archive.hover();
    const tip = page.getByRole("tooltip");
    await expect(tip).toHaveText("Archive this invoice");
    await expect(archive).toHaveAccessibleDescription("Archive this invoice");
    const [button, box] = await Promise.all([archive.boundingBox(), tip.boundingBox()]);
    expect(box.y + box.height).toBeLessThanOrEqual(button.y);
    // The CSS tooltip is switched off, so there is only one.
    expect(await archive.evaluate(el => getComputedStyle(el, "::after").display)).toBe("none");

    await page.mouse.move(0, 0);
    await expect(tip).toBeHidden();
    await expect(archive).not.toHaveAttribute("aria-describedby");
  });

  test("a tooltip repeating the name adds no description; Escape hides it", async ({ page }) => {
    await page.locator("#tipArchive").focus();
    await page.keyboard.press("Shift+Tab");
    await expect(page.getByRole("tooltip")).toHaveText("Delete");
    await expect(page.locator("#tipDelete")).not.toHaveAttribute("aria-describedby");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("tooltip")).toBeHidden();
  });
});

test.describe("bx-multi-select", () => {
  const field = page => page.locator("bx-multi-select [role=combobox]");
  const chosen = page => page.locator("#labelsSelect").evaluate(select => [...select.selectedOptions].map(o => o.value));

  test("stands in for the select, named by its label", async ({ page }) => {
    await expect(page.locator("#labelsSelect")).toHaveAttribute("visually-hidden", "");
    await expect(field(page)).toHaveAccessibleName("Labels");
    await expect(page.locator("bx-multi-select [badge]")).toHaveText(["Bug"]);
  });

  test("toggles options from the keyboard, keeping the list open", async ({ page }) => {
    await field(page).click();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("option", { name: "Bug" })).toHaveAttribute("active", "");
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("option", { name: "Design" })).toHaveAttribute("active", "");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("option", { name: "Design" })).toHaveAttribute("aria-selected", "true");
    // Locked is disabled: it can be reached, but never toggles.
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    expect(await chosen(page)).toEqual(["bug", "design"]);
    await expect(page.locator("bx-multi-select [badge]")).toHaveText(["Bug", "Design"]);
    await expect(field(page)).toHaveAttribute("aria-expanded", "true");
  });

  test("typing filters; clicking toggles; Backspace and chip buttons remove", async ({ page }) => {
    await field(page).fill("doc");
    await expect(page.getByRole("option")).toHaveText(["Documentation"]);
    await page.getByRole("option", { name: "Documentation" }).click();
    expect(await chosen(page)).toEqual(["bug", "docs"]);
    await field(page).fill("");
    await page.keyboard.press("Backspace");
    expect(await chosen(page)).toEqual(["bug"]);
    await page.getByRole("button", { name: "Remove Bug" }).click();
    expect(await chosen(page)).toEqual([]);
    await expect(field(page)).toBeFocused();
    await expect(field(page)).toHaveAttribute("placeholder", "Add labels");
  });

  test("required: an empty choice blocks submission and marks the field; reset restores", async ({ page }) => {
    await page.getByRole("button", { name: "Remove Bug" }).click();
    const valid = await page.locator("#form2").evaluate(form => form.reportValidity());
    expect(valid).toBe(false);
    await expect(page.locator("bx-multi-select [bx-field]")).toHaveAttribute("aria-invalid", "true");
    await page.locator("#form2").evaluate(form => form.reset());
    await expect(page.locator("bx-multi-select [badge]")).toHaveText(["Bug"]);
  });
});

test.describe("bx-command", () => {
  const dialog = page => page.getByRole("dialog", { name: "Commands" });

  test("opens with Ctrl+K, filters, and runs the chosen command", async ({ page }) => {
    await page.evaluate(() => document.querySelector("#exportCommand").addEventListener("click", () => (window.exported = true)));
    await page.keyboard.press("Control+k");
    await expect(dialog(page)).toBeVisible();
    const search = dialog(page).getByRole("combobox");
    await expect(search).toBeFocused();
    await expect(dialog(page).getByRole("option")).toHaveCount(4);
    await expect(dialog(page).getByRole("group", { name: "Invoices" })).toBeVisible();

    await search.fill("csv");
    await expect(dialog(page).getByRole("option")).toHaveText(["Export as CSV"]);
    await expect(dialog(page).getByRole("group", { name: "Go to" })).toBeHidden();
    await page.keyboard.press("Enter");
    expect(await page.evaluate(() => window.exported)).toBe(true);
    await expect(dialog(page)).toBeHidden();
  });

  test("arrow keys move, links navigate, and it opens fresh each time", async ({ page }) => {
    await page.evaluate(() => document.querySelector("#command").show());
    const search = dialog(page).getByRole("combobox");
    await search.fill("zzz");
    await expect(dialog(page).getByText("No results")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toBeHidden();

    await page.keyboard.press("Control+k");
    await expect(search).toHaveValue("");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expect(dialog(page).getByRole("option", { name: "Clients" })).toHaveAttribute("active", "");
    await expect(search).toHaveAttribute("aria-activedescendant", await dialog(page).getByRole("option", { name: "Clients" }).getAttribute("id"));
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#clients$/);
  });
});

test.describe("bx-date-picker ranges", () => {
  const trigger = page => page.locator("#stay [aria-haspopup]");

  test("shows the range, named by the label around it", async ({ page }) => {
    await expect(trigger(page)).toHaveText("Oct 12 – 15, 2026");
    await expect(trigger(page)).toHaveAccessibleName("Stay, Oct 12 – 15, 2026");
  });

  test("two picks make a range, in either order; the form only changes at the end", async ({ page }) => {
    await trigger(page).click();
    const calendar = page.getByRole("dialog", { name: "Stay" });
    await expect(calendar.getByRole("button", { name: "Tuesday, October 13, 2026" })).toHaveAttribute("in-range", "");
    await calendar.getByRole("button", { name: "Friday, October 23, 2026" }).click();
    await expect(page.locator("#from")).toHaveValue("2026-10-12");
    await calendar.getByRole("button", { name: "Tuesday, October 20, 2026" }).click();
    await expect(calendar).toBeHidden();
    await expect(page.locator("#from")).toHaveValue("2026-10-20");
    await expect(page.locator("#to")).toHaveValue("2026-10-23");
    await expect(trigger(page)).toHaveText("Oct 20 – 23, 2026");
  });

  test("the keyboard picks a range too; Escape abandons half a range", async ({ page }) => {
    const calendar = page.getByRole("dialog", { name: "Stay" });
    const start = calendar.getByRole("button", { name: "Monday, October 12, 2026" });
    await trigger(page).click();
    await expect(start).toBeFocused();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(calendar.getByRole("button", { name: "Tuesday, October 13, 2026" })).toHaveAttribute("in-range", "");
    await page.keyboard.press("Escape");
    await expect(page.locator("#to")).toHaveValue("2026-10-15");

    await trigger(page).click();
    await expect(start).toBeFocused();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page.locator("#from")).toHaveValue("2026-10-12");
    await expect(page.locator("#to")).toHaveValue("2026-10-19");
  });

  test("has no Today button; Clear empties both ends", async ({ page }) => {
    await trigger(page).click();
    const calendar = page.getByRole("dialog", { name: "Stay" });
    await expect(calendar.getByRole("button", { name: "Today" })).toHaveCount(0);
    await calendar.getByRole("button", { name: "Clear" }).click();
    await expect(page.locator("#from")).toHaveValue("");
    await expect(page.locator("#to")).toHaveValue("");
  });
});

test.describe("bx-tree", () => {
  const tree = page => page.locator("#tree");

  test("is one tab stop; arrows move through the open items", async ({ page }) => {
    await page.locator("#tipArchive").focus();
    await page.keyboard.press("Tab");
    expect(await focused(page)).toBe("src");
    expect(await tree(page).locator("[tabindex='0']").count()).toBe(1);
    await page.keyboard.press("ArrowDown");
    expect(await focused(page)).toBe("index.js");
    await page.keyboard.press("ArrowDown");
    expect(await focused(page)).toBe("components");
    await page.keyboard.press("ArrowDown");
    // components is closed, so button.js is skipped.
    expect(await focused(page)).toBe("styles.css");
    await page.keyboard.press("End");
    expect(await focused(page)).toBe("README.md");
    await page.keyboard.press("Home");
    expect(await focused(page)).toBe("src");
  });

  test("right opens and enters a folder; left closes it and climbs out", async ({ page }) => {
    await tree(page).getByText("components").focus();
    await page.keyboard.press("ArrowRight");
    await expect(tree(page).locator("details details")).toHaveAttribute("open", "");
    await page.keyboard.press("ArrowRight");
    expect(await focused(page)).toBe("button.js");
    await page.keyboard.press("ArrowLeft");
    expect(await focused(page)).toBe("components");
    await page.keyboard.press("ArrowLeft");
    await expect(tree(page).locator("details details")).not.toHaveAttribute("open");
    await page.keyboard.press("ArrowLeft");
    expect(await focused(page)).toBe("src");
    await page.keyboard.type("st");
    expect(await focused(page)).toBe("styles.css");
  });

  test("a clicked item becomes current and keeps the tab stop", async ({ page }) => {
    await tree(page).getByRole("button", { name: "styles.css" }).click();
    await expect(tree(page).getByRole("button", { name: "styles.css" })).toHaveAttribute("aria-current", "true");
    await page.locator("#tipArchive").focus();
    await page.keyboard.press("Tab");
    expect(await focused(page)).toBe("styles.css");
  });

  test("closing a folder around the focus moves it to the folder", async ({ page }) => {
    await tree(page).getByRole("button", { name: "index.js" }).focus();
    await tree(page).locator("summary").first().click();
    expect(await focused(page)).toBe("src");
  });
});

test.describe("bx-sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
  });

  test("collapses to icons with tooltips, and expands again", async ({ page }) => {
    const sidebar = page.locator("#sidebar");
    const toggle = page.getByRole("button", { name: "Collapse sidebar" });
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    const wide = (await sidebar.locator("aside").boundingBox()).width;
    await toggle.click();
    await expect(sidebar).toHaveAttribute("collapsed", "");
    await expect(page.getByRole("button", { name: "Expand sidebar" })).toHaveAttribute("aria-expanded", "false");
    await expect.poll(async () => (await sidebar.locator("aside").boundingBox()).width).toBeLessThan(wide / 3);
    await expect(page.getByRole("link", { name: "Clients" })).toHaveAttribute("tooltip", "Clients");

    await page.getByRole("button", { name: "Expand sidebar" }).click();
    await expect(sidebar).not.toHaveAttribute("collapsed");
    await expect(page.getByRole("link", { name: "Clients" })).not.toHaveAttribute("tooltip");
  });

  test("remembers the choice with persist", async ({ page }) => {
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    expect(await page.evaluate(() => localStorage.getItem("bx-sidebar:test"))).toBe("collapsed");
    await page.reload();
    await expect(page.locator("#sidebar")).toHaveAttribute("collapsed", "");
  });
});
