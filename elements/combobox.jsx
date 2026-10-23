// <bx-combobox>: a text input that suggests options as you type.
//
//   <label stack>
//     Country
//     <bx-combobox>
//       <input name="country" list="countries" />
//       <datalist id="countries">
//         <option value="Austria"></option>
//         <option value="Germany"></option>
//       </datalist>
//     </bx-combobox>
//   </label>
//
// Without JavaScript the browser shows its own datalist suggestions. With it the
// list becomes a styled listbox with arrow keys and filtering. The input keeps
// its name, value and validation, so the form submits exactly as before.
//
// Options can also come from script:
//   combobox.options = ["Austria", { value: "de", label: "Germany" }];
//   combobox.load = (query, { signal }) => fetch(`/api?q=${query}`, { signal }).then(r => r.json());
// load() is called as the person types, a moment after they pause, and its
// options are shown as they come back, unfiltered.
//
// Add `strict` to make any value that is not one of the options invalid; its
// value, if any, is the error message.

import { c, useEffect, useHost, useId, useRef, useUpdate } from "atomico";
import { useLabels } from "./use-labels.js";
import { fold, follow, setValue } from "./shared.js";

const DELAY = 200;

const normalize = list => (list ?? []).map(o => (typeof o === "string" ? { value: o, label: o } : { value: o.value, label: o.label || o.value }));

function combobox({ options, load, strict }) {
  const host = useHost();
  const list = useRef();
  const update = useUpdate();
  const labels = useLabels();
  const state = useRef({ open: false, all: false, active: -1, loaded: [], loading: false, chosen: null }).current;
  const input = host.current.querySelector(":scope > input");
  const listId = `bx-listbox-${useId()}`;

  // Read through state, so listeners added on the first render see new values.
  Object.assign(state, { options, load, strict });

  const allOptions = () => (state.load ? state.loaded : normalize(state.options ?? [...(state.datalist?.options ?? [])]));

  // Loaded options are already matched by whoever loaded them. Otherwise:
  // everything when opened on an exact value, so a chosen option can be changed,
  // or the options containing what was typed, ignoring case and accents.
  const matches = () => {
    const all = allOptions();
    const query = fold(input?.value ?? "");
    return state.load || state.all || !query ? all : all.filter(o => fold(o.label).includes(query));
  };

  const fetchOptions = () => {
    if (!state.load) return;
    clearTimeout(state.timer);
    state.controller?.abort();
    state.loading = true;
    const query = input.value;
    state.timer = setTimeout(async () => {
      const controller = (state.controller = new AbortController());
      try {
        const result = await state.load(query, { signal: controller.signal });
        if (controller.signal.aborted) return;
        state.loaded = normalize(result);
      } catch (error) {
        if (controller.signal.aborted) return;
        state.loaded = [];
        console.error(error);
      }
      state.loading = false;
      state.active = Math.min(state.active, state.loaded.length - 1);
      update();
    }, DELAY);
  };

  const open = (all, active = -1) => {
    state.open = true;
    state.all = all && allOptions().some(o => o.value === input.value);
    state.active = active;
    fetchOptions();
    update();
  };

  const close = () => {
    if (!state.open) return;
    state.open = false;
    state.active = -1;
    clearTimeout(state.timer);
    state.controller?.abort();
    state.loading = false;
    update();
  };

  const choose = option => {
    state.chosen = option.value;
    setValue(input, option.value);
    close();
  };

  useEffect(() => {
    if (!input) return;
    state.datalist = input.list ?? host.current.querySelector("datalist");
    input.removeAttribute("list");
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", listId);
    input.autocomplete = "off";

    const onInput = () => open(false);
    const onClick = () => !state.open && open(true);
    const onBlur = () => close();

    const onKey = event => {
      const items = matches();
      const last = items.length - 1;
      const selected = items.findIndex(o => o.value === input.value);

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const down = event.key === "ArrowDown";
        if (!state.open) return open(true, event.altKey ? -1 : down ? Math.max(selected, 0) : last);
        if (event.altKey || last < 0) return;
        state.active = down ? (state.active >= last ? 0 : state.active + 1) : state.active <= 0 ? last : state.active - 1;
        update();
      } else if (event.key === "Enter" && state.open && items[state.active]) {
        event.preventDefault();
        choose(items[state.active]);
      } else if (event.key === "Escape" && state.open) {
        // Closing the list is all Escape does; it does not also close a dialog.
        event.preventDefault();
        close();
      } else if (event.key === "Tab") {
        close();
      }
    };

    // A value is known when it is an option, or the option last chosen (loaded
    // options come and go with each query).
    const validate = () => {
      if (state.strict == null) return input.setCustomValidity("");
      const known = !input.value || input.value === state.chosen || allOptions().some(o => o.value === input.value);
      input.setCustomValidity(known ? "" : state.strict || labels.invalidOption);
    };

    input.addEventListener("input", onInput);
    input.addEventListener("click", onClick);
    input.addEventListener("blur", onBlur);
    input.addEventListener("keydown", onKey);
    input.addEventListener("change", validate);
    validate();
    return () => {
      close();
      input.removeEventListener("input", onInput);
      input.removeEventListener("click", onClick);
      input.removeEventListener("blur", onBlur);
      input.removeEventListener("keydown", onKey);
      input.removeEventListener("change", validate);
    };
  }, []);

  // Show, place and hide the listbox to match the state after each render.
  useEffect(() => {
    const listbox = list.current;
    if (!input || !listbox) return;
    const shown = listbox.matches(":popover-open");
    input.setAttribute("aria-expanded", String(state.open));

    if (state.open && !shown) {
      listbox.style.minWidth = `${input.offsetWidth}px`;
      listbox.showPopover();
      state.unfollow = follow(listbox, input);
    } else if (!state.open && shown) {
      listbox.hidePopover();
      state.unfollow?.();
    }

    const active = listbox.querySelector("[active]");
    if (active) {
      input.setAttribute("aria-activedescendant", active.id);
      active.scrollIntoView({ block: "nearest" });
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  });

  const items = state.open ? matches() : [];

  return (
    <host>
      <ul
        role="listbox"
        id={listId}
        popover="manual"
        ref={list}
        aria-busy={state.loading ? "true" : null}
        onpointerdown={event => event.preventDefault()}
      >
        {items.map((option, i) => (
          <li
            role="option"
            id={`${listId}-${i}`}
            aria-selected={String(option.value === input?.value)}
            active={i === state.active ? "" : null}
            onclick={() => choose(option)}
          >
            {option.label}
          </li>
        ))}
        {state.open && !items.length && (
          <li role="presentation" hint="">
            {state.loading ? labels.loading : labels.noResults}
          </li>
        )}
      </ul>
    </host>
  );
}

export const Combobox = c(combobox, {
  props: {
    options: { type: Array },
    load: { type: Function },
    strict: { type: String },
  },
});

if (!customElements.get("bx-combobox")) customElements.define("bx-combobox", Combobox);
