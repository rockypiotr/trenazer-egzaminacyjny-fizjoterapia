import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { StudyLoadState } from '../../../../shared/ui/study-load-state';
import { ProgressOverview } from '../../../../domains/progress/application/facades/progress-overview';
import { QuestionBankFacade } from '../../../../domains/question-bank/application/facades/question-bank.facade';
import { StudyFacade } from '../../../../domains/study/application/facades/study.facade';
import type { StudyFilters, StudyMode } from '../../../../domains/study/domain/study.models';
import { HomeView } from '../ui/home-view';
import { StudyFiltersView } from '../../../../shared/ui/study-filters';

@Component({
  imports: [HomeView, StudyFiltersView, StudyLoadState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (model(); as model) {
      <app-study-home [model]="model" (start)="pending.set($event)"
        (exam)="router.navigateByUrl('/exam')" (lecture)="selectLecture($event)">
        <app-study-filters [sets]="registry()" [topics]="topics()" [filters]="study.filters()"
          (changed)="changeFilters($event)" />
        <app-study-load-state [loading]="data.isLoading()" [failed]="!!data.error()" (retry)="data.reload()" />
      </app-study-home>
    }
  `,
})
export class HomePage {
  protected readonly router = inject(Router);
  protected readonly study = inject(StudyFacade);
  private readonly bank = inject(QuestionBankFacade);
  protected readonly pending = signal<StudyMode | null>(null);
  protected readonly data = this.bank.select(computed(() => this.pending() ? this.study.filters().lecture : undefined));
  protected readonly model = inject(ProgressOverview).model;
  protected readonly registry = this.bank.entries;
  protected readonly topics = this.bank.topics;

  constructor() {
    effect(() => {
      const mode = this.pending();
      if (!mode || !this.data.hasValue()) return;
      const data = this.data.value();
      untracked(() => {
        this.pending.set(null);
        this.study.startMode(data, mode);
      });
    });
  }

  protected changeFilters(filters: Partial<StudyFilters>): void {
    this.pending.set(null);
    this.study.updateFilters(filters);
  }

  protected selectLecture(lecture: string): void {
    this.study.updateFilters({ lecture, topic: 'all' });
    void this.router.navigateByUrl('/flash');
  }
}
