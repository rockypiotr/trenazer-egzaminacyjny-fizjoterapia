import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Question } from '../../../../domains/question-bank/domain/question-bank.models';

@Component({
  selector: 'app-review',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid two">
      <div class="panel">
        <h2>Do ponownej nauki: {{ hard().length }}</h2>
        <p class="sm">Lista uwzględnia błędy i fiszki, które sprawiły trudność.</p>
        <button class="btn" [disabled]="!hard().length" (click)="start.emit('review')">Powtórz błędy ({{ hard().length }})</button>
        @for (row of hard().slice(0, 9); track row.question.id) {
          <div class="statrow"><span>{{ row.question.question.slice(0, 105) }}</span><span class="tag warn">{{ row.misses }} bł.</span></div>
        }
      </div>
      <div class="panel">
        <h2>Zapisane pytania: {{ saved().length }}</h2>
        <p class="sm">Zapisz pytanie przyciskiem ☆ w trakcie nauki lub w banku pytań.</p>
        <button class="btn secondary" [disabled]="!saved().length" (click)="start.emit('saved')">Ćwicz zapisane ({{ saved().length }})</button>
        @for (question of saved().slice(0, 9); track question.id) {
          <div class="statrow"><span>{{ question.question.slice(0, 100) }}</span>
            <button class="btn secondary small" aria-label="Usuń zapis" (click)="remove.emit(question.id)">★</button>
          </div>
        }
      </div>
    </div>
  `,
})
export class ReviewView {
  readonly hard = input.required<{ question: Question; misses: number }[]>();
  readonly saved = input.required<Question[]>();
  readonly start = output<'review' | 'saved'>();
  readonly remove = output<string>();
}
