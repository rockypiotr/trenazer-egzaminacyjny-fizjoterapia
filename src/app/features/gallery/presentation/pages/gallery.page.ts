import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { StudyLoadState } from '../../../../shared/ui/study-load-state';
import { QuestionBankFacade } from '../../../../domains/question-bank/application/facades/question-bank.facade';
import { ALL_LECTURES } from '../../../../domains/question-bank/domain/question-bank.models';
import { GalleryView } from '../ui/gallery-view';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GalleryView, StudyLoadState],
  template: `
    <div class="eyebrow">MATERIAŁY GRAFICZNE</div>
    <h1>Ilustracje i schematy</h1>
    <p class="lead">Ilustracje ze slajdów i schematy do powtórki. Podpis pod każdą grafiką wskazuje wykład i slajd źródłowy.</p>
    <app-study-load-state [loading]="data.isLoading()" [failed]="!!data.error()" (retry)="data.reload()" />
    @if (data.hasValue()) {
      <app-gallery-view [images]="data.value().images" />
    }
  `,
})
export class GalleryPage {
  protected readonly data = inject(QuestionBankFacade).select(signal(ALL_LECTURES));
}
