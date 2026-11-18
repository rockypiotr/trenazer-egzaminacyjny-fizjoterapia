import { isQuestionId } from "./study-data.js";

const STORAGE_KEY = "fizjo_trenazer_exam_v1";
const VERSION = 1;
const HISTORY_LIMIT = 100;
const MAX_TIMESTAMP = 9999999999999;
const MAX_ATTEMPTS = 99999;
const MAX_BACKUP_SIZE = 4e6;

function clip(value, min, max, fallback = min) {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.min(max, Math.max(min, number))
    : fallback;
}

function cleanRecord(record) {
  return {
    right: clip(record.right, 0, MAX_ATTEMPTS),
    wrong: clip(record.wrong, 0, MAX_ATTEMPTS),
    last: clip(record.last, 0, MAX_TIMESTAMP),
  };
}

function cleanCard(card) {
  return {
    reps: clip(card.reps, 0, 999),
    ease: clip(card.ease, 1.3, 3.6, 2.5),
    interval: clip(card.interval, 0, 3650),
    due: clip(card.due, 0, MAX_TIMESTAMP),
    ...cleanRecord(card),
  };
}

function cleanEntries(entries, clean, prefix) {
  if (!entries || typeof entries !== "object") return {};
  return Object.fromEntries(
    Object.entries(entries)
      .filter(
        ([id, entry]) =>
          isQuestionId(id, prefix) && entry && typeof entry === "object",
      )
      .map(([id, entry]) => [id, clean(entry)]),
  );
}

function cleanSummary(summary) {
  return {
    time: clip(summary.time, 0, MAX_TIMESTAMP),
    mode: String(summary.mode || "").slice(0, 24),
    lecture: String(summary.lecture || "").slice(0, 20),
    items: clip(summary.items, 0, 1000),
    autoCorrect: clip(summary.autoCorrect, 0, 1000),
    autoTotal: clip(summary.autoTotal, 0, 1000),
    selfGood: clip(summary.selfGood, 0, 1000),
    selfTotal: clip(summary.selfTotal, 0, 1000),
    wrongIds: Array.isArray(summary.wrongIds)
      ? summary.wrongIds
          .filter((id) => typeof id === "string")
          .slice(0, HISTORY_LIMIT)
      : [],
  };
}

function cleanState(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    version: VERSION,
    cards: cleanEntries(source.cards, cleanCard, "F"),
    records: cleanEntries(source.records, cleanRecord),
    sessions: Array.isArray(source.sessions)
      ? source.sessions
          .slice(-HISTORY_LIMIT)
          .filter((item) => item && typeof item === "object")
          .map(cleanSummary)
      : [],
    theme: source.theme === "dark" ? "dark" : "light",
    bookmarks: Array.isArray(source.bookmarks)
      ? [...new Set(source.bookmarks.filter((id) => isQuestionId(id)))]
      : [],
  };
}

export async function readBackup(file) {
  if (file.size > MAX_BACKUP_SIZE) throw new Error("Plik zbyt duży.");
  const raw = JSON.parse(await file.text());
  if (raw?.version !== VERSION || !raw.cards || !raw.records) {
    throw new Error("Nieprawidłowy plik postępów.");
  }
  return cleanState(raw);
}

export function createProgress() {
  let persistent = true;
  let state;

  try {
    state = cleanState(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"));
  } catch {
    state = cleanState(null);
    persistent = false;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      persistent = true;
    } catch {
      persistent = false;
    }
  }

  function getRecord(question) {
    return state.records[question.id] ?? { right: 0, wrong: 0, last: 0 };
  }

  function record(question, good) {
    const record = getRecord(question);
    if (good) record.right++;
    else record.wrong++;
    record.last = Date.now();
    state.records[question.id] = record;
    save();
  }

  function addSession(summary) {
    state.sessions.push(summary);
    if (state.sessions.length > HISTORY_LIMIT) state.sessions.shift();
    save();
  }

  function isHard(question) {
    return (
      getRecord(question).wrong > 0 ||
      (question.kind === "card" &&
        (state.cards[question.id]?.ease || 2.5) < 2.25)
    );
  }

  function bookmarked(question) {
    return state.bookmarks.includes(question.id);
  }

  function toggleBookmark(id) {
    const index = state.bookmarks.indexOf(id);
    if (index >= 0) state.bookmarks.splice(index, 1);
    else state.bookmarks.push(id);
    save();
    return index < 0;
  }

  return {
    state,
    get persistent() {
      return persistent;
    },
    save,
    getRecord,
    record,
    addSession,
    isHard,
    bookmarked,
    toggleBookmark,
    replace(backup) {
      Object.assign(state, backup);
      save();
    },
    reset() {
      Object.assign(state, cleanState({ theme: state.theme }));
      save();
    },
    exportData() {
      return {
        ...state,
        exported: new Date().toISOString(),
        content: "Progress: fisioterapia studies; no questions exported",
        app_version: VERSION,
      };
    },
  };
}
