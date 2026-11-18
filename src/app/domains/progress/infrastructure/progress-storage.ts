import { isQuestionId } from '../../question-bank/domain/questions';
import type { SessionSummary } from '../../study/domain/study.models';
import type { AnswerRecord, CardRecord, ProgressState } from '../domain/progress.models';

export const STORAGE_KEY = "fizjo_trenazer_exam_v1";
export const VERSION = 1;
export const HISTORY_LIMIT = 100;
const MAX_TIMESTAMP = 9999999999999;
const MAX_ATTEMPTS = 99999;
const MAX_BACKUP_SIZE = 4e6;

function clip(value: unknown, min: number, max: number, fallback = min) {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.min(max, Math.max(min, number))
    : fallback;
}

function cleanRecord(record: Record<string, unknown>): AnswerRecord {
  return {
    right: clip(record.right, 0, MAX_ATTEMPTS),
    wrong: clip(record.wrong, 0, MAX_ATTEMPTS),
    last: clip(record.last, 0, MAX_TIMESTAMP),
  };
}

function cleanCard(card: Record<string, unknown>): CardRecord {
  return {
    reps: clip(card.reps, 0, 999),
    ease: clip(card.ease, 1.3, 3.6, 2.5),
    interval: clip(card.interval, 0, 3650),
    due: clip(card.due, 0, MAX_TIMESTAMP),
    ...cleanRecord(card),
  };
}

function cleanEntries<T>(entries: unknown, clean: (entry: Record<string, unknown>) => T, prefix?: string): Record<string, T> {
  if (!entries || typeof entries !== "object") return {};
  return Object.fromEntries(
    Object.entries(entries)
      .filter(
        ([id, entry]) =>
          isQuestionId(id, prefix) && isRecord(entry),
      )
      .map(([id, entry]) => [id, clean(entry as Record<string, unknown>)]),
  );
}

function cleanSummary(summary: Record<string, unknown>): SessionSummary {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

export function cleanState(raw: unknown): ProgressState {
  const source = isRecord(raw) ? raw : {};
  return {
    version: VERSION,
    cards: cleanEntries(source.cards, cleanCard, "F"),
    records: cleanEntries(source.records, cleanRecord),
    sessions: Array.isArray(source.sessions)
      ? source.sessions
          .slice(-HISTORY_LIMIT)
          .filter(isRecord)
          .map(cleanSummary)
      : [],
    theme: source.theme === "dark" ? "dark" : "light",
    bookmarks: Array.isArray(source.bookmarks)
      ? [...new Set(source.bookmarks.filter((id): id is string => isQuestionId(id)))]
      : [],
  };
}

export function loadProgress(browser: Window | null): ProgressState {
  if (!browser) throw new Error('Pamięć przeglądarki jest niedostępna.');
  return cleanState(JSON.parse(browser.localStorage.getItem(STORAGE_KEY) ?? 'null'));
}

export function saveProgress(browser: Window | null, state: ProgressState): void {
  if (!browser) throw new Error('Pamięć przeglądarki jest niedostępna.');
  browser.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function readBackup(file: File) {
  if (file.size > MAX_BACKUP_SIZE) throw new Error("Plik zbyt duży.");
  const raw: unknown = JSON.parse(await file.text());
  if (!isRecord(raw) || raw.version !== VERSION || !raw.cards || !raw.records) {
    throw new Error("Nieprawidłowy plik postępów.");
  }
  return cleanState(raw);
}
