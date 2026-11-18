import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { StudyLoadState } from '../../../../shared/ui/study-load-state';
import { QuestionBankFacade } from '../../../../domains/question-bank/application/facades/question-bank.facade';
import { StudyFacade } from '../../../../domains/study/application/facades/study.facade';
import { ALL_LECTURES } from '../../../../domains/question-bank/domain/question-bank.models';
import { type ExamSetup } from '../../../../domains/study/domain/study.models';
import { ExamSetupView } from '../ui/exam-setup-view';

@Component({
  imports: [ExamSetupView, StudyLoadState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-exam-setup [sets]="registry()" [questionCount]="count()" [loading]="data.isLoading()"
      [failed]="!!data.error()" (selectionChange)="changeSelection($event)" (begin)="pending.set($event)" />
    <app-study-load-state [loading]="false" [failed]="!!data.error()" (retry)="data.reload()" />
  `,
})
export class ExamPage {
  private readonly bank = inject(QuestionBankFacade);
  private readonly study = inject(StudyFacade);
  protected readonly registry = this.bank.entries;
  private readonly selection = signal<Pick<ExamSetup, 'lecture' | 'which'>>({ lecture: ALL_LECTURES, which: 'mixed' });
  protected readonly pending = signal<ExamSetup | null>(null);
  protected readonly data = this.bank.select(computed(() => {
    const { lecture } = this.selection();
    return this.pending() || lecture !== ALL_LECTURES ? lecture : undefined;
  }));
  protected readonly count = computed(() => {
    const { lecture, which } = this.selection();
    const data = this.data.hasValue() ? this.data.value() : undefined;
    const counts = data ? { quizzes: data.quizzes.length, opens: data.opens.length, cases: data.cases.length }
      : this.bank.counts(lecture);
    if (!counts) return undefined;
    return (which !== 'open' ? counts.quizzes : 0) + (which !== 'test' ? counts.opens + counts.cases : 0);
  });

  constructor() {
    effect(() => {
      const setup = this.pending();
      if (!setup || this.selection().lecture !== setup.lecture || !this.data.hasValue()) return;
      const data = this.data.value();
      untracked(() => {
        this.pending.set(null);
        this.study.startExam(data, setup);
      });
    });
  }

  protected changeSelection(selection: Pick<ExamSetup, 'lecture' | 'which'>): void {
    this.pending.set(null);
    this.selection.set(selection);
  }
}
