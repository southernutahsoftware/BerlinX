// confirm(): ask a yes-or-no question in a BerlinX dialog, and wait for the answer.
//
//   import { confirm } from "berlinx/elements";
//
//   if (await confirm("Discard your changes?")) discard();
//
//   const ok = await confirm({
//     title: "Delete invoice #1024?",
//     message: "This cannot be undone.",
//     confirm: "Delete",
//     destructive: true,
//   });
//
// Options: title, message, confirm (button text, default labels.confirm), cancel
// (default labels.cancel), destructive (a red confirm button, and focus starts on
// Cancel so Enter cannot destroy anything by accident).
//
// Resolves true for the confirm button; false for Cancel or Escape.

import { labels } from "./labels.js";

let count = 0;

function text(tag, content, id) {
  const el = document.createElement(tag);
  el.id = id;
  el.textContent = content;
  return el;
}

/** Ask a question. Takes a message, or an options object. Resolves to a boolean. */
export function confirm(options) {
  const { title, message = "", confirm = labels.confirm, cancel = labels.cancel, destructive = false } =
    typeof options === "string" ? { message: options } : options;
  const id = `bx-confirm-${++count}`;

  const dialog = document.createElement("dialog");
  dialog.setAttribute("bx-confirm", "");
  if (destructive) dialog.setAttribute("role", "alertdialog");

  // method="dialog" closes with the pressed button's value: no listeners needed.
  const form = document.createElement("form");
  form.method = "dialog";
  if (title) {
    form.append(text("h2", title, `${id}-title`));
    dialog.setAttribute("aria-labelledby", `${id}-title`);
  }
  if (message) {
    form.append(text("p", message, `${id}-message`));
    dialog.setAttribute(title ? "aria-describedby" : "aria-labelledby", `${id}-message`);
  }

  const footer = document.createElement("footer");
  const no = document.createElement("button");
  no.value = "cancel";
  no.setAttribute("outline", "");
  no.textContent = cancel;
  const yes = document.createElement("button");
  yes.value = "confirm";
  yes.setAttribute(destructive ? "destructive" : "primary", "");
  yes.textContent = confirm;
  (destructive ? no : yes).autofocus = true;
  footer.append(no, yes);
  form.append(footer);
  dialog.append(form);

  document.body.append(dialog);
  return new Promise(resolve => {
    dialog.addEventListener(
      "close",
      () => {
        resolve(dialog.returnValue === "confirm");
        dialog.remove();
      },
      { once: true },
    );
    dialog.showModal();
  });
}
