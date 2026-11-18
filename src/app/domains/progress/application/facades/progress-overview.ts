import { computed, inject, Injectable, signal } from '@angular/core';
import { QuestionBankFacade } from '../../../question-bank/application/facades/question-bank.facade';
import { ProgressFacade } from './progress.facade';

@Injectable({ providedIn: 'root' })
export class ProgressOverview {
  private readonly progress = inject(ProgressFacade);
  private readonly bank = inject(QuestionBankFacade);
  private readonly time = signal(Date.now());
  private readonly lecturesByQuestion = computed(() => new Map(this.bank.entriesWithMetadata().flatMap((entry) =>
    (entry.progressIds ?? []).map((id) => [id, entry.id] as const),
  )));

  refresh(): void {
    this.time.set(Date.now());
  }

  readonly model = computed(() => {
    if (!this.bank.registry.hasValue()) return undefined;
    const sets = this.bank.entriesWithMetadata();
    const { cards, records, sessions } = this.progress.state();
    const mastered = new Map(sets.map(({ id }) => [id, 0]));
    const lectures = this.lecturesByQuestion();
    let due = 0;
    let attempts = 0;
    const now = this.time();
    for (const [id, card] of Object.entries(cards)) {
      const lecture = lectures.get(id);
      if (!card || lecture === undefined) continue;
      if (card.reps >= 2) mastered.set(lecture, (mastered.get(lecture) ?? 0) + 1);
      if (card.due <= now && card.right + card.wrong > 0) due++;
    }
    for (const [id, record] of Object.entries(records)) {
      if (record && id.startsWith('Q-') && lectures.has(id)) {
        attempts += record.right + record.wrong;
      }
    }

    return {
      counts: this.bank.counts(), covered: [...mastered.values()].reduce((total, count) => total + count, 0), due, attempts,
      sessions: sessions.length, lectures: sets.map(({ id, label, title, counts }) => ({
        id, label, title, total: counts?.cards, mastered: mastered.get(id) ?? 0,
      })),
    };
  });
}
