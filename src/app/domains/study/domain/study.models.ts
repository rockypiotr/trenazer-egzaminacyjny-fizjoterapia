import type { Difficulty, Question, QuestionKind } from '../../question-bank/domain/question-bank.models';

export type LearningMode = 'flash' | 'quiz' | 'recall' | 'case';
export type StudyMode = LearningMode | 'daily' | 'priority' | 'saved' | 'review';
export type SessionMode = StudyMode | 'exam';

export interface StudyFilters {
  lecture: string;
  topic: string;
  difficulty: Difficulty | 'all';
  priority: boolean;
}

export interface ExamSetup {
  lecture: string;
  which: 'mixed' | 'open' | 'test';
  size: number;
  limit: number;
}

export interface SessionSummary {
  time: number;
  mode: string;
  lecture: string;
  items: number;
  autoCorrect: number;
  autoTotal: number;
  selfGood: number;
  selfTotal: number;
  wrongIds: string[];
}

export interface AnswerResult {
  id: string;
  lecture: string;
  kind: QuestionKind;
  good: boolean;
  question: string;
  review?: number;
  self?: number;
  unanswered?: boolean;
  correctText?: string;
  why?: string;
}

export type QuizChoice = number | 'true' | 'false';

export interface StudySession {
  mode: SessionMode;
  items: Question[];
  index: number;
  results: AnswerResult[];
  isExam: boolean;
  retryIds: string[];
  start: number;
  deadline: number;
  lecture: string;
  phase: 'ask' | 'revealed' | 'feedback';
  chosen: QuizChoice[];
  draft: string;
  order: number[];
}

export interface FinishedSession {
  summary: SessionSummary;
  results: AnswerResult[];
  timeout: boolean;
  duration: number;
}
