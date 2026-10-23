// Behaviour tests for elements that load their data, on tests/remote.html. The
// server is faked with page.route, which records what each element asked for.
const { test, expect } = require("@playwright/test");

const invoices = [
  { id: 1, client: "Ada", total: 1200, status: "Paid" },
  { id: 2, client: "Grace", total: 300, status: "Sent" },
  { id: 3, client: "Émile", total: 45, status: "Draft" },
  { id: 4, client: "Linus", total: 9000, status: "Paid" },
  { id: 5, client: "Barbara", total: 10, status: "Sent" },
];
const clients = ["Ada Lovelace", "Grace Hopper", "Grace Kelly", "Linus Torvalds"].map((label, i) => ({ value: String(i + 1), label }));

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.errors = errors;
  page.requests = [];
  await page.route("**/api/invoices?*", async route => {
    const params = new URL(route.request().url()).searchParams;
    page.requests.push(Object.fromEntries(params));
    const q = (params.get("q") ?? "").toLowerCase();
    let rows = invoices.filter(row => !q || Object.values(row).join(" ").toLowerCase().includes(q));
    const sort = params.get("sort");
    if (sort) rows = [...rows].sort((a, b) => (a[sort] > b[sort] ? 1 : -1) * (params.get("order") === "desc" ? -1 : 1));
    const size = Number(params.get("size"));
    const from = (Number(params.get("page")) - 1) * size;
    await route.fulfill({ json: { rows: rows.slice(from, from + size), total: rows.length } });
  });
  await page.route("**/api/clients*", async route => {
    const q = new URL(route.request().url()).searchParams.get("q") ?? "";
    page.requests.push({ q });
    await route.fulfill({ json: clients.filter(c => c.label.toLowerCase().includes(q.toLowerCase())) });
  });
  await page.goto("/tests/remote.html");
  await expect(page.locator("#remote tbody tr")).toHaveCount(2);
});

test.afterEach(async ({ page }) => {
  expect(page.errors).toEqual([]);
});

const names = page => page.locator("#remote tbody th").allTextContents();
const summary = page => page.locator("#remote footer small");

