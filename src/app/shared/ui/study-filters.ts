import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { SelectField } from './select-field';
import { difficulties } from './study-labels';
import { ALL_LECTURES, type SetEntry } from '../../domains/question-bank/domain/question-bank.models';
import { type StudyFilters } from '../../domains/study/domain/study.models';

@Component({
  selector: 'app-study-filters',
  imports: [SelectField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="formbar" role="group" aria-label="Filtry nauki">
      <app-select-field fieldId="filter-lecture" label="Wykład"
        [value]="filters().lecture" [options]="lectures()" (changed)="changed.emit({ lecture: $event })" />
      <app-select-field class="wide" fieldId="filter-topic" label="Temat"
        [value]="filters().topic" [options]="topicOptions()" (changed)="changed.emit({ topic: $event })" />
      <app-select-field fieldId="filter-difficulty" label="Trudność"
        [value]="filters().difficulty" [options]="difficultyOptions" (changed)="changeDifficulty($event)" />
      <label class="filter-check">
        <input #priority id="filter-priority" type="checkbox" [checked]="filters().priority"
          (change)="changed.emit({ priority: priority.checked })"> Priorytety egzaminacyjne
      </label>
    </div>
  `,
})
export class StudyFiltersView {
  readonly filters = input.required<StudyFilters>();
  readonly sets = input.required<SetEntry[]>();
  readonly topics = input.required<string[]>();
  readonly changed = output<Partial<StudyFilters>>();

  protected readonly lectures = computed(() => [
    { value: ALL_LECTURES, label: this.sets().length === 2 ? 'Oba wykłady' : 'Wszystkie wykłady' },
    ...this.sets().map((set) => ({ value: set.id, label: set.label })),
  ]);
  protected readonly topicOptions = computed(() => [
    { value: 'all', label: 'Wszystkie tematy' },
    ...this.topics().map((topic) => ({ value: topic, label: topic })),
  ]);
  protected readonly difficultyOptions = [
    { value: 'all', label: 'Każda' },
    ...Object.entries(difficulties).map(([value, label]) => ({ value, label })),
  ];

  protected changeDifficulty(value: string): void {
    this.changed.emit({ difficulty: value as StudyFilters['difficulty'] });
  }
}
