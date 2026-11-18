import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { QuestionBankFacade } from '../../../../domains/question-bank/application/facades/question-bank.facade';
import { lectureTitle, pageRef } from '../../../../shared/ui/study-labels';
import { StudyFacade } from '../../../../domains/study/application/facades/study.facade';
import { ResultsView } from '../ui/results-view';

@Component({
  imports: [ResultsView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (result(); as model) {
      <app-study-results [result]="model" (navigate)="router.navigateByUrl($event)" />
    }
  `,
})
export class ResultsPage {
  protected readonly router = inject(Router);
  private readonly study = inject(StudyFacade);
  private readonly bank = inject(QuestionBankFacade);
  protected readonly result = computed(() => {
    const finished = this.study.finished();
    const data = this.study.content();
    if (!finished || !data) return undefined;
    const { setsById, questionsById } = data;
    return {
      ...finished,
      review: finished.results.map((result) => {
        const question = questionsById.get(result.id);
        return { ...result, source: question ? pageRef(question, setsById) : '' };
      }),
      mistakes: finished.results.filter((result) => !result.good),
      lectures: this.bank.entries().map((set) => {
        const results = finished.results.filter((result) => result.lecture === set.id && result.kind === 'quiz');
        return { title: lectureTitle(set), total: results.length, correct: results.filter((result) => result.good).length };
      }),
    };
  });
}
