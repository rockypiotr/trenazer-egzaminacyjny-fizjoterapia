import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NoticeService } from '../../../../core/notice.service';
import { ProgressFacade } from '../../../progress/application/facades/progress.facade';
import { matches } from '../../domain/study-filters';
import { createStudySession } from '../../domain/study-session';
import { ALL_LECTURES, type Question, type QuestionKind, type StudyData } from '../../../question-bank/domain/question-bank.models';
import type { ExamSetup, FinishedSession, QuizChoice, StudyFilters, StudyMode, StudySession } from '../../domain/study.models';

const modeByKind: Record<QuestionKind, StudyMode> = {
  card: 'flash', quiz: 'quiz', open: 'recall', case: 'case',
};

@Injectable({ providedIn: 'root' })
export class StudyFacade {
  private readonly progress = inject(ProgressFacade);
  private readonly notice = inject(NoticeService);
  private readonly router = inject(Router);
  private readonly filtersState = signal<StudyFilters>({ lecture: ALL_LECTURES, topic: 'all', difficulty: 'all', priority: false });
  private readonly activeSession = signal<StudySession | null>(null);
  private readonly finishedSession = signal<FinishedSession | null>(null);
  private sessionEngine: ReturnType<typeof createStudySession> | null = null;
  private readonly sessionContent = signal<StudyData | null>(null);

  readonly filters = this.filtersState.asReadonly();
  readonly current = this.activeSession.asReadonly();
  readonly finished = this.finishedSession.asReadonly();
  readonly content = this.sessionContent.asReadonly();
  readonly question = computed(() => {
    const session = this.current();
    return session?.items[session.index];
  });

  private createEngine(data: StudyData) {
    const engine = createStudySession(
      data, this.progress, this.filters,
      (route) => {
        const current = engine.current;
        this.activeSession.set(current ? {
          ...current, items: [...current.items], results: [...current.results], chosen: [...current.chosen],
          order: [...current.order], retryIds: [...current.retryIds],
        } : null);
        this.finishedSession.set(engine.finished);
        if (route === 'results') void this.router.navigateByUrl('/results', { replaceUrl: true });
        if (route === 'session') {
          this.sessionEngine = engine;
          this.sessionContent.set(data);
          if (this.router.url === '/session') window.scrollTo(0, 0);
          else void this.router.navigateByUrl('/session');
        }
      },
      (message) => this.notice.show(message),
    );
    return engine;
  }

  available(data: StudyData): Question[] {
    const filters = this.filters();
    return data.all.filter((question) => matches(question, filters));
  }

  updateFilters(patch: Partial<StudyFilters>): void {
    this.filtersState.update((filters) => ({ ...filters, ...patch }));
  }

  startMode(data: StudyData, mode: StudyMode): void {
    this.createEngine(data).startMode(mode);
  }

  startExam(data: StudyData, setup: ExamSetup): void {
    this.createEngine(data).startExam(setup);
  }

  startSingle(data: StudyData, question: Question): void {
    this.createEngine(data).startMode(modeByKind[question.kind], [question]);
  }

  reveal(): void {
    this.sessionEngine?.revealAnswer();
  }

  rateCard(value: number): void {
    this.sessionEngine?.scoreCard(value);
  }

  draft(value: string): void {
    this.sessionEngine?.draft(value);
  }

  rateWritten(value: number): void {
    this.sessionEngine?.gradeOpen(value);
  }

  choose(value: QuizChoice): void {
    this.sessionEngine?.selectQuizOption(value);
  }

  move(position: number, delta: number): void {
    this.sessionEngine?.moveOption(position, delta);
  }

  check(): void {
    this.sessionEngine?.checkQuiz();
  }

  next(): void {
    this.sessionEngine?.nextQuestion();
  }

  finish(timeout = false): void {
    this.sessionEngine?.finishSession(timeout);
    this.sessionEngine = null;
  }

  leave(): void {
    this.sessionEngine?.leave();
    this.sessionEngine = null;
  }

  clearResults(): void {
    this.finishedSession.set(null);
    this.sessionContent.set(null);
    this.sessionEngine = null;
  }

  toggleBookmark(id: string): void {
    const saved = this.progress.toggleBookmark(id);
    this.notice.show(saved ? 'Pytanie zapisane.' : 'Usunięto z zapisanych.');
  }
}
