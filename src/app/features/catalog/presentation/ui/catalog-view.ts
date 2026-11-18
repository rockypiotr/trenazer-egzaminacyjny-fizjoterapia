import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { difficulties, typeLabels } from '../../../../shared/ui/study-labels';
import type { CatalogFilters } from '../../../../domains/question-bank/application/facades/catalog.facade';
import { ALL_LECTURES, type Question, type SetEntry } from '../../../../domains/question-bank/domain/question-bank.models';

interface CatalogRow {
  question: Question;
  lecture: string;
  answer: string;
  saved: boolean;
}

@Component({
  selector: 'app-catalog',
  imports: [FormField],
  templateUrl: './catalog-view.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogView {
  readonly rows = input.required<CatalogRow[]>();
  readonly sets = input.required<SetEntry[]>();
  readonly filters = input.required<CatalogFilters>();
  readonly total = input.required<number>();
  readonly loading = input(false);
  readonly failed = input(false);
  readonly changed = output<Partial<CatalogFilters>>();
  readonly more = output<void>();
  readonly practice = output<Question>();
  readonly bookmark = output<string>();
  private readonly filterModel = linkedSignal(() => this.filters());
  protected readonly filterForm = form(this.filterModel);
  protected readonly lectureOptions = computed(() => [
    { value: ALL_LECTURES, label: this.sets().length === 2 ? 'Oba' : 'Wszystkie' },
    ...this.sets().map((set) => ({ value: set.id, label: set.label })),
  ]);
  protected readonly kindOptions = [
    { value: 'all', label: 'Wszystkie' },
    ...Object.entries(typeLabels).map(([value, label]) => ({ value, label })),
  ];
  protected readonly showResults = computed(() => !this.loading() && !this.failed());
  protected readonly countLabel = computed(() => `Znaleziono ${this.total()} pytań. Pokazano ${this.rows().length}.`);
  protected readonly hasMore = computed(() => this.total() > this.rows().length);
  protected readonly displayRows = computed(() => this.rows().map((row) => ({
    ...row,
    typeLabel: typeLabels[row.question.kind],
    slideLabel: `slajd ${row.question.slide}`,
    topicLabel: `${row.question.topic} · ${difficulties[row.question.difficulty]}`,
    bookmarkLabel: row.saved ? '★ Zapisane' : '☆ Zapisz',
    bookmarkAriaLabel: row.saved ? 'Usuń z zapisanych' : 'Zapisz pytanie',
  })));

  protected changeFilters(): void {
    this.changed.emit(this.filterForm().value());
  }
}
