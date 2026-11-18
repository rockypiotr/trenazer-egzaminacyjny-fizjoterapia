import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { StudyLoadState } from '../../../../shared/ui/study-load-state';
import { QuestionBankFacade } from '../../../../domains/question-bank/application/facades/question-bank.facade';
import { ALL_LECTURES } from '../../../../domains/question-bank/domain/question-bank.models';
import { CoverageView } from '../ui/coverage-view';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CoverageView, StudyLoadState],
  template: `
    <div class="eyebrow">AUDYT WIEDZY</div>
    <h1>Zakres materiału według wykładu</h1>
    <p class="lead">Status wskazuje, w jakim stopniu materiały danego wykładu omawiają zagadnienie. Numery slajdów pomagają wrócić do źródła.</p>
    <app-study-load-state [loading]="data.isLoading()" [failed]="!!data.error()" (retry)="data.reload()" />
    @if (data.hasValue()) {
      <app-coverage-view [sets]="data.value().sets" />
    }
  `,
})
export class CoveragePage {
  protected readonly data = inject(QuestionBankFacade).select(signal(ALL_LECTURES));
}
