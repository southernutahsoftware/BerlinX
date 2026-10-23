// Behaviour tests for BerlinX Elements, run against tests/elements.html.
const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.errors = errors;
  await page.goto("/tests/elements.html");
  await page.waitForFunction(() => customElements.get("bx-data-table") && document.querySelector("[bx-sort]"));
});

test.afterEach(async ({ page }) => {
  expect(page.errors).toEqual([]);
});

const isOpen = locator => locator.evaluate(el => el.matches(":popover-open"));
const focused = page => page.evaluate(() => document.activeElement?.textContent.trim());
const visibleNames = page => page.locator("#table tbody tr:not([hidden]) th").allTextContents();

test.describe("bx-dropdown", () => {
  test("opens on click with focus on the first item, below the button", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Actions" });
    const menu = page.locator("#actions");
    await expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    await trigger.click();
    await expect.poll(() => isOpen(menu)).toBe(true);
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(menu).toHaveAttribute("role", "menu");
    await expect(page.getByRole("menuitem", { name: "Edit" })).toBeFocused();

    const [button, box] = await Promise.all([trigger.boundingBox(), menu.boundingBox()]);
    expect(box.y).toBeGreaterThanOrEqual(button.y + button.height);
    expect(Math.round(box.x)).toBe(Math.round(button.x));
  });

  test("arrow keys skip disabled items and wrap; Home, End and type-ahead jump", async ({ page }) => {
    await page.getByRole("button", { name: "Actions" }).click();
    await expect(page.getByRole("menuitem", { name: "Edit" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    expect(await focused(page)).toBe("Duplicate ⌘D");
    await page.keyboard.press("ArrowDown");
    expect(await focused(page)).toBe("Download");
    await page.keyboard.press("End");
    expect(await focused(page)).toBe("Delete");
    await page.keyboard.press("ArrowDown");
    expect(await focused(page)).toBe("Edit");
    await page.keyboard.press("ArrowUp");
    expect(await focused(page)).toBe("Delete");
    await page.keyboard.press("Home");
    await page.keyboard.type("do");
    expect(await focused(page)).toBe("Download");
  });

  test("Escape closes and returns focus to the button", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Actions" });
    await trigger.click();
    await expect(page.getByRole("menuitem", { name: "Edit" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect.poll(() => isOpen(page.locator("#actions"))).toBe(false);
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("choosing an item runs it and closes the menu", async ({ page }) => {
    await page.evaluate(() => document.querySelector("#edit").addEventListener("click", () => (window.edited = true)));
    await page.getByRole("button", { name: "Actions" }).click();
    await page.getByRole("menuitem", { name: "Edit" }).click();
    expect(await page.evaluate(() => window.edited)).toBe(true);
    await expect.poll(() => isOpen(page.locator("#actions"))).toBe(false);
  });

  test("ArrowUp on the button opens at the last item", async ({ page }) => {
    await page.getByRole("button", { name: "Actions" }).focus();
    await page.keyboard.press("ArrowUp");
    await expect(page.getByRole("menuitem", { name: "Delete" })).toBeFocused();
  });
});

test.describe("bx-context-menu", () => {
  test("opens at the pointer and closes on Escape", async ({ page }) => {
    const area = page.locator("#contextArea");
    const menu = page.locator("bx-context-menu [popover]");
    await area.click({ button: "right", position: { x: 200, y: 20 } });
    await expect.poll(() => isOpen(menu)).toBe(true);
    await expect(page.getByRole("menuitem", { name: "Rename" })).toBeFocused();

    const [outer, box] = await Promise.all([area.boundingBox(), menu.boundingBox()]);
    expect(Math.abs(box.x - (outer.x + 200))).toBeLessThanOrEqual(1);
    expect(Math.abs(box.y - (outer.y + 20))).toBeLessThanOrEqual(1);

    await page.keyboard.press("ArrowDown");
    expect(await focused(page)).toBe("Share");
    await page.keyboard.press("Escape");
    await expect.poll(() => isOpen(menu)).toBe(false);
  });

  test("opens under the focused element from the keyboard", async ({ page }) => {
    const area = page.locator("#contextArea");
    await area.focus();
    // The context menu key arrives as a contextmenu event with no coordinates.
    await area.dispatchEvent("contextmenu", { clientX: 0, clientY: 0 });
    const menu = page.locator("bx-context-menu [popover]");
    await expect.poll(() => isOpen(menu)).toBe(true);
    const [outer, box] = await Promise.all([area.boundingBox(), menu.boundingBox()]);
    expect(box.y).toBeGreaterThanOrEqual(outer.y + outer.height - 1);
  });
});

test.describe("bx-combobox", () => {
  test("filters as you type, ignoring case and accents", async ({ page }) => {
    const input = page.locator("#country");
    await expect(input).toHaveAttribute("role", "combobox");
    await expect(input).not.toHaveAttribute("list");
    await input.fill("COTE");
    await expect(page.getByRole("option")).toHaveText(["Côte d'Ivoire"]);
    await expect(input).toHaveAttribute("aria-expanded", "true");
    await input.fill("zzz");
    await expect(page.locator("bx-combobox [hint]")).toHaveText("No results");
  });

  test("arrow keys and Enter choose an option, firing input and change", async ({ page }) => {
    const input = page.locator("#country");
    await page.evaluate(() => {
      window.events = [];
      const el = document.querySelector("#country");
      for (const type of ["input", "change"]) el.addEventListener(type, () => window.events.push(type));
    });
    await input.click();
    await expect(page.getByRole("option")).toHaveCount(4);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("option", { name: "Belgium" })).toHaveAttribute("active", "");
    await expect(input).toHaveAttribute("aria-activedescendant", await page.getByRole("option", { name: "Belgium" }).getAttribute("id"));
    await page.keyboard.press("Enter");
    await expect(input).toHaveValue("Belgium");
    await expect(input).toHaveAttribute("aria-expanded", "false");
    expect(await page.evaluate(() => window.events)).toEqual(["input", "change"]);
    expect(await page.evaluate(() => new FormData(document.querySelector("#form")).get("country"))).toBe("Belgium");

    // Opened on a chosen value it lists everything, with that value selected.
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("option")).toHaveCount(4);
    await expect(page.getByRole("option", { name: "Belgium" })).toHaveAttribute("aria-selected", "true");
  });

  test("clicking an option chooses it; Escape only closes the list", async ({ page }) => {
    const input = page.locator("#country");
    await input.fill("g");
    await page.getByRole("option", { name: "Germany" }).click();
    await expect(input).toHaveValue("Germany");
    await expect(input).toBeFocused();
    await input.fill("Aus");
    await page.keyboard.press("Escape");
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await expect(input).toHaveValue("Aus");
  });

  test("strict makes values that are not options invalid", async ({ page }) => {
    const input = page.locator("#country");
    await input.fill("Atlantis");
    await page.keyboard.press("Tab");
    expect(await input.evaluate(el => el.validity.valid)).toBe(false);
    await input.fill("Austria");
    await page.keyboard.press("Tab");
    expect(await input.evaluate(el => el.validity.valid)).toBe(true);
  });

  test("options can be set from script", async ({ page }) => {
    await page.evaluate(() => (document.querySelector("bx-combobox").options = ["Oslo", { value: "BER", label: "Berlin" }]));
    await page.locator("#country").fill("ber");
    await page.getByRole("option", { name: "Berlin" }).click();
    await expect(page.locator("#country")).toHaveValue("BER");

    await page.locator("#country").fill("");
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("option")).toHaveText(["Oslo", "Berlin"]);
    await page.keyboard.press("Enter");
    await expect(page.locator("#country")).toHaveValue("Oslo");
  });
});

test.describe("bx-date-picker", () => {
  const due = page => page.locator("bx-date-picker").first();
  const dueButton = page => due(page).locator("[aria-haspopup]");

  test("stands in for the input, named by its label", async ({ page }) => {
    const input = page.locator("#due");
    await expect(input).toHaveAttribute("visually-hidden", "");
    await expect(input).toHaveAttribute("tabindex", "-1");
    await expect(dueButton(page)).toHaveText("Oct 22, 2026");
    await expect(dueButton(page)).toHaveAccessibleName("Due date, Oct 22, 2026");
  });

  test("keyboard: open on the chosen day, move, choose", async ({ page }) => {
    await dueButton(page).click();
    const dialog = page.getByRole("dialog", { name: "Due date" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading")).toHaveText("October 2026");
    await expect(dialog.getByRole("button", { name: "Thursday, October 22, 2026" })).toBeFocused();
    await expect(dialog.getByRole("button", { name: "Thursday, October 22, 2026" })).toHaveAttribute("aria-pressed", "true");

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
    await expect(dialog.getByRole("button", { name: "Friday, October 30, 2026" })).toBeFocused();
    await page.keyboard.press("PageDown");
    await expect(dialog.getByRole("heading")).toHaveText("November 2026");
    await expect(dialog.getByRole("button", { name: "Monday, November 30, 2026" })).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page.locator("#due")).toHaveValue("2026-11-30");
    await expect(dueButton(page)).toHaveText("Nov 30, 2026");
    await expect(dialog).toBeHidden();
    await expect(dueButton(page)).toBeFocused();
  });

  test("respects min and max", async ({ page }) => {
    await dueButton(page).click();
    const dialog = page.getByRole("dialog", { name: "Due date" });
    await expect(dialog.getByRole("button", { name: "Sunday, October 4, 2026" })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Monday, October 5, 2026" })).toBeEnabled();
    await expect(dialog.getByRole("button", { name: "Previous month" })).toBeDisabled();
    // Moving past the minimum stops on it.
    await page.keyboard.press("PageUp");
    await expect(dialog.getByRole("button", { name: "Monday, October 5, 2026" })).toBeFocused();
    await page.keyboard.press("Shift+PageDown");
    await expect(dialog.getByRole("button", { name: "Sunday, December 20, 2026" })).toBeFocused();
    await expect(dialog.getByRole("button", { name: "Next month" })).toBeDisabled();
  });

  test("month buttons change the month and keep focus", async ({ page }) => {
    await dueButton(page).click();
    const dialog = page.getByRole("dialog", { name: "Due date" });
    await dialog.getByRole("button", { name: "Next month" }).click();
    await expect(dialog.getByRole("heading")).toHaveText("November 2026");
    await expect(dialog.getByRole("button", { name: "Next month" })).toBeFocused();
  });

  test("Clear empties an optional date; a required one has no Clear", async ({ page }) => {
    await dueButton(page).click();
    await page.getByRole("dialog", { name: "Due date" }).getByRole("button", { name: "Clear" }).click();
    await expect(page.locator("#due")).toHaveValue("");
    await expect(dueButton(page)).toHaveText("Pick a date");

    const start = page.locator("bx-date-picker").nth(1).locator("[aria-haspopup]");
    await expect(start).toHaveText("Choose a start");
    await start.click();
    const dialog = page.getByRole("dialog", { name: "Start date" });
    await expect(dialog.getByRole("button", { name: "Clear" })).toHaveCount(0);
    await expect(dialog.locator("th").first()).toHaveText("Mon");
  });

  test("a required date blocks submission and marks the button", async ({ page }) => {
    await page.getByRole("button", { name: "Save" }).click();
    const start = page.locator("bx-date-picker").nth(1).locator("[aria-haspopup]");
    await expect(start).toHaveAttribute("aria-invalid", "true");
    await start.click();
    await page.getByRole("dialog", { name: "Start date" }).getByRole("button", { name: "Today" }).click();
    await expect(start).not.toHaveAttribute("aria-invalid");
    expect(await page.locator("#start").inputValue()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("form reset restores the shown date", async ({ page }) => {
    await dueButton(page).click();
    await page.getByRole("dialog", { name: "Due date" }).getByRole("button", { name: "Clear" }).click();
    await page.evaluate(() => document.querySelector("#form").reset());
    await expect(dueButton(page)).toHaveText("Oct 22, 2026");
  });
});

test.describe("bx-data-table", () => {
  test("sortable headers become buttons, except nosort", async ({ page }) => {
    await expect(page.locator("#table thead [bx-sort]")).toHaveText(["Name", "Total"]);
    await expect(page.locator("#table th:has-text('Notes') [bx-sort]")).toHaveCount(0);
  });

  test("sorts ascending, descending and back to the order written", async ({ page }) => {
    const total = page.getByRole("button", { name: "Total" });
    const header = page.locator("#table thead th").filter({ has: total });
    await total.click();
    await expect(header).toHaveAttribute("aria-sort", "ascending");
    expect(await visibleNames(page)).toEqual(["Barbara", "Émile", "Grace"]);
    await total.click();
    await expect(header).toHaveAttribute("aria-sort", "descending");
    expect(await visibleNames(page)).toEqual(["Linus", "Ada", "Grace"]);
    await total.click();
    await expect(header).not.toHaveAttribute("aria-sort");
    expect(await visibleNames(page)).toEqual(["Ada", "Grace", "Émile"]);

    await page.getByRole("button", { name: "Name" }).click();
    expect(await visibleNames(page)).toEqual(["Ada", "Barbara", "Émile"]);
  });

  test("filters across all rows, ignoring accents", async ({ page }) => {
    const filter = page.getByRole("searchbox", { name: "Filter rows" });
    await filter.fill("alpha");
    expect(await visibleNames(page)).toEqual(["Ada", "Barbara"]);
    await expect(page.locator("#table footer small")).toHaveText("1–2 of 2");
    await expect(page.locator("#table nav[pagination]")).toHaveCount(0);
    await filter.fill("emile");
    expect(await visibleNames(page)).toEqual(["Émile"]);
    await filter.fill("nobody");
    await expect(page.locator("#table footer small")).toHaveText("No matching rows");
  });

  test("pages", async ({ page }) => {
    await expect(page.locator("#table footer small")).toHaveText("1–3 of 5");
    await expect(page.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await page.getByRole("button", { name: "Next page" }).click();
    expect(await visibleNames(page)).toEqual(["Linus", "Barbara"]);
    await expect(page.getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
    await expect(page.locator("#table footer small")).toHaveText("4–5 of 5");
    await page.getByRole("button", { name: "Page 1" }).click();
    expect(await visibleNames(page)).toEqual(["Ada", "Grace", "Émile"]);
  });

  test("selects rows, and all filtered rows from the header", async ({ page }) => {
    await page.evaluate(() => {
      window.selections = [];
      document.querySelector("#table").addEventListener("rowselect", e => window.selections.push(e.detail.rows.length));
    });
    await page.getByRole("checkbox", { name: "Select Grace" }).check();
    await expect(page.locator("#table tbody tr[selected] th")).toHaveText(["Grace"]);
    const all = page.getByRole("checkbox", { name: "Select all rows" });
    expect(await all.evaluate(el => el.indeterminate)).toBe(true);

    await all.check();
    expect(await page.evaluate(() => document.querySelector("#table").selectedRows().length)).toBe(5);
    await page.getByRole("searchbox", { name: "Filter rows" }).fill("alpha");
    await expect(all).toBeChecked();
    await all.uncheck();
    await page.getByRole("searchbox", { name: "Filter rows" }).fill("");
    // Clearing the filtered selection left the other three selected.
    expect(await page.evaluate(() => document.querySelector("#table").selectedRows().map(r => r.cells[1].textContent))).toEqual(["Grace", "Émile", "Linus"]);
    expect(await page.evaluate(() => window.selections)).toEqual([1, 5, 3]);
  });

  test("picks up rows the page adds and removes", async ({ page }) => {
    await page.evaluate(() => {
      const body = document.querySelector("#table tbody");
      body.insertAdjacentHTML("beforeend", '<tr><th scope="row">Alan</th><td data-value="5">$5</td><td>new</td></tr>');
      body.rows[0].remove();
    });
    await expect(page.locator("#table footer small")).toHaveText("1–3 of 5");
    // Alan is the fifth row, on the second page.
    await expect(page.locator('#table tr[hidden] input[aria-label="Select Alan"]')).toHaveCount(1);
    await page.getByRole("button", { name: "Total" }).click();
    expect(await visibleNames(page)).toEqual(["Alan", "Barbara", "Émile"]);
  });

  test("a sort survives a checkbox column added in front of it", async ({ page }) => {
    await page.evaluate(() => document.querySelector("#table").removeAttribute("selectable"));
    await page.getByRole("button", { name: "Total" }).click();
    await page.evaluate(() => document.querySelector("#table").setAttribute("selectable", ""));
    await expect(page.locator("#table [bx-select]")).toHaveCount(6);
    await page.getByRole("button", { name: "Next page" }).click();
    await page.getByRole("button", { name: "Page 1" }).click();
    expect(await visibleNames(page)).toEqual(["Barbara", "Émile", "Grace"]);
  });

  test("feature attributes can be removed again", async ({ page }) => {
    await page.evaluate(() => {
      const table = document.querySelector("#table");
      table.removeAttribute("sortable");
      table.removeAttribute("selectable");
    });
    await expect(page.locator("#table [bx-sort]")).toHaveCount(0);
    await expect(page.locator("#table [bx-select]")).toHaveCount(0);
    await expect(page.locator("#table thead th").first()).toHaveText("Name");
  });
});

test.describe("toast()", () => {
  const toast = (page, options) => page.evaluate(async o => (await import("/dist/elements/index.js")).toast(o) && null, options);
  const toasts = page => page.locator("[bx-toaster] > [notice]");

  test("shows a message in a live region and dismisses itself", async ({ page }) => {
    await toast(page, { message: "Invoice sent", variant: "success", duration: 400 });
    await expect(toasts(page)).toHaveText(["Invoice sent"]);
    await expect(toasts(page)).toHaveAttribute("notice", "success");
    await expect(page.locator("[bx-toaster]")).toHaveAttribute("aria-live", "polite");
    await expect(toasts(page)).toHaveCount(0);
  });

  test("errors are alerts; Dismiss and actions close the toast", async ({ page }) => {
    await page.evaluate(() => (window.undone = false));
    await toast(page, { message: "Failed", variant: "error", duration: 0 });
    await expect(page.getByRole("alert")).toHaveText("Failed");
    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(toasts(page)).toHaveCount(0);

    await page.evaluate(async () => (await import("/dist/elements/index.js")).toast({ message: "Archived", action: { label: "Undo", onClick: () => (window.undone = true) } }));
    await page.getByRole("button", { name: "Undo" }).click();
    expect(await page.evaluate(() => window.undone)).toBe(true);
    await expect(toasts(page)).toHaveCount(0);
  });

  test("shows three at a time and queues the rest", async ({ page }) => {
    for (const message of ["One", "Two", "Three", "Four"]) await toast(page, { message, duration: 0 });
    await expect(toasts(page)).toHaveText(["One", "Two", "Three"]);
    await page.getByRole("button", { name: "Dismiss" }).first().click();
    await expect(toasts(page)).toHaveText(["Two", "Three", "Four"]);
  });

  test("pauses while hovered", async ({ page }) => {
    await toast(page, { message: "Hold on", duration: 600 });
    await toasts(page).hover();
    await page.waitForTimeout(900);
    await expect(toasts(page)).toHaveCount(1);
    await page.mouse.move(0, 0);
    await expect(toasts(page)).toHaveCount(0, { timeout: 3000 });
  });

  test("works over a modal dialog, and goes back to the page after", async ({ page }) => {
    page.evaluate(async () => (window.answer = await (await import("/dist/elements/index.js")).confirm("Sure?")));
    await expect(page.getByRole("dialog")).toBeVisible();
    await toast(page, { message: "Over the top", duration: 0 });
    // Outside the modal it would be inert: drawn, but not clickable or announced.
    const box = await toasts(page).boundingBox();
    const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("[notice]")?.textContent, { x: box.x + 10, y: box.y + 10 });
    expect(hit).toContain("Over the top");
    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(toasts(page)).toHaveCount(0);

    await toast(page, { message: "Still here", duration: 0 });
    await page.keyboard.press("Escape");
    await expect(page.locator("dialog[bx-confirm]")).toHaveCount(0);
    await expect(toasts(page)).toHaveText(["Still here"]);
    expect(await page.locator("[bx-toaster]").evaluate(el => el.parentElement === document.body && el.matches(":popover-open"))).toBe(true);
  });
});

test.describe("confirm()", () => {
  const ask = (page, options) => page.evaluate(async o => (await import("/dist/elements/index.js")).confirm(o), options);

  test("resolves true from the confirm button and removes the dialog", async ({ page }) => {
    const answer = ask(page, { title: "Send invoice?", message: "Ada will get it now.", confirm: "Send" });
    const dialog = page.getByRole("dialog", { name: "Send invoice?" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAccessibleDescription("Ada will get it now.");
    await expect(dialog.getByRole("button", { name: "Send" })).toBeFocused();
    await dialog.getByRole("button", { name: "Send" }).click();
    expect(await answer).toBe(true);
    await expect(page.locator("dialog[bx-confirm]")).toHaveCount(0);
  });

  test("resolves false on Escape; destructive focuses Cancel", async ({ page }) => {
    const answer = ask(page, { title: "Delete?", confirm: "Delete", destructive: true });
    const dialog = page.getByRole("alertdialog", { name: "Delete?" });
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
    await page.keyboard.press("Escape");
    expect(await answer).toBe(false);
  });
});

test("without JavaScript the markup still works natively", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/tests/elements.html");
  await expect(page.locator("#country")).toHaveAttribute("list", "countries");
  await expect(page.locator("#due")).toBeVisible();
  await expect(page.locator("#table [bx-sort]")).toHaveCount(0);
  await expect(page.locator("#table tbody tr")).toHaveCount(5);
  await page.getByRole("button", { name: "Actions" }).click();
  await expect(page.locator("#actions")).toBeVisible();
  await context.close();
});
