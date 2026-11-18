import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-study-load-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (failed()) {
      <p>Nie udało się wczytać zestawów.</p>
      <button type="button" class="btn secondary" (click)="retry.emit()">Spróbuj ponownie</button>
    } @else if (loading()) {
      <p>Wczytywanie zestawów…</p>
    }
  `,
})
export class StudyLoadState {
  readonly loading = input.required<boolean>();
  readonly failed = input.required<boolean>();
  readonly retry = output<void>();
}
