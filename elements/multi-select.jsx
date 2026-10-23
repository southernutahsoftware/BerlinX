// <bx-multi-select>: pick several options, shown as removable chips.
//
//   <label stack>
//     Labels
//     <bx-multi-select>
//       <select name="labels" multiple>
//         <option value="bug" selected>Bug</option>
//         <option value="design">Design</option>
//       </select>
//     </bx-multi-select>
//   </label>
//
// Without JavaScript this is the browser's multiple select. With it the select
// is hidden but still holds the choices, so the form submits, resets and
// validates as before; a field shows the chosen options as chips, and typing in
// it filters a list where each option toggles on and off.
//
// Keys: arrows move through the list and open it, Enter toggles an option,
// Backspace in the empty field removes the last chip, Escape closes the list.

import { c, useEffect, useHost, useId, useRef, useUpdate } from "atomico";
import { useLabels } from "./use-labels.js";
import { fold, follow, labelOf, standIn } from "./shared.js";

const crossIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

function multiSelect({ placeholder }) {
  const host = useHost();
  const update = useUpdate();
  const labels = useLabels();
  const field = useRef();
  const search = useRef();
  const list = useRef();
  const state = useRef({ open: false, active: -1, query: "" }).current;
  const listId = `bx-listbox-${useId()}`;
  const select = host.current.querySelector(":scope > select");

  const options = () => [...(select?.options ?? [])];
  const matches = () => {
    const query = fold(state.query);
    return options().filter(o => !query || fold(o.label).includes(query));
  };

  const changed = () => {
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const toggle = (option, selected = !option.selected) => {
    if (option.disabled || option.selected === selected) return;
    option.selected = selected;
    changed();
    update();
  };

  const open = (active = state.active) => {
    state.open = true;
    state.active = active;
    update();
  };

  const close = () => {
    if (!state.open) return;
    state.open = false;
    state.active = -1;
    update();
  };

  const onKey = event => {
    const items = matches();
    const last = items.length - 1;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const down = event.key === "ArrowDown";
      if (!state.open) return open(down ? 0 : last);
      if (last < 0) return;
      state.active = down ? (state.active >= last ? 0 : state.active + 1) : state.active <= 0 ? last : state.active - 1;
      update();
    } else if (event.key === "Enter" && state.open && items[state.active]) {
      event.preventDefault();
      toggle(items[state.active]);
    } else if (event.key === "Escape" && state.open) {
      event.preventDefault();
      close();
    } else if (event.key === "Backspace" && !search.current.value) {
      const chosen = options().filter(o => o.selected && !o.disabled);
      if (chosen.length) toggle(chosen.at(-1), false);
    } else if (event.key === "Tab") {
      close();
    }
  };

  useEffect(() => {
    if (!select) return;
    const stopStandIn = standIn(select, () => search.current);
    const sync = () => {
      if (select.validity.valid) field.current?.removeAttribute("aria-invalid");
      update();
    };
    const onInvalid = () => field.current?.setAttribute("aria-invalid", "true");
    const onReset = () => setTimeout(sync);
    select.addEventListener("change", sync);
    select.addEventListener("invalid", onInvalid);
    select.form?.addEventListener("reset", onReset);
    return () => {
      stopStandIn();
      select.removeEventListener("change", sync);
      select.removeEventListener("invalid", onInvalid);
      select.form?.removeEventListener("reset", onReset);
    };
  }, []);

  useEffect(() => {
    const listbox = list.current;
    if (!listbox || !field.current) return;
    const shown = listbox.matches(":popover-open");
    if (state.open && !shown) {
      listbox.style.minWidth = `${field.current.offsetWidth}px`;
      listbox.showPopover();
      state.unfollow = follow(listbox, field.current);
    } else if (!state.open && shown) {
      listbox.hidePopover();
      state.unfollow?.();
    }
    listbox.querySelector("[active]")?.scrollIntoView({ block: "nearest" });
  });

  if (!select) return <host />;

  const chosen = options().filter(o => o.selected);
  const items = state.open ? matches() : [];
  const active = items[state.active] ? `${listId}-${state.active}` : null;

  return (
    <host>
      <div bx-field="" ref={field} onclick={event => !event.target.closest("button, input") && search.current.focus()}>
        {/* Chips have a wrapper of their own, so adding or removing one never
            replaces the text field after them (and the focus in it). */}
        <span bx-chips="">
          {chosen.map(option => (
            <span badge="" secondary="">
              {option.label}
              {!option.disabled && (
                <button
                  type="button"
                  aria-label={labels.remove(option.label)}
                  disabled={select.disabled}
                  onclick={() => {
                    toggle(option, false);
                    search.current.focus();
                  }}
                >
                  {crossIcon()}
                </button>
              )}
            </span>
          ))}
        </span>
        <input
          ref={search}
          type="text"
          role="combobox"
          autocomplete="off"
          aria-autocomplete="list"
          aria-expanded={String(state.open)}
          aria-controls={listId}
          aria-activedescendant={active}
          aria-label={labelOf(select, host.current) || null}
          placeholder={chosen.length ? null : placeholder}
          value={state.query}
          disabled={select.disabled}
          oninput={event => {
            state.query = event.target.value;
            open(0);
          }}
          onclick={() => !state.open && open(-1)}
          onblur={close}
          onkeydown={onKey}
        />
      </div>
      <ul role="listbox" aria-multiselectable="true" id={listId} popover="manual" ref={list} onpointerdown={event => event.preventDefault()}>
        {items.map((option, i) => (
          <li
            role="option"
            id={`${listId}-${i}`}
            aria-selected={String(option.selected)}
            aria-disabled={option.disabled ? "true" : null}
            active={i === state.active ? "" : null}
            onclick={() => {
              state.active = i;
              toggle(option);
            }}
          >
            {option.label}
          </li>
        ))}
        {state.open && !items.length && (
          <li role="presentation" hint="">
            {labels.noResults}
          </li>
        )}
      </ul>
    </host>
  );
}

export const MultiSelect = c(multiSelect, {
  props: {
    placeholder: { type: String },
  },
});

if (!customElements.get("bx-multi-select")) customElements.define("bx-multi-select", MultiSelect);
