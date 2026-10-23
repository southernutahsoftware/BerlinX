// <bx-select>: a single choice you can search, from the page or a server.
//
//   <label stack>
//     Client
//     <bx-select src="/api/clients">
//       <select name="client" required>
//         <option value="">Choose a client</option>
//         <option value="42" selected>Ada Lovelace</option>
//       </select>
//     </bx-select>
//   </label>
//
// Without JavaScript this is the browser's select. With it the select is hidden
// but still holds the choice, so the form submits, resets and validates as
// before; a text field shows the chosen option and, as you type, filters a list
// of the others. The value submitted is the option's value, the text shown its
// label, so a list of records can be searched by name and submit an id.
//
// Options come from the <select>, or from a server:
//
//   src="/api/clients"  fetched with ?q= for what was typed, answering a JSON
//                       array of options: "Oslo" or { value: "42", label: "Ada" }.
//   select.load = (query, { signal }) => …
//                       the same, written by hand.
//
// Loaded options are shown as they come back, unfiltered. The one chosen is
// added to the select as an <option>, so the form has it.
//
// An option with an empty value is the placeholder: it is not listed, and
// clearing the text and leaving the field chooses it.
//
// Keys: arrows open the list and move through it, Enter chooses, Escape closes
// it and puts back the chosen option's text.

import { c, useEffect, useHost, useId, useRef, useUpdate } from "atomico";
import { useLabels } from "./use-labels.js";
import { fold, follow, getJSON, labelOf, standIn } from "./shared.js";

const DELAY = 200;

const normalize = list =>
  (list ?? []).map(o => (typeof o === "string" ? { value: o, label: o } : { value: String(o.value), label: String(o.label ?? o.value) }));

