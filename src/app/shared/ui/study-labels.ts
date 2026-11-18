import type { Difficulty, SetEntry, Question, QuestionKind } from '../../domains/question-bank/domain/question-bank.models';

export const difficulties: Record<Difficulty, string> = { basic: 'Podstawowy', medium: 'Średni', hard: 'Trudny' };
export const typeLabels: Record<QuestionKind, string> = {
  card: 'Fiszka', quiz: 'Quiz', open: 'Odpowiedź otwarta', case: 'Przypadek',
};

export const lectureTitle = ({ label, title }: SetEntry) => `${label} · ${title}`;

export function pageRef(question: Question, sets: ReadonlyMap<string, SetEntry>): string {
  const slides = /[,–-]/.test(String(question.slide)) ? 'slajdy' : 'slajd';
  return `${sets.get(question.lecture)?.label ?? question.lecture} · ${slides} ${question.slide}`;
}

export function percentage(value: number, total: number): number {
  return total ? 100 * value / total : 0;
}

export function formatTime(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
