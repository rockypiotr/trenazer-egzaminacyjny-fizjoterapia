import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { LectureSet } from '../../../../domains/question-bank/domain/question-bank.models';
import { lectureTitle } from '../../../../shared/ui/study-labels';

@Component({
  selector: 'app-coverage-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid two coverage-grid">
      @for (set of sections(); track set.id) {
        <section>
          <h2>{{ set.heading }}</h2>
          @for (row of set.coverage; track $index) {
            <div class="coverage-entry">
              <h3><span>{{ $index + 1 }}. {{ row.name }}</span>
                <span class="tag" [class]="row.statusClass">{{ row.status }}</span>
              </h3>
              <p>{{ row.description }}</p>
            </div>
          }
        </section>
      }
    </div>
  `,
})
export class CoverageView {
  readonly sets = input.required<LectureSet[]>();
  protected readonly sections = computed(() => this.sets()
    .filter((set) => set.coverage.length)
    .map((set) => ({
      id: set.id,
      heading: set.coverageTitle ?? lectureTitle(set),
      coverage: set.coverage.map((row) => ({
        ...row,
        statusClass: row.status === 'OMÓWIONE' ? 'ok' : row.status === 'BRAK' ? 'fail' : 'warn',
        description: row.slide ? `Slajdy: ${row.slide}. ${row.note}` : row.note,
      })),
    })));
}
