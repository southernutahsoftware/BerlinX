// <bx-date-picker>: a button that opens a calendar.
//
//   <label stack>
//     Due date
//     <bx-date-picker>
//       <input type="date" name="due" min="2026-01-01" required />
//     </bx-date-picker>
//   </label>
//
// Without JavaScript this is the browser's date input. With it the input is
// hidden but still holds the value, so the form submits and validates as before;
// a button shows the date in the reader's language and opens a calendar.
//
// Attributes: placeholder="Pick a date", week-start="0" (Sunday) to "6"
// (Saturday); the week otherwise starts where the page's language says it does.

import { c, useEffect, useHost, useId, useRef, useUpdate } from "atomico";
import { follow, langOf, setValue } from "./shared.js";

// Dates are UTC midnights, so adding days never meets a daylight-saving change.
const DAY = 864e5;
const parse = value => (/^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? new Date(`${value}T00:00Z`) : null);
const iso = date => date.toISOString().slice(0, 10);
const addDays = (date, days) => new Date(date.getTime() + days * DAY);
const sameDay = (a, b) => a && b && a.getTime() === b.getTime();
const monthOf = date => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

function addMonths(date, months) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)));
}

function today() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

// Intl knows where each region starts its week; engines without getWeekInfo
// fall back to Monday, or Sunday for the regions that use it.
function weekStartFor(lang) {
  try {
    const locale = new Intl.Locale(lang);
    const info = locale.getWeekInfo?.() ?? locale.weekInfo;
    if (info) return info.firstDay % 7;
    return ["US", "CA", "MX", "BR", "JP", "KR", "IL", "IN", "PH"].includes(locale.maximize().region) ? 0 : 1;
  } catch {
    return 1;
  }
}

// The text that labels the hidden input, without the picker's own button text.
function labelOf(input, host) {
  if (input.hasAttribute("aria-label")) return input.getAttribute("aria-label");
  const ids = input.getAttribute("aria-labelledby");
  const nodes = ids
    ? ids.split(/\s+/).map(id => document.getElementById(id)).filter(Boolean)
    : [...(input.labels?.[0]?.childNodes ?? [])].filter(node => !node.contains(host));
  return nodes.map(node => node.textContent).join(" ").replace(/\s+/g, " ").trim();
}

const icon = path => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    {path}
  </svg>
);

