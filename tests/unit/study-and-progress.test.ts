import { DOCUMENT, Injector, runInInjectionContext } from '@angular/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProgressFacade } from '../../src/app/domains/progress/application/facades/progress.facade';
import { cleanState, readBackup, STORAGE_KEY } from '../../src/app/domains/progress/infrastructure/progress-storage';
import { createStudySession } from '../../src/app/domains/study/domain/study-session';
import { ALL_LECTURES, type Flashcard, type Question, type Quiz, type StudyData, type WrittenQuestion } from '../../src/app/domains/question-bank/domain/question-bank.models';
import { type QuizChoice } from '../../src/app/domains/study/domain/study.models';
import legacyProgress from '../e2e/fixtures/legacy-progress.json';

const base = {
  lecture: 'V', slide: '3', topic: 'Anatomia', difficulty: 'basic', priority: false, question: 'Pytanie',
} as const;
const card: Flashcard = { ...base, kind: 'card', id: 'F-V-001', answer: 'Odpowiedź' };
const quizBase = { ...base, kind: 'quiz', why: 'Wyjaśnienie' } as const;
const single: Quiz = { ...quizBase, id: 'Q-V-001', qtype: 'single', options: ['A', 'B', 'C'], correct: 1 };
const multi: Quiz = { ...quizBase, id: 'Q-V-002', qtype: 'multi', options: ['A', 'B', 'C'], correct: [0, 2] };
const trueFalse: Quiz = { ...quizBase, id: 'Q-V-003', qtype: 'tf', correct: false };
const order: Quiz = { ...quizBase, id: 'Q-V-004', qtype: 'order', options: ['A', 'B', 'C'] };
const written: WrittenQuestion = { ...base, kind: 'open', id: 'O-V-001', answer: 'Odpowiedź', mandatory: ['Element'] };

function createProgress(initial = new Map<string, string>()) {
  const localStorage = {
    getItem: (key: string) => initial.get(key) ?? null,
    setItem: (key: string, value: string) => initial.set(key, value),
  };
  const injector = Injector.create({ providers: [{ provide: DOCUMENT, useValue: { defaultView: { localStorage } } }] });
  return runInInjectionContext(injector, () => new ProgressFacade());
}

function createSession(questions: Question[], progress = createProgress()) {
  const data: StudyData = {
    all: questions,
    cards: questions.filter((question) => question.kind === 'card'),
    quizzes: questions.filter((question) => question.kind === 'quiz'),
    opens: questions.filter((question) => question.kind === 'open'),
    cases: questions.filter((question) => question.kind === 'case'),
    sets: [], setsById: new Map(), questionsById: new Map(), images: [], coverage: [],
  };
  const filters = () => ({ lecture: ALL_LECTURES, topic: 'all', difficulty: 'all', priority: false }) as const;
  return createStudySession(data, progress, filters, vi.fn(), vi.fn());
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Punktacja', () => {
  it.each<{ quiz: Quiz; chosen: QuizChoice[]; good: boolean }>([
    { quiz: single, chosen: [1], good: true },
    { quiz: single, chosen: [0], good: false },
    { quiz: multi, chosen: [2, 0], good: true },
    { quiz: multi, chosen: [0], good: false },
    { quiz: multi, chosen: [0, 1, 2], good: false },
    { quiz: trueFalse, chosen: ['false'], good: true },
    { quiz: trueFalse, chosen: ['true'], good: false },
  ])('ocenia $quiz.qtype z wyborem $chosen na $good', ({ quiz, chosen, good }) => {
    const progress = createProgress();
    const session = createSession([quiz], progress);
    session.startMode('quiz');
    for (const choice of chosen) session.selectQuizOption(choice);
    session.checkQuiz();
    session.nextQuestion();

    expect(session.finished?.results).toMatchObject([{ id: quiz.id, good }]);
    expect(session.finished?.summary).toMatchObject({
      autoCorrect: Number(good), autoTotal: 1, wrongIds: good ? [] : [quiz.id],
    });
    expect(progress.getRecord(quiz)).toMatchObject({ right: Number(good), wrong: Number(!good) });
  });

  it('przyjmuje tylko poprawną kolejność', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const session = createSession([order]);
    session.startMode('quiz');
    expect(session.current?.order).toEqual([1, 2, 0]);
    session.checkQuiz();
    expect(session.current?.results).toMatchObject([{ good: false }]);

    session.startMode('quiz');
    session.moveOption(2, -1);
    session.moveOption(1, -1);
    session.checkQuiz();
    expect(session.current?.results).toMatchObject([{ good: true, correctText: 'A → B → C' }]);
  });

  it('rozlicza odpowiedź otwartą osobno i zapisuje pytanie pominięte po upływie czasu', () => {
    const progress = createProgress();
    const session = createSession([single, written], progress);
    session.startMode('recall');
    session.revealAnswer();
    session.gradeOpen(1);
    expect(session.finished?.summary).toMatchObject({ autoTotal: 0, selfGood: 1, selfTotal: 1 });

    session.startExam({ lecture: 'V', which: 'test', size: 1, limit: 1 });
    session.finishSession(true);
    expect(session.finished).toMatchObject({
      timeout: true,
      summary: { autoCorrect: 0, autoTotal: 1, selfTotal: 0, wrongIds: [single.id] },
      results: [{ id: single.id, good: false, unanswered: true, correctText: 'B' }],
    });
    expect(progress.getRecord(single)).toEqual({ right: 0, wrong: 0, last: 0 });
  });
});

