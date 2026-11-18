import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { StudyFacade } from '../../../../domains/study/application/facades/study.facade';
import { ProgressFacade } from '../../../../domains/progress/application/facades/progress.facade';
import { formatTime, pageRef } from '../../../../shared/ui/study-labels';
import { SessionView } from '../ui/session-view';

@Component({
  imports: [SessionView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'shortcut($event)' },
  template: `
    @if (study.current(); as session) {
      @if (study.question(); as question) {
        <app-session [session]="session" [question]="question" [source]="source()" [remaining]="remaining()"
          [saved]="progress.bookmarked(question)" (bookmark)="study.toggleBookmark(question.id)"
          (reveal)="study.reveal()" (rate)="study.rateCard($event)"
          (draft)="study.draft($event)" (grade)="study.rateWritten($event)"
          (choose)="study.choose($event)" (move)="study.move($event.position, $event.delta)"
          (check)="study.check()" (next)="study.next()" (exit)="exit()" />
      }
    }
  `,
})
export class SessionPage {
  protected readonly study = inject(StudyFacade);
  protected readonly progress = inject(ProgressFacade);
  private readonly now = signal(Date.now());

  protected readonly remaining = computed(() => {
    const deadline = this.study.current()?.deadline;
    return deadline ? formatTime(deadline - this.now()) : '';
  });
  protected readonly source = computed(() => {
    const question = this.study.question();
    const content = this.study.content();
    return question && content ? pageRef(question, content.setsById) : '';
  });

  constructor() {
    const timer = setInterval(() => {
      const deadline = this.study.current()?.deadline;
      if (!deadline) return;
      this.now.set(Date.now());
      if (deadline <= this.now()) this.study.finish(true);
    }, 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  canLeave(): boolean {
    if (this.study.current()?.isExam &&
        !confirm('Przerwać bieżący egzamin? Wynik tej próby nie zostanie zapisany.')) return false;
    if (this.study.current()) this.study.leave();
    return true;
  }

  protected exit(): void {
    if (!this.study.current()?.isExam) this.study.finish();
    else if (confirm('Zakończyć egzamin teraz? Pozostałe pytania będą oznaczone jako pominięte.'))
      this.study.finish(true);
  }

  protected shortcut(event: KeyboardEvent): void {
    const session = this.study.current();
    const question = this.study.question();
    if (!session || !question || event.altKey || event.metaKey) return;
    const tag = event.target instanceof HTMLElement ? event.target.tagName : '';
    if (tag === 'BUTTON' && (event.key === 'Enter' || event.code === 'Space')) return;
    if (['TEXTAREA', 'INPUT', 'SELECT'].includes(tag)) {
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        this.study.reveal();
      }
      return;
    }
    if (question.kind === 'card') {
      if (event.code === 'Space') {
        event.preventDefault();
        this.study.reveal();
      } else if (session.phase === 'revealed' && /^[1-4]$/.test(event.key)) {
        event.preventDefault();
        this.study.rateCard(Number(event.key) - 1);
      }
      return;
    }
    if (question.kind !== 'quiz' || session.phase !== 'ask') return;
    if (event.key === 'Enter') {
      event.preventDefault();
      this.study.check();
      return;
    }
    if (!/^[1-4]$/.test(event.key) || question.qtype === 'order') return;
    const index = Number(event.key) - 1;
    const choice = question.qtype === 'tf'
      ? (['true', 'false'] as const)[index]
      : question.options[index] === undefined ? undefined : index;
    if (choice !== undefined) {
      event.preventDefault();
      this.study.choose(choice);
      if (event.target instanceof HTMLButtonElement) event.target.blur();
    }
  }
}
