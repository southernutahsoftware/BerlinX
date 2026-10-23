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
// Options can also be set from script: combobox.options = ["Austria", …] or
// [{ value: "at", label: "Austria" }, …]. Add `strict` to make any value that is
// not one of the options invalid; its value, if any, is the error message.

import { c, useEffect, useHost, useId, useRef, useUpdate } from "atomico";
import { follow, setValue } from "./shared.js";

const fold = text => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase();

function combobox({ options, strict }) {
  const host = useHost();
  const list = useRef();
  const update = useUpdate();
  const state = useRef({ open: false, all: false, active: -1 }).current;
  const input = host.current.querySelector(":scope > input");
  const listId = `bx-listbox-${useId()}`;
  // Read through state, so listeners added on the first render see new options.
  state.options = options;

  const allOptions = () =>
    (state.options ?? [...(state.datalist?.options ?? [])]).map(o =>
      typeof o === "string" ? { value: o, label: o } : { value: o.value, label: o.label || o.value },
    );

  // Everything when opened on an exact value, so a chosen option can be changed;
  // otherwise the options containing what was typed, ignoring case and accents.
  const matches = () => {
    const query = fold(input?.value ?? "");
    const all = allOptions();
    return state.all || !query ? all : all.filter(o => fold(o.label).includes(query));
  };

  const open = (all, active = -1) => {
    state.open = true;
    state.all = all && allOptions().some(o => o.value === input.value);
    state.active = active;
    update();
  };

  const close = () => {
    if (!state.open) return;
    state.open = false;
    state.active = -1;
    update();
  };

  const choose = option => {
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
        if (event.altKey) return;
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

    const validate = () => {
      if (strict == null) return;
      const known = !input.value || allOptions().some(o => o.value === input.value);
      input.setCustomValidity(known ? "" : strict || "Choose an option from the list.");
    };

    input.addEventListener("input", onInput);
    input.addEventListener("click", onClick);
    input.addEventListener("blur", onBlur);
    input.addEventListener("keydown", onKey);
    input.addEventListener("change", validate);
    validate();
    return () => {
      input.removeEventListener("input", onInput);
      input.removeEventListener("click", onClick);
      input.removeEventListener("blur", onBlur);
      input.removeEventListener("keydown", onKey);
      input.removeEventListener("change", validate);
    };
  }, [strict]);

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
      <ul role="listbox" id={listId} popover="manual" ref={list} onpointerdown={event => event.preventDefault()}>
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
            No results
          </li>
        )}
      </ul>
    </host>
  );
}

export const Combobox = c(combobox, {
  props: {
    options: { type: Array },
    strict: { type: String },
  },
});

if (!customElements.get("bx-combobox")) customElements.define("bx-combobox", Combobox);
