// <bx-command>: a command palette, opened with Ctrl+K or ⌘K.
//
//   <bx-command>
//     <dialog>
//       <small>Invoices</small>
//       <a href="/invoices/new">New invoice <kbd>N</kbd></a>
//       <button>Export as CSV</button>
//       <small>Go to</small>
//       <a href="/clients">Clients</a>
//     </dialog>
//   </bx-command>
//
// The commands are the dialog's links and buttons, written like a menu: <small>
// starts a group. The element adds a search field that filters them, arrow keys
// and Enter. Choosing a command closes the palette and clicks it, so links
// navigate and buttons run their own handlers.
//
// Open it with the shortcut (shortcut="p" for Ctrl+P instead, shortcut="" for
// none), with palette.show(), or as any dialog: dialog.showModal() or a button
// with commandfor and command="show-modal".

import { c, useEffect, useHost } from "atomico";
import { labels } from "./labels.js";
import { useLabels } from "./use-labels.js";
import { fold, idOf } from "./shared.js";

// Move the commands into a listbox under a search field, grouped under each
// <small>. A listbox may only hold options and groups, so separators go.
function build(dialog) {
  const listbox = document.createElement("div");
  listbox.setAttribute("role", "listbox");
  idOf(listbox, "bx-commands");
  let group = listbox;
  for (const node of [...dialog.children]) {
    if (node.matches("small")) {
      group = document.createElement("div");
      group.setAttribute("role", "group");
      group.setAttribute("aria-labelledby", idOf(node, "bx-group"));
      listbox.append(group);
      group.append(node);
    } else if (node.matches("a[href], button")) {
      node.setAttribute("role", "option");
      node.tabIndex = -1;
      idOf(node, "bx-command");
      group.append(node);
    }
  }

  const input = document.createElement("input");
  input.type = "text";
  input.autofocus = true;
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-expanded", "true");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", listbox.id);

  const empty = document.createElement("p");
  empty.setAttribute("hint", "");
  empty.hidden = true;

  dialog.replaceChildren(input, listbox, empty);
}

function command({ shortcut = "k" }) {
  const host = useHost();
  useLabels();

  useEffect(() => {
    const dialog = host.current.querySelector(":scope > dialog");
    if (!dialog) return;
    if (!dialog.querySelector(":scope > [role=listbox]")) build(dialog);
    const [input, listbox, empty] = dialog.children;

    const commands = () => [...listbox.querySelectorAll("[role=option]")];
    const visible = () => commands().filter(el => !el.hidden);

    const activate = el => {
      for (const option of commands()) option.toggleAttribute("active", option === el);
      if (el) {
        input.setAttribute("aria-activedescendant", el.id);
        el.scrollIntoView({ block: "nearest" });
      } else {
        input.removeAttribute("aria-activedescendant");
      }
    };

    const filter = () => {
      const query = fold(input.value.trim());
      for (const el of commands()) el.hidden = !!query && !fold(el.textContent).includes(query);
      for (const group of listbox.querySelectorAll("[role=group]")) group.hidden = !group.querySelector("[role=option]:not([hidden])");
      const shown = visible();
      empty.hidden = shown.length > 0;
      activate(shown[0]);
    };

    const onKey = event => {
      const shown = visible();
      const index = shown.findIndex(el => el.hasAttribute("active"));
      if ((event.key === "ArrowDown" || event.key === "ArrowUp") && shown.length) {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        activate(shown[(index + step + shown.length) % shown.length]);
      } else if (event.key === "Enter" && shown[index]) {
        event.preventDefault();
        shown[index].click();
      }
    };

    const onPointer = event => {
      const el = event.target.closest("[role=option]");
      if (el && !el.hasAttribute("active")) activate(el);
    };

    // Runs after the command's own click handlers; a link then navigates.
    const onClick = event => {
      if (event.target.closest("[role=option]")) dialog.close();
    };

    // Each time it opens, it opens fresh.
    const onClose = () => {
      input.value = "";
      filter();
    };

    const onShortcut = event => {
      if (!shortcut || !(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== shortcut.toLowerCase()) return;
      event.preventDefault();
      if (dialog.open) dialog.close();
      else dialog.showModal();
    };

    filter();
    input.addEventListener("input", filter);
    input.addEventListener("keydown", onKey);
    listbox.addEventListener("pointermove", onPointer);
    listbox.addEventListener("click", onClick);
    dialog.addEventListener("close", onClose);
    document.addEventListener("keydown", onShortcut);
    return () => {
      input.removeEventListener("input", filter);
      input.removeEventListener("keydown", onKey);
      listbox.removeEventListener("pointermove", onPointer);
      listbox.removeEventListener("click", onClick);
      dialog.removeEventListener("close", onClose);
      document.removeEventListener("keydown", onShortcut);
    };
  }, [shortcut]);

  // The words follow the labels.
  useEffect(() => {
    const dialog = host.current.querySelector(":scope > dialog");
    const [input, , empty] = dialog?.children ?? [];
    if (!input) return;
    input.placeholder = labels.searchCommands;
    empty.textContent = labels.noResults;
    if (!dialog.hasAttribute("aria-labelledby") && (!dialog.hasAttribute("aria-label") || dialog.hasAttribute("bx-label"))) {
      dialog.setAttribute("aria-label", labels.commands);
      dialog.setAttribute("bx-label", "");
    }
  });

  return <host />;
}

export class Command extends c(command, { props: { shortcut: { type: String } } }) {
  /** Open the palette. */
  show() {
    this.querySelector(":scope > dialog")?.showModal();
  }

  /** Close the palette. */
  close() {
    this.querySelector(":scope > dialog")?.close();
  }
}

if (!customElements.get("bx-command")) customElements.define("bx-command", Command);
