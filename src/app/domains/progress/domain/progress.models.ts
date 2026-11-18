import type { SessionSummary } from '../../study/domain/study.models';

export interface AnswerRecord {
  right: number;
  wrong: number;
  last: number;
}

export interface CardRecord extends AnswerRecord {
  reps: number;
  ease: number;
  interval: number;
  due: number;
}

export interface ProgressState {
  version: number;
  cards: Record<string, CardRecord | undefined>;
  records: Record<string, AnswerRecord | undefined>;
  sessions: SessionSummary[];
  theme: 'light' | 'dark';
  bookmarks: string[];
}