test.describe("bx-data-table src", () => {
  test("loads the first page, its rows built from the headers' data-key", async ({ page }) => {
    expect(page.requests).toEqual([{ page: "1", size: "2" }]);
    expect(await names(page)).toEqual(["Ada", "Grace"]);
    await expect(page.locator("#remote tbody tr").first().locator("td")).toHaveText(["", "1200", "Paid"]);
    await expect(page.locator("#remote tbody tr").first()).toHaveAttribute("data-id", "1");
    await expect(summary(page)).toHaveText("1–2 of 5");
    await expect(page.getByRole("button", { name: "Page 3" })).toBeVisible();
    await expect(page.locator("#remote table")).not.toHaveAttribute("aria-busy");
  });

  test("asks the server to sort, from the first page", async ({ page }) => {
    await page.getByRole("button", { name: "Page 2" }).click();
    await expect(summary(page)).toHaveText("3–4 of 5");
    const total = page.getByRole("button", { name: "Total" });
    await total.click();
    await expect.poll(() => names(page)).toEqual(["Barbara", "Émile"]);
    expect(page.requests.at(-1)).toEqual({ page: "1", size: "2", sort: "total", order: "asc" });
    await total.click();
    await expect.poll(() => names(page)).toEqual(["Linus", "Ada"]);
    expect(page.requests.at(-1).order).toBe("desc");
    await total.click();
    await expect.poll(() => names(page)).toEqual(["Ada", "Grace"]);
    expect(page.requests.at(-1)).toEqual({ page: "1", size: "2" });
  });

  test("filters once typing pauses", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Filter rows" }).pressSequentially("paid", { delay: 20 });
    await expect.poll(() => names(page)).toEqual(["Ada", "Linus"]);
    await expect(summary(page)).toHaveText("1–2 of 2");
    expect(page.requests.slice(1)).toEqual([{ page: "1", size: "2", q: "paid" }]);
    await expect(page.locator("#remote nav[pagination]")).toHaveCount(0);
  });

  test("pages", async ({ page }) => {
    await page.getByRole("button", { name: "Next page" }).click();
    await expect.poll(() => names(page)).toEqual(["Émile", "Linus"]);
    await page.getByRole("button", { name: "Page 3" }).click();
    await expect.poll(() => names(page)).toEqual(["Barbara"]);
    await expect(summary(page)).toHaveText("5–5 of 5");
    await expect(page.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  test("keeps rows selected by id across pages", async ({ page }) => {
    await page.getByRole("checkbox", { name: "Select Grace" }).check();
    await page.getByRole("button", { name: "Next page" }).click();
    await expect.poll(() => names(page)).toEqual(["Émile", "Linus"]);
    await page.getByRole("checkbox", { name: "Select all rows" }).check();
    expect(await page.evaluate(() => document.querySelector("#remote").selectedIds())).toEqual(["2", "3", "4"]);
    await page.getByRole("button", { name: "Previous page" }).click();
    await expect(page.getByRole("checkbox", { name: "Select Grace" })).toBeChecked();
    await expect(page.locator("#remote tbody tr[selected] th")).toHaveText(["Grace"]);
    const all = page.getByRole("checkbox", { name: "Select all rows" });
    expect(await all.evaluate(el => el.indeterminate)).toBe(true);
  });

  test("a load function gets the request and can return arrays or rows", async ({ page }) => {
    await page.evaluate(() => {
      const table = document.querySelector("#remote");
      table.load = request => {
        window.request = { ...request, signal: request.signal instanceof AbortSignal };
        const row = document.createElement("tr");
        row.innerHTML = "<th scope='row'>Hand-made</th><td>1</td><td>ok</td>";
        return { rows: [["Alan", 5, "new"], row], total: 9 };
      };
    });
    await expect.poll(() => names(page)).toEqual(["Alan", "Hand-made"]);
    expect(await page.evaluate(() => window.request)).toEqual({ page: 1, pageSize: 2, query: "", signal: true });
    await expect(summary(page)).toHaveText("1–2 of 9");
  });

  test("says so when a load fails, and reload() tries again", async ({ page }) => {
    let fail = true;
    await page.route("**/api/invoices?*", route => (fail ? route.fulfill({ status: 500 }) : route.fallback()));
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(summary(page)).toHaveText("Couldn't load results");
    // The rows already shown stay.
    expect(await names(page)).toEqual(["Ada", "Grace"]);
    fail = false;
    await page.evaluate(() => document.querySelector("#remote").reload());
    await expect.poll(() => names(page)).toEqual(["Émile", "Linus"]);
  });
});

test.describe("bx-select src", () => {
  const field = page => page.locator("#client [role=combobox]");
  const value = page => page.evaluate(() => new FormData(document.querySelector("#form")).get("client"));

  test("shows the chosen option, searches the server and submits the value", async ({ page }) => {
    await expect(field(page)).toHaveValue("Ada Lovelace");
    await field(page).click();
    await expect(page.locator("#client [role=option]")).toHaveCount(4);
    await page.keyboard.type("grace", { delay: 20 });
    await expect(page.locator("#client [role=option]")).toHaveText(["Grace Hopper", "Grace Kelly"]);
    expect(page.requests.slice(1)).toEqual([{ q: "" }, { q: "grace" }]);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(field(page)).toHaveValue("Grace Kelly");
    expect(await value(page)).toBe("3");
    // The select holds its placeholder, the option it started with and the one chosen.
    await expect(page.locator("#clientSelect option")).toHaveText(["No client", "Ada Lovelace", "Grace Kelly"]);

    await page.getByRole("button", { name: "Reset" }).click();
    await expect(field(page)).toHaveValue("Ada Lovelace");
    expect(await value(page)).toBe("1");
  });

  test("says so when a load fails", async ({ page }) => {
    await page.route("**/api/clients*", route => route.fulfill({ status: 500 }));
    await field(page).click();
    await expect(page.locator("#client [hint]")).toHaveText("Couldn't load results");
  });
});
