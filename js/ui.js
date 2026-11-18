export const $ = (id) => document.getElementById(id);
export const esc = (value = "") =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );

let toastTimeout;

export function toast(message) {
  const element = $("toast");
  element.textContent = message;
  element.classList.remove("hidden");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => element.classList.add("hidden"), 3200);
}

export function formatTime(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
