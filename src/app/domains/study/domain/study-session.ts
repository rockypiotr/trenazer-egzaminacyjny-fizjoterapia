import type { AnswerRecord, CardRecord, ProgressState } from '../../progress/domain/progress.models';
import { correctQuizText, matchesLecture } from '../../question-bank/domain/questions';
import { matches } from './study-filters';
import type { Flashcard, Question, Quiz, StudyData } from '../../question-bank/domain/question-bank.models';
import type { ExamSetup, FinishedSession, QuizChoice, SessionMode, SessionSummary, StudyFilters, StudyMode, StudySession } from './study.models';

interface StudyProgress {
  state(): ProgressState;
  getRecord(question: Question): AnswerRecord;
  record(question: Question, good: boolean, card?: CardRecord): void;
  addSession(summary: SessionSummary): void;
  bookmarked(question: Question): boolean;
  isHard(question: Question): boolean;
}

export function createStudySession(
  data: StudyData,
  progress: StudyProgress,
  filters: () => StudyFilters,
  onChange: (route?: 'session' | 'results') => void,
  onNotice: (message: string) => void,
) {
  const { all, cards, quizzes, opens, cases } = data;
  const available = <T extends Question>(items: T[]): T[] =>
    items.filter((question) => matches(question, filters()));
  let session: StudySession | null = null;
  let finished: FinishedSession | null = null;
  function dueCards() {
    const now = Date.now();
    return cards.filter((q) => {
      const r = progress.state().cards[q.id];
      return r && r.due <= now && r.right + r.wrong > 0;
    });
  }

  function randShuffle<T>(xs: T[]): T[] {
    const arr = [...xs];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[j], arr[i]] = [arr[i], arr[j]];
    }
    return arr;
  }

  function bestCards(pool: Flashcard[], limit: number, daily: boolean) {
    const now = Date.now();
    const due = pool
      .filter((q) => {
        const r = progress.state().cards[q.id];
        return r && r.due <= now && r.right + r.wrong > 0;
      })
      .sort(
        (a, b) => (progress.state().cards[a.id]?.due || 0) - (progress.state().cards[b.id]?.due || 0),
      );
    const fresh = randShuffle(pool.filter((q) => !progress.state().cards[q.id]));
    const learned = randShuffle(
      pool.filter((q) => (progress.state().cards[q.id]?.due ?? 0) > now),
    );
    return (
      daily
        ? [...due, ...fresh.slice(0, Math.max(0, limit - due.length))]
        : [...due, ...fresh, ...learned]
    ).slice(0, limit);
  }

  function repetitionInterval(record: CardRecord, score: number) {
    if (score === 1) return 1;
    if (record.reps === 1) return score === 3 ? 3 : 1;
    if (record.reps === 2) return score === 3 ? 6 : 3;
    const bonus = score === 3 ? 1.25 : 1;
    const days = Math.ceil(Math.max(1, record.interval) * record.ease * bonus);
    return Math.min(3650, Math.max(1, days));
  }

  function updateSuccessfulCard(card: CardRecord, score: number, now: number) {
    card.reps++;
    card.right++;
    const easeChange = score === 3 ? 0.12 : score === 2 ? 0.02 : -0.14;
    card.ease = Math.min(3.5, Math.max(1.3, card.ease + easeChange));
    card.interval = repetitionInterval(card, score);
    card.due = now + card.interval * 86400000;
  }

  function updateForgottenCard(card: CardRecord, now: number) {
    card.reps = 0;
    card.wrong++;
    card.ease = Math.max(1.3, card.ease - 0.22);
    card.interval = 0;
    card.due = now + 10 * 60000;
  }

  function recordCardReview(question: Flashcard, score: number) {
    const now = Date.now();
    const existing = progress.state().cards[question.id];
    const card: CardRecord = existing ? { ...existing } : {
      reps: 0, ease: 2.5, interval: 0, right: 0, wrong: 0, due: 0, last: 0,
    };
    card.last = now;
    if (score === 0) updateForgottenCard(card, now);
    else updateSuccessfulCard(card, score, now);
    progress.record(question, score > 0, card);
  }

  function scorePriority(q: Question) {
    const r = progress.getRecord(q),
      sum = r.right + r.wrong;
    const c = progress.state().cards[q.id];
    return (
      (sum === 0 ? 2 : 0) +
      (r.wrong / (sum + 1)) * 3 +
      ((c?.due ?? Infinity) <= Date.now() ? 2 : 0) +
      (q.difficulty === "hard" ? 0.4 : 0)
    );
  }

  function selectModeQuestions(mode: StudyMode): Question[] {
    switch (mode) {
      case "daily":
        return bestCards(available(cards), 20, true);
      case "flash":
        return bestCards(available(cards), 25, false);
      case "quiz":
        return randShuffle(available(quizzes)).slice(0, 16);
      case "recall":
        return randShuffle(available(opens)).slice(0, 12);
      case "case":
        return randShuffle(available(cases)).slice(0, 10);
      case "priority":
        return randShuffle(available(all).filter((q) => q.priority))
          .sort((a, b) => scorePriority(b) - scorePriority(a))
          .slice(0, 24);
      case "saved":
        return randShuffle(available(all).filter((question) => progress.bookmarked(question))).slice(0, 35);
      case "review":
        return randShuffle(available(all).filter((question) => progress.isHard(question))).slice(0, 25);
      default:
        return [];
    }
  }

  function startMode(mode: StudyMode, itemsOverride?: Question[]) {
    const items = itemsOverride ?? selectModeQuestions(mode);
    if (!items.length) {
      onNotice("Brak dostępnych pytań dla wybranych filtrów.");
      return;
    }
    beginSession(mode, items, filters().lecture);
  }

  function beginSession(mode: SessionMode, items: Question[], lecture: string, deadline = 0) {
    session = {
      mode,
      phase: "ask",
      chosen: [],
      order: [],
      draft: "",
      items: [...items],
      index: 0,
      results: [],
      isExam: mode === "exam",
      retryIds: [],
      start: Date.now(),
      deadline,
      lecture,
    };
    prepareQuestion();
    onChange("session");
  }

  function balancedMix(pool: Question[], n: number): Question[] {
    const groups = {
      quiz: randShuffle(pool.filter((q) => q.kind === "quiz")),
      open: randShuffle(pool.filter((q) => q.kind === "open")),
      case: randShuffle(pool.filter((q) => q.kind === "case")),
    };
    const out: Question[] = [];
    const pattern = [
      "quiz",
      "quiz",
      "open",
      "quiz",
      "case",
      "quiz",
      "open",
      "quiz",
      "case",
      "quiz",
    ] as const;
    for (let i = 0; out.length < n && i < 4 * n; i++) {
      const kind = pattern[i % pattern.length];
      const next = groups[kind].pop() ?? Object.values(groups).find((group) => group.length)?.pop();
      if (!next) break;
      out.push(next);
    }
    return randShuffle(out);
  }

  function startExam({ lecture, which, size, limit }: ExamSetup) {
    const pool = [...quizzes, ...opens, ...cases].filter(
      (q) =>
        matchesLecture(q, lecture) &&
        (which === "mixed" ||
          (which === "open"
            ? q.kind === "open" || q.kind === "case"
            : q.kind === "quiz")),
    );
    const selected =
      which === "mixed"
        ? balancedMix(pool, size)
        : randShuffle(pool).slice(0, size);
    if (!selected.length) {
      onNotice("Brak pytań dla wybranej konfiguracji.");
      return;
    }
    if (selected.length < size)
      onNotice(
        `Dostępne jest ${selected.length} unikalnych pytań. Nie powielam ich.`,
      );
    const deadline = limit ? Date.now() + limit * 60000 : 0;
    beginSession("exam", selected, lecture, deadline);
  }

  function prepareQuestion() {
    if (!session) return;
    session.phase = "ask";
    session.chosen = [];
    session.draft = "";
    const q = session.items[session.index];
    session.order =
      q?.kind === "quiz" && q.qtype === "order" ? randShuffle(q.options.map((_, i) => i)) : [];
  }

  function currentQ() {
    return session?.items[session.index];
  }

  function scoreCard(value: number) {
    if (!session || session.phase !== "revealed") return;
    const q = currentQ();
    if (q?.kind !== "card") return;
    const good = value !== 0;
    recordCardReview(q, value);
    session.results.push({
      id: q.id,
      lecture: q.lecture,
      kind: q.kind,
      good,
      review: value,
      question: q.question,
    });
    if (
      value === 0 &&
      !session.retryIds.includes(q.id) &&
      session.items.length < 60
    ) {
      session.retryIds.push(q.id);
      session.items.push(q);
    }
    nextQuestion();
  }

  function evaluateQuiz(q: Quiz, session: StudySession) {
    if (q.qtype === "order") {
      return (
        JSON.stringify(session.order) ===
        JSON.stringify(q.options.map((_, i) => i))
      );
    }
    if (q.qtype === "tf")
      return (
        session.chosen.length === 1 &&
        String(session.chosen[0]) === String(q.correct)
      );
    if (q.qtype === "single")
      return (
        session.chosen.length === 1 &&
        Number(session.chosen[0]) === Number(q.correct)
      );
    if (q.qtype === "multi")
      return (
        session.chosen.length === q.correct.length &&
        q.correct.every((k) => session.chosen.includes(k))
      );
    return false;
  }

  function hasSelection(q: Quiz) {
    return q.qtype === "order" || Boolean(session?.chosen.length);
  }

  function checkQuiz() {
    if (!session || session.phase !== "ask") return;
    const q = currentQ();
    if (q?.kind !== "quiz" || !hasSelection(q)) return;
    const good = evaluateQuiz(q, session);
    session.results.push({
      id: q.id,
      lecture: q.lecture,
      kind: q.kind,
      good,
      question: q.question,
      correctText: correctQuizText(q),
      why: q.why,
    });
    progress.record(q, good);
    if (session.isExam) {
      nextQuestion();
    } else {
      session.phase = "feedback";
      onChange();
    }
  }

  function revealAnswer() {
    if (!session || session.phase !== "ask") return;
    const q = currentQ();
    if (!q || q.kind === "quiz") return;
    session.phase = "revealed";
    onChange();
  }

  function gradeOpen(value: number) {
    if (!session || session.phase !== "revealed") return;
    const q = currentQ();
    if (q?.kind !== "open" && q?.kind !== "case") return;
    const good = value >= 1;
    progress.record(q, good);
    session.results.push({
      id: q.id,
      lecture: q.lecture,
      kind: q.kind,
      good,
      self: value,
      question: q.question,
      correctText: q.answer,
      why: q.pitfall,
    });
    nextQuestion();
  }

  function nextQuestion() {
    if (!session) return;
    session.index++;
    if (session.index >= session.items.length) {
      finishSession();
      return;
    }
    prepareQuestion();
    onChange("session");
  }

  function finishSession(timeout = false) {
    if (!session) return;
    if (timeout) {
      for (let i = session.index; i < session.items.length; i++) {
        const q = session.items[i];
        session.results.push({
          id: q.id,
          lecture: q.lecture,
          kind: q.kind,
          good: false,
          unanswered: true,
          question: q.question,
          correctText: q.kind === "quiz" ? correctQuizText(q) : q.answer,
          why: q.kind === "quiz" ? q.why : q.kind === "card" ? "" : q.pitfall,
        });
      }
    }
    const results = [...session.results],
      auto = results.filter((x) => x.kind === "quiz"),
      self = results.filter((x) => x.kind === "open" || x.kind === "case"),
      wrong = results.filter((x) => !x.good);
    const s = {
      time: Date.now(),
      mode: session.mode,
      lecture: session.lecture,
      items: session.items.length,
      autoCorrect: auto.filter((x) => x.good).length,
      autoTotal: auto.length,
      selfGood: self.filter((x) => x.good && !x.unanswered).length,
      selfTotal: self.length,
      wrongIds: wrong.map((x) => x.id),
    };
    progress.addSession(s);
    finished = {
      summary: s,
      results,
      timeout,
      duration: Date.now() - session.start,
    };
    session = null;
    onChange("results");
  }

  function leave() {
    session = null;
    onChange();
  }

  function draft(value: string) {
    if (!session || session.phase !== 'ask') return;
    session.draft = value;
    onChange();
  }

  function selectQuizOption(value: QuizChoice) {
    const q = currentQ();
    if (q?.kind !== "quiz" || session?.phase !== "ask") return;
    if (q.qtype !== "multi") {
      session.chosen = [value];
      onChange();
      return;
    }
    const index = session.chosen.indexOf(value);
    if (index >= 0) session.chosen.splice(index, 1);
    else session.chosen.push(value);
    onChange();
  }

  function moveOption(pos: number, delta: number) {
    if (session?.phase !== "ask") return;
    const dest = pos + delta;
    if (dest < 0 || dest >= session.order.length) return;
    [session.order[pos], session.order[dest]] = [
      session.order[dest],
      session.order[pos],
    ];
    onChange();
  }
  return {
    get current() {
      return session;
    },
    get finished() {
      return finished;
    },
    currentQ,
    dueCards,
    startMode,
    startExam,
    revealAnswer,
    scoreCard,
    selectQuizOption,
    moveOption,
    hasSelection,
    checkQuiz,
    nextQuestion,
    gradeOpen,
    finishSession,
    leave,
    draft,
  };
}
