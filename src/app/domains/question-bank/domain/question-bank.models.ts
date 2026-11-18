export const ALL_LECTURES = 'both';
export type Difficulty = 'basic' | 'medium' | 'hard';
export type QuestionKind = Question['kind'];

interface QuestionBase {
  id: string;
  lecture: string;
  slide: string;
  topic: string;
  difficulty: Difficulty;
  priority: boolean;
  question: string;
}

export interface Flashcard extends QuestionBase {
  kind: 'card';
  answer: string;
}

interface QuizBase extends QuestionBase {
  kind: 'quiz';
  why: string;
}

export type Quiz =
  | (QuizBase & { qtype: 'single'; options: string[]; correct: number })
  | (QuizBase & { qtype: 'multi'; options: string[]; correct: number[] })
  | (QuizBase & { qtype: 'tf'; correct: boolean })
  | (QuizBase & { qtype: 'order'; options: string[] });

interface WrittenBase extends QuestionBase {
  answer: string;
  mandatory: string[];
  pitfall?: string;
}

export type WrittenQuestion =
  | (WrittenBase & { kind: 'open' })
  | (WrittenBase & { kind: 'case'; title: string; scenario: string });

export type Question = Flashcard | Quiz | WrittenQuestion;

export interface SetEntry {
  id: string;
  label: string;
  title: string;
  file: string;
  coverageTitle?: string;
  counts?: QuestionCounts;
  topics?: string[];
  progressIds?: string[];
}

export type QuestionCounts = Record<'cards' | 'quizzes' | 'opens' | 'cases', number>;

export interface StudyImage {
  src: string;
  alt: string;
  title: string;
  lecture: string;
  slide: string | number;
  caption: string;
}

export interface Coverage {
  name: string;
  status: string;
  note: string;
  slide?: string;
}

export interface SetContent {
  cards: Flashcard[];
  quizzes: Quiz[];
  opens: Extract<WrittenQuestion, { kind: 'open' }>[];
  cases: Extract<WrittenQuestion, { kind: 'case' }>[];
  images: StudyImage[];
  coverage: Coverage[];
}

export type LectureSet = SetEntry & SetContent;

export interface StudyData extends SetContent {
  sets: LectureSet[];
  setsById: Map<string, LectureSet>;
  all: Question[];
  questionsById: Map<string, Question>;
}
