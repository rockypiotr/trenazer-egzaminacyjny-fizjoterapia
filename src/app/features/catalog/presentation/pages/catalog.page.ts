import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { lectureTitle } from '../../../../shared/ui/study-labels';
import { StudyLoadState } from '../../../../shared/ui/study-load-state';
import { ProgressFacade } from '../../../../domains/progress/application/facades/progress.facade';
import { CatalogFacade } from '../../../../domains/question-bank/application/facades/catalog.facade';
import { QuestionBankFacade } from '../../../../domains/question-bank/application/facades/question-bank.facade';
import { StudyFacade } from '../../../../domains/study/application/facades/study.facade';
import { correctQuizText } from '../../../../domains/question-bank/domain/questions';
import type { Question } from '../../../../domains/question-bank/domain/question-bank.models';
import { CatalogView } from '../ui/catalog-view';

@Component({
  imports: [CatalogView, StudyLoadState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-catalog [sets]="registry()" [rows]="rows()" [filters]="catalog.filters()"
      [loading]="data.isLoading()" [failed]="!!data.error()"
      [total]="results().length" (changed)="catalog.update($event)" (more)="catalog.more()"
      (practice)="practice($event)" (bookmark)="study.toggleBookmark($event)" />
    <app-study-load-state [loading]="data.isLoading()" [failed]="!!data.error()" (retry)="data.reload()" />
  `,
})
export class CatalogPage {
  private readonly bank = inject(QuestionBankFacade);
  protected readonly study = inject(StudyFacade);
  protected readonly catalog = inject(CatalogFacade);
  protected readonly registry = this.bank.entries;
  protected readonly data = this.bank.select(computed(() => this.catalog.filters().lecture));
  private readonly progress = inject(ProgressFacade);
  protected readonly results = computed(() => this.data.hasValue() ? this.catalog.filter(this.data.value().all) : []);
  protected readonly rows = computed(() => {
    if (!this.data.hasValue()) return [];
    const sets = this.data.value().setsById;
    return this.results().slice(0, this.catalog.limit()).map((question) => {
      const set = sets.get(question.lecture);
      return {
        question, lecture: set ? lectureTitle(set) : question.lecture,
        answer: question.kind === 'quiz' ? correctQuizText(question) : question.answer,
        saved: this.progress.bookmarked(question),
      };
    });
  });

  protected practice(question: Question): void {
    if (this.data.hasValue()) this.study.startSingle(this.data.value(), question);
  }
}