function datePicker({ placeholder, weekStart }) {
  const host = useHost();
  const update = useUpdate();
  const popover = useRef();
  const trigger = useRef();
  const state = useRef({ focus: today(), moveFocus: false }).current;
  const id = `bx-calendar-${useId()}`;
  const input = host.current.querySelector(":scope > input");

  const lang = langOf(host.current);
  const value = parse(input?.value);
  const min = parse(input?.min);
  const max = parse(input?.max);
  const allowed = day => !(min && day < min) && !(max && day > max);
  const clamp = day => (min && day < min ? min : max && day > max ? max : day);
  const start = Number.isInteger(weekStart) ? weekStart % 7 : weekStartFor(lang);

  const format = options => new Intl.DateTimeFormat(lang, { timeZone: "UTC", ...options });
  const label = input ? labelOf(input, host.current) : "";
  const text = value ? format({ dateStyle: "medium" }).format(value) : placeholder || "Pick a date";

  const choose = day => {
    setValue(input, day ? iso(day) : "");
    popover.current.hidePopover();
    update();
  };

  const moveTo = (day, moveFocus) => {
    state.focus = clamp(day);
    state.moveFocus = moveFocus;
    update();
  };

  useEffect(() => {
    if (!input) return;
    // The input stays in the form for its value and validation, out of sight and
    // out of the tab order; the button stands in for it.
    input.tabIndex = -1;
    input.setAttribute("visually-hidden", "");
    input.setAttribute("aria-hidden", "true");

    const sync = () => {
      if (input.validity.valid) trigger.current?.removeAttribute("aria-invalid");
      update();
    };
    const onInvalid = () => trigger.current?.setAttribute("aria-invalid", "true");
    const onFocus = () => trigger.current?.focus();
    const onReset = () => setTimeout(sync);

    input.addEventListener("change", sync);
    input.addEventListener("invalid", onInvalid);
    input.addEventListener("focus", onFocus);
    input.form?.addEventListener("reset", onReset);
    return () => {
      input.removeEventListener("change", sync);
      input.removeEventListener("invalid", onInvalid);
      input.removeEventListener("focus", onFocus);
      input.form?.removeEventListener("reset", onReset);
    };
  }, []);

  // Keyboard moves land on a day that is only rendered afterwards.
  useEffect(() => {
    if (!state.moveFocus) return;
    state.moveFocus = false;
    popover.current?.querySelector('td > [tabindex="0"]')?.focus();
  });

  const onBeforeToggle = event => {
    if (event.newState !== "open") return state.unfollow?.();
    state.focus = clamp(value ?? today());
    update();
    requestAnimationFrame(() => {
      state.unfollow = follow(popover.current, trigger.current);
      popover.current.querySelector('td > [tabindex="0"]')?.focus();
    });
  };

  const onGridKey = event => {
    const day = state.focus;
    const rtl = getComputedStyle(host.current).direction === "rtl";
    const intoWeek = (day.getUTCDay() - start + 7) % 7;
    const steps = { ArrowLeft: rtl ? 1 : -1, ArrowRight: rtl ? -1 : 1, ArrowUp: -7, ArrowDown: 7, Home: -intoWeek, End: 6 - intoWeek };

    if (event.key in steps) moveTo(addDays(day, steps[event.key]), true);
    else if (event.key === "PageUp" || event.key === "PageDown") moveTo(addMonths(day, (event.key === "PageUp" ? -1 : 1) * (event.shiftKey ? 12 : 1)), true);
    else return;
    event.preventDefault();
  };

  // Six weeks always, so the calendar keeps its height from month to month.
  const month = monthOf(state.focus);
  const first = addDays(month, -((month.getUTCDay() - start + 7) % 7));
  const days = Array.from({ length: 42 }, (_, i) => addDays(first, i));
  const weeks = Array.from({ length: 6 }, (_, i) => days.slice(i * 7, i * 7 + 7));
  const weekday = format({ weekday: "short" });
  const weekdayLong = format({ weekday: "long" });
  const dayLabel = format({ dateStyle: "full" });
  const next = addMonths(month, 1);
  const now = today();

  return (
    <host>
      <button
        type="button"
        ref={trigger}
        popovertarget={id}
        aria-haspopup="dialog"
        aria-label={label ? `${label}, ${text}` : text}
      >
        {icon([<path d="M8 2v4" />, <path d="M16 2v4" />, <rect width="18" height="18" x="3" y="4" rx="2" />, <path d="M3 10h18" />])}
        <span muted={value ? null : ""}>{text}</span>
      </button>
      <div popover="auto" id={id} role="dialog" aria-label={label || "Choose a date"} calendar="" ref={popover} onbeforetoggle={onBeforeToggle}>
        <header>
          <button
            type="button"
            icon=""
            ghost=""
            aria-label="Previous month"
            disabled={!!min && addDays(month, -1) < min}
            onclick={() => moveTo(addMonths(state.focus, -1), false)}
          >
            {icon(<path d="m15 18-6-6 6-6" />)}
          </button>
          <h2 id={`${id}-title`} aria-live="polite">
            {format({ month: "long", year: "numeric" }).format(month)}
          </h2>
          <button
            type="button"
            icon=""
            ghost=""
            aria-label="Next month"
            disabled={!!max && next > max}
            onclick={() => moveTo(addMonths(state.focus, 1), false)}
          >
            {icon(<path d="m9 18 6-6-6-6" />)}
          </button>
        </header>
        <table role="grid" aria-labelledby={`${id}-title`} onkeydown={onGridKey}>
          <thead>
            <tr>
              {weeks[0].map(day => (
                <th scope="col" abbr={weekdayLong.format(day)}>
                  {weekday.format(day)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map(week => (
              <tr>
                {week.map(day => (
                  <td>
                    <button
                      type="button"
                      tabindex={sameDay(day, state.focus) ? "0" : "-1"}
                      aria-label={dayLabel.format(day)}
                      aria-pressed={sameDay(day, value) ? "true" : null}
                      aria-current={sameDay(day, now) ? "date" : null}
                      outside={day.getUTCMonth() === month.getUTCMonth() ? null : ""}
                      disabled={!allowed(day)}
                      onclick={() => choose(day)}
                    >
                      {day.getUTCDate()}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <footer>
          <button type="button" ghost="" disabled={!allowed(now)} onclick={() => choose(now)}>
            Today
          </button>
          {!input?.required && (
            <button type="button" ghost="" disabled={!value} onclick={() => choose(null)}>
              Clear
            </button>
          )}
        </footer>
      </div>
    </host>
  );
}

export const DatePicker = c(datePicker, {
  props: {
    placeholder: { type: String },
    weekStart: { type: Number },
  },
});

if (!customElements.get("bx-date-picker")) customElements.define("bx-date-picker", DatePicker);
