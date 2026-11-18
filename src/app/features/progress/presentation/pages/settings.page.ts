import { ChangeDetectionStrategy, Component, computed, DOCUMENT, inject, signal } from '@angular/core';
import { NoticeService } from '../../../../core/notice.service';
import { StudyLoadState } from '../../../../shared/ui/study-load-state';
import { QuestionBankFacade } from '../../../../domains/question-bank/application/facades/question-bank.facade';
import { StudyFacade } from '../../../../domains/study/application/facades/study.facade';
import { ALL_LECTURES } from '../../../../domains/question-bank/domain/question-bank.models';
import { ProgressFacade } from '../../../../domains/progress/application/facades/progress.facade';
import { readBackup } from '../../../../domains/progress/infrastructure/progress-storage';
import { ProgressSettingsView } from '../ui/progress-settings-view';

@Component({
  imports: [ProgressSettingsView, StudyLoadState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-study-load-state [loading]="data.isLoading()" [failed]="!!data.error()" (retry)="data.reload()" />
    <app-progress-settings [topics]="topics()" [history]="history()" (exportBackup)="download()"
      (importBackup)="import($event)" (reset)="reset()" />
  `,
})
export class SettingsPage {
  private readonly document = inject(DOCUMENT);
  private readonly notice = inject(NoticeService);
  private readonly progress = inject(ProgressFacade);
  private readonly study = inject(StudyFacade);
  protected readonly data = inject(QuestionBankFacade).select(signal(ALL_LECTURES));
  protected readonly history = computed(() => this.progress.state().sessions.slice(-15).reverse());
  protected readonly topics = computed(() => {
    if (!this.data.hasValue()) return [];
    const topics = new Map<string, { topic: string; right: number; wrong: number; items: number; seen: number }>();
    for (const question of this.data.value().all) {
      const row = topics.get(question.topic) ?? { topic: question.topic, right: 0, wrong: 0, items: 0, seen: 0 };
      const record = this.progress.getRecord(question);
      row.right += record.right;
      row.wrong += record.wrong;
      row.items++;
      if (record.right + record.wrong > 0) row.seen++;
      topics.set(question.topic, row);
    }
    return [...topics.values()].sort((a, b) => a.topic.localeCompare(b.topic, 'pl'));
  });

  protected download(): void {
    const blob = new Blob([JSON.stringify(this.progress.exportData(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = 'Postepy_Trenazer_Fizjoterapia.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 800);
    this.notice.show('Wyeksportowano plik JSON z postępami.');
  }

  protected async import(file: File): Promise<void> {
    try {
      const backup = await readBackup(file);
      if (!confirm('Zaimportować postępy? Bieżące postępy zostaną zastąpione.')) return;
      this.progress.replace(backup);
      this.study.clearResults();
      this.notice.show('Zaimportowano postępy.');
    } catch (error) {
      this.notice.show('Nie udało się zaimportować: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  protected reset(): void {
    if (!confirm('Czy na pewno wyczyścić WSZYSTKIE postępy i historię?')) return;
    this.progress.reset();
    this.study.clearResults();
    this.notice.show('Wyzerowano postępy.');
  }
}
