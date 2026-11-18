import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { SessionSummary } from '../../../../domains/study/domain/study.models';

interface TopicProgress {
  topic: string;
  right: number;
  wrong: number;
  items: number;
  seen: number;
}

@Component({
  selector: 'app-progress-settings',
  templateUrl: './progress-settings-view.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressSettingsView {
  readonly topics = input.required<TopicProgress[]>();
  readonly history = input.required<SessionSummary[]>();
  readonly exportBackup = output<void>();
  readonly importBackup = output<File>();
  readonly reset = output<void>();

  protected selectFile(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (file) this.importBackup.emit(file);
  }

  protected date(timestamp: number): string {
    return new Date(timestamp).toLocaleString('pl-PL');
  }

  protected score(correct: number, total: number): string {
    return total ? Math.round(100 * correct / total) + '%' : '–';
  }
}
