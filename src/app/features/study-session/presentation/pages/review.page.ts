import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { StudyLoadState } from '../../../../shared/ui/study-load-state';
import { ProgressFacade } from '../../../../domains/progress/application/facades/progress.facade';
import { QuestionBankFacade } from '../../../../domains/question-bank/application/facades/question-bank.facade';
import { StudyFacade } from '../../../../domains/study/application/facades/study.facade';
import type { StudyMode } from '../../../../domains/study/domain/study.models';
import { ReviewView } from '../ui/review-view';
import { StudyFiltersView } from '../../../../shared/ui/study-filters';

@Component({
  imports: [StudyFiltersView, ReviewView, StudyLoadState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="eyebrow">SYSTEM POWTÓREK</div>
    <h1>Trudne i zapisane</h1>
    <p class="lead">Powracaj do pytań, które sprawiły trudność, oraz do wybranych przez siebie zadań.</p>
    <app-study-filters [sets]="registry()" [topics]="topics()" [filters]="study.filters()"
      (changed)="study.updateFilters($event)" />
    <app-study-load-state [loading]="data.isLoading()" [failed]="!!data.error()" (retry)="data.reload()" />
    @if (data.hasValue()) {
      <app-review [hard]="hard()" [saved]="saved()" (start)="start($event)" (remove)="study.toggleBookmark($event)" />
    }
  `,
})
export class ReviewPage {
  protected readonly study = inject(StudyFacade);
  private readonly bank = inject(QuestionBankFacade);
  protected readonly registry = this.bank.entries;
  protected readonly data = this.bank.select(computed(() => this.study.filters().lecture));
  protected readonly topics = this.bank.topics;
  private readonly progress = inject(ProgressFacade);
  private readonly available = computed(() => this.data.hasValue() ? this.study.available(this.data.value()) : []);
  protected readonly hard = computed(() => this.available()
    .filter((question) => this.progress.isHard(question))
    .map((question) => ({ question, misses: this.progress.getRecord(question).wrong })));
  protected readonly saved = computed(() => this.available().filter((question) => this.progress.bookmarked(question)));

  protected start(mode: StudyMode): void {
    if (this.data.hasValue()) this.study.startMode(this.data.value(), mode);
  }
}
