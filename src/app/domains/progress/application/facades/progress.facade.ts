import { DOCUMENT, inject, Injectable, signal } from '@angular/core';
import type { Flashcard, Question } from '../../../question-bank/domain/question-bank.models';
import type { SessionSummary } from '../../../study/domain/study.models';
import type { CardRecord, ProgressState } from '../../domain/progress.models';
import { cleanState, HISTORY_LIMIT, loadProgress, saveProgress, VERSION } from '../../infrastructure/progress-storage';

@Injectable({ providedIn: 'root' })
export class ProgressFacade {
  private readonly browser = inject(DOCUMENT).defaultView;
  private readonly storageAvailable = signal(true);
  private readonly progress = signal(this.load());

  readonly state = this.progress.asReadonly();
  readonly persistent = this.storageAvailable.asReadonly();

  private load(): ProgressState {
    try {
      return loadProgress(this.browser);
    } catch {
      this.storageAvailable.set(false);
      return cleanState(null);
    }
  }

  private save(state: ProgressState): void {
    this.progress.set(state);
    try {
      saveProgress(this.browser, state);
      this.storageAvailable.set(true);
    } catch {
      this.storageAvailable.set(false);
    }
  }

  getRecord(question: Question) {
    return this.state().records[question.id] ?? { right: 0, wrong: 0, last: 0 };
  }

  record(question: Question, good: boolean, card?: CardRecord): void {
    const state = this.state();
    const previous = this.getRecord(question);
    this.save({
      ...state,
      cards: card ? { ...state.cards, [question.id]: card } : state.cards,
      records: {
        ...state.records,
        [question.id]: {
          right: previous.right + Number(good),
          wrong: previous.wrong + Number(!good),
          last: Date.now(),
        },
      },
    });
  }

  addSession(summary: SessionSummary): void {
    const state = this.state();
    this.save({ ...state, sessions: [...state.sessions, summary].slice(-HISTORY_LIMIT) });
  }

  mastered(card: Flashcard): boolean {
    return (this.state().cards[card.id]?.reps ?? 0) >= 2;
  }

  isHard(question: Question): boolean {
    return this.getRecord(question).wrong > 0 ||
      (question.kind === 'card' && (this.state().cards[question.id]?.ease ?? 2.5) < 2.25);
  }

  bookmarked(question: Question): boolean {
    return this.state().bookmarks.includes(question.id);
  }

  toggleBookmark(id: string): boolean {
    const state = this.state();
    const saved = state.bookmarks.includes(id);
    const bookmarks = saved ? state.bookmarks.filter((bookmark) => bookmark !== id) : [...state.bookmarks, id];
    this.save({ ...state, bookmarks });
    return !saved;
  }

  toggleTheme(): void {
    const state = this.state();
    this.save({ ...state, theme: state.theme === 'light' ? 'dark' : 'light' });
  }

  replace(backup: ProgressState): void {
    this.save(backup);
  }

  reset(): void {
    this.save(cleanState({ theme: this.state().theme }));
  }

  exportData() {
    return {
      ...this.state(),
      exported: new Date().toISOString(),
      content: 'Progress: fisioterapia studies; no questions exported',
      app_version: VERSION,
    };
  }
}
