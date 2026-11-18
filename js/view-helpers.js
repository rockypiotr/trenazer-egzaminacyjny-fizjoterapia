import { esc } from "./ui.js";
export const DIFS = { basic: "Podstawowy", medium: "Średni", hard: "Trudny" };
export const TYPE_LABELS = {
  card: "Fiszka",
  quiz: "Quiz",
  open: "Odpowiedź otwarta",
  case: "Przypadek",
};
export function pageRef(q, setsById) {
  return `${esc(setsById.get(q.lecture).label)} · slajd${/[,–-]/.test(String(q.slide)) ? "y" : ""} ${esc(q.slide)}`;
}
export function section(title, right = "") {
  return `<div class="section-head"><h2>${title}</h2>${right}</div>`;
}
export const lectureTitle = ({ label, title }) => `${label} · ${title}`;