describe('Powtórki', () => {
  const day = 24 * 60 * 60 * 1000;
  const now = Date.UTC(2025, 0, 1);

  it('wydłuża odstęp po ocenach i zwraca fiszkę dopiero w terminie', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const progress = createProgress();
    const session = createSession([card], progress);
    session.startMode('daily');
    session.revealAnswer();
    session.scoreCard(3);
    expect(progress.state().cards[card.id]).toMatchObject({ reps: 1, interval: 3, due: now + 3 * day, right: 1 });
    expect(session.dueCards()).toEqual([]);

    vi.setSystemTime(now + 3 * day);
    expect(session.dueCards()).toEqual([card]);
    session.startMode('daily');
    session.revealAnswer();
    session.scoreCard(2);
    expect(progress.state().cards[card.id]).toMatchObject({ reps: 2, interval: 3, due: now + 6 * day, right: 2 });

    vi.setSystemTime(now + 6 * day);
    session.startMode('daily');
    session.revealAnswer();
    session.scoreCard(3);
    expect(progress.state().cards[card.id]).toMatchObject({ reps: 3, interval: 11, due: now + 17 * day, right: 3 });
  });

  it('ponawia zapomnianą fiszkę w sesji raz i wyznacza termin za dziesięć minut', () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const progress = createProgress(new Map([[STORAGE_KEY, JSON.stringify(legacyProgress)]]));
    const session = createSession([card], progress);
    const due = now + 10 * 60 * 1000;
    session.startMode('flash');
    session.revealAnswer();
    session.scoreCard(0);
    expect(progress.state().cards[card.id]).toMatchObject({ reps: 0, interval: 0, due, right: 2, wrong: 1 });
    expect(session.currentQ()).toEqual(card);
    session.revealAnswer();
    session.scoreCard(0);
    expect(session.finished?.summary.items).toBe(2);
    expect(progress.state().cards[card.id]).toMatchObject({ due, wrong: 2 });
    vi.setSystemTime(due - 1);
    expect(session.dueCards()).toEqual([]);
    vi.setSystemTime(due);
    expect(session.dueCards()).toEqual([card]);
  });
});

describe('Postępy sprzed migracji', () => {
  const { version, cards, records, sessions, theme, bookmarks } = legacyProgress;
  const expected = { version, cards, records, sessions, theme, bookmarks };

  it('ładuje stan spod dotychczasowego klucza localStorage', () => {
    expect(STORAGE_KEY).toBe('fizjo_trenazer_exam_v1');
    const storage = new Map([[STORAGE_KEY, JSON.stringify(legacyProgress)]]);
    const progress = createProgress(storage);
    expect(progress.state()).toEqual(expected);
    progress.record(card, true);
    expect(createProgress(storage).getRecord(card)).toMatchObject({ right: 3, wrong: 0 });
  });

  it('odczytuje starą kopię zapasową i stosuje wartości domyślne dla brakujących pól', async () => {
    const file = new File([JSON.stringify(legacyProgress)], 'postepy.json');
    await expect(readBackup(file)).resolves.toEqual(expected);
    expect(cleanState({ version, cards, records })).toEqual({
      version, cards, records, sessions: [], theme: 'light', bookmarks: [],
    });
  });
});