function select({ placeholder, src, load }) {
  const host = useHost();
  const update = useUpdate();
  const labels = useLabels();
  const field = useRef();
  const list = useRef();
  const state = useRef({ open: false, active: -1, query: "", typed: false, loaded: [], loading: false, failed: false }).current;
  const listId = `bx-listbox-${useId()}`;
  const control = host.current.querySelector(":scope > select");

  // Read through state, so listeners added on the first render see new values.
  state.load = load ?? (src && ((q, { signal }) => getJSON(src, { q }, signal)));

  const chosen = () => control?.selectedOptions[0];
  const blank = () => [...(control?.options ?? [])].find(o => o.value === "");

  // Loaded options are already matched by whoever loaded them. Otherwise the
  // select's options, without the placeholder, that contain what was typed.
  const matches = () => {
    if (state.load) return state.loaded;
    const query = state.typed ? fold(state.query) : "";
    return [...control.options]
      .filter(o => o.value !== "" && !o.hidden && (!query || fold(o.label).includes(query)))
      .map(o => ({ value: o.value, label: o.label, disabled: o.disabled }));
  };

  const fetchOptions = () => {
    if (!state.load) return;
    clearTimeout(state.timer);
    state.controller?.abort();
    state.loading = true;
    const query = state.typed ? state.query : "";
    state.timer = setTimeout(async () => {
      const controller = (state.controller = new AbortController());
      try {
        const result = await state.load(query, { signal: controller.signal });
        if (controller.signal.aborted) return;
        state.loaded = normalize(result);
        state.failed = false;
      } catch (error) {
        if (controller.signal.aborted) return;
        state.loaded = [];
        state.failed = true;
        console.error(error);
      }
      state.loading = false;
      state.active = Math.min(state.active, state.loaded.length - 1);
      update();
    }, DELAY);
  };

  const changed = () => {
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
  };

  // Opened by a click or an arrow, the list shows every option with the chosen
  // one active; typing then narrows it.
  const open = (active = -1) => {
    state.open = true;
    state.active = active;
    fetchOptions();
    update();
  };

  // Closing drops what was typed, putting back the chosen option's text.
  const close = () => {
    if (!state.open && !state.typed) return;
    state.open = false;
    state.active = -1;
    state.typed = false;
    state.query = "";
    clearTimeout(state.timer);
    state.controller?.abort();
    state.loading = false;
    update();
  };

  const choose = option => {
    if (!option || option.disabled) return;
    let element = [...control.options].find(o => o.value === option.value);
    if (!element) {
      // A loaded option: the select keeps its placeholder, the option it started
      // with (for a form reset) and this one.
      for (const o of [...control.options]) if (o.value !== "" && !o.defaultSelected) o.remove();
      element = new Option(option.label, option.value);
      control.add(element);
    }
    if (!element.selected) {
      element.selected = true;
      changed();
    }
    close();
  };

  const onKey = event => {
    const items = state.open ? matches() : [];
    const last = items.length - 1;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const down = event.key === "ArrowDown";
      if (!state.open) {
        const current = matches().findIndex(o => o.value === control.value);
        return open(state.load ? -1 : current >= 0 ? current : down ? 0 : last);
      }
      if (last < 0) return;
      state.active = down ? (state.active >= last ? 0 : state.active + 1) : state.active <= 0 ? last : state.active - 1;
      update();
    } else if (event.key === "Enter" && state.open) {
      event.preventDefault();
      if (items[state.active]) choose(items[state.active]);
    } else if (event.key === "Escape" && (state.open || state.typed)) {
      // Closing the list is all Escape does; it does not also close a dialog.
      event.preventDefault();
      close();
    }
  };

  // Leaving the field: an emptied field chooses the placeholder, if there is
  // one; anything else typed and not chosen is dropped.
  const onBlur = () => {
    const empty = blank();
    if (state.typed && !state.query.trim() && empty && !empty.selected) {
      empty.selected = true;
      changed();
    }
    close();
  };

  useEffect(() => {
    if (!control) return;
    const stopStandIn = standIn(control, () => field.current);
    const sync = () => {
      if (control.validity.valid) field.current?.removeAttribute("aria-invalid");
      update();
    };
    const onInvalid = () => field.current?.setAttribute("aria-invalid", "true");
    const onReset = () => setTimeout(sync);
    control.addEventListener("change", sync);
    control.addEventListener("invalid", onInvalid);
    control.form?.addEventListener("reset", onReset);
    return () => {
      stopStandIn();
      clearTimeout(state.timer);
      state.controller?.abort();
      control.removeEventListener("change", sync);
      control.removeEventListener("invalid", onInvalid);
      control.form?.removeEventListener("reset", onReset);
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

  if (!control) return <host />;

  const current = chosen();
  const text = current && current.value !== "" ? current.label : "";
  const items = state.open ? matches() : [];
  const active = items[state.active] ? `${listId}-${state.active}` : null;

  return (
    <host>
      <input
        ref={field}
        type="text"
        bx-field=""
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        aria-expanded={String(state.open)}
        aria-controls={listId}
        aria-activedescendant={active}
        aria-label={labelOf(control, host.current) || null}
        aria-required={control.required ? "true" : null}
        placeholder={placeholder ?? blank()?.label ?? null}
        value={state.typed ? state.query : text}
        disabled={control.disabled}
        oninput={event => {
          state.typed = true;
          state.query = event.target.value;
          open(state.load ? -1 : 0);
        }}
        onclick={event => {
          if (state.open) return;
          event.target.select();
          const index = matches().findIndex(o => o.value === control.value);
          open(state.load ? -1 : index);
        }}
        onblur={onBlur}
        onkeydown={onKey}
      />
      <ul role="listbox" id={listId} popover="manual" ref={list} aria-busy={state.loading ? "true" : null} onpointerdown={event => event.preventDefault()}>
        {items.map((option, i) => (
          <li
            role="option"
            id={`${listId}-${i}`}
            aria-selected={String(option.value === control.value)}
            aria-disabled={option.disabled ? "true" : null}
            active={i === state.active ? "" : null}
            onclick={() => choose(option)}
          >
            {option.label}
          </li>
        ))}
        {state.open && !items.length && (
          <li role="presentation" hint="">
            {state.loading ? labels.loading : state.failed ? labels.loadFailed : labels.noResults}
          </li>
        )}
      </ul>
    </host>
  );
}

export const Select = c(select, {
  props: {
    placeholder: { type: String },
    src: { type: String },
    load: { type: Function },
  },
});

if (!customElements.get("bx-select")) customElements.define("bx-select", Select);
