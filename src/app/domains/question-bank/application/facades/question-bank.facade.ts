import { computed, inject, Injectable, type Signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ALL_LECTURES, type QuestionCounts } from '../../domain/question-bank.models';
import { QuestionBankRepository } from '../../infrastructure/question-bank.repository';

@Injectable({ providedIn: 'root' })
export class QuestionBankFacade {
  private readonly repository = inject(QuestionBankRepository);
  private readonly registryResource = rxResource({ stream: () => this.repository.loadRegistry() });
  readonly registry = this.registryResource.asReadonly();
  readonly entries = computed(() => this.registry.hasValue() ? this.registry.value() ?? [] : []);
  readonly entriesWithMetadata = computed(() => {
    const metadata = this.repository.metadata();
    return this.entries().map((entry) => ({ ...entry, ...metadata.get(entry.id) }));
  });
  readonly topics = computed(() => [...new Set(this.entriesWithMetadata().flatMap((entry) => entry.topics ?? []))]
    .sort((a, b) => a.localeCompare(b, 'pl')));

  retryRegistry(): void {
    this.registryResource.reload();
  }

  counts(lecture = ALL_LECTURES): QuestionCounts | undefined {
    const total = { cards: 0, quizzes: 0, opens: 0, cases: 0 };
    for (const entry of this.entriesWithMetadata()) {
      if (lecture !== ALL_LECTURES && entry.id !== lecture) continue;
      if (!entry.counts) return undefined;
      total.cards += entry.counts.cards;
      total.quizzes += entry.counts.quizzes;
      total.opens += entry.counts.opens;
      total.cases += entry.counts.cases;
    }
    return total;
  }

  select(lecture: Signal<string | undefined>) {
    return rxResource({
      params: () => {
        const id = lecture();
        if (!id || !this.registry.hasValue()) return undefined;
        const entries = this.entries();
        return id === ALL_LECTURES ? entries : entries.filter((entry) => entry.id === id);
      },
      stream: ({ params }) => this.repository.load(params),
    });
  }
}
