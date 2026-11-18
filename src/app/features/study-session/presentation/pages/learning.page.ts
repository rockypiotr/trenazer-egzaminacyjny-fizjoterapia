import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { StudyLoadState } from '../../../../shared/ui/study-load-state';
import { QuestionBankFacade } from '../../../../domains/question-bank/application/facades/question-bank.facade';
import { ALL_LECTURES } from '../../../../domains/question-bank/domain/question-bank.models';
import { StudyFacade } from '../../../../domains/study/application/facades/study.facade';
import type { LearningMode, StudyFilters, StudyMode } from '../../../../domains/study/domain/study.models';
import { StudyFiltersView } from '../../../../shared/ui/study-filters';

const modes = {
  flash: {
    title: 'Fiszki z powtórkami', kind: 'card', group: 'cards',
    description: 'Najpierw przywołaj odpowiedź z pamięci, następnie oceń jej znajomość. Trudniejsze wracają częściej.',
    tip: 'Odsłoń odpowiedź dopiero po samodzielnej próbie. „Nie pamiętam” odkłada fiszkę na krótką powtórkę, „Bardzo łatwe” wydłuża odstęp.',
  },
  quiz: {
    title: 'Sprawdź się w quizie', kind: 'quiz', group: 'quizzes',
    description: 'Pytania ABCD, wielokrotnego wyboru, prawda/fałsz oraz układanie etapów w kolejności.',
    tip: 'W pytaniach wielokrotnego wyboru zaznacz wszystkie poprawne odpowiedzi. Przy układaniu kroków korzystaj ze strzałek ↑ ↓.',
  },
  recall: {
    title: 'Odpowiedz własnymi słowami', kind: 'open', group: 'opens',
    description: 'Zapisz odpowiedź bez podglądania materiału. Po odsłonięciu porównaj najważniejsze punkty i ocenę.',
    tip: 'Sprawdź, czy Twoja odpowiedź zawiera kluczowe elementy. Pytania otwarte oceniasz samodzielnie.',
  },
  case: {
    title: 'Rozwiąż sytuacje praktyczne', kind: 'case', group: 'cases',
    description: 'Opis sytuacji jest ćwiczeniem dydaktycznym. Wnioski wynikają z treści wykładów.',
    tip: 'Najpierw zapisz decyzję, dopiero później wyświetl schemat odpowiedzi.',
  },
} as const;

@Component({
  imports: [StudyFiltersView, StudyLoadState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="eyebrow">TRYB NAUKI</div>
    <h1>{{ config().title }}</h1>
    <p class="lead">{{ config().description }}</p>
    <app-study-filters [sets]="registry()" [topics]="topics()" [filters]="study.filters()"
      (changed)="changeFilters($event)" />
    <app-study-load-state [loading]="data.isLoading()" [failed]="!!data.error()" (retry)="data.reload()" />
    <div class="grid two">
      <div class="panel">
        @if (countLabel(); as label) { <div class="tag prime">{{ label }}</div> }
        <h2 class="mode-session-title">Sesja nauki</h2>
        <p class="sm">Pytania są dobierane z aktywnych filtrów. Fiszka oceniona jako „Nie pamiętam” może wrócić w tej samej sesji.</p>
        <div class="btn-row">
          <button class="btn" [disabled]="startDisabled()" (click)="pending.set(mode())">Rozpocznij sesję</button>
          @if (mode() === 'flash') {
            <button class="btn secondary" [disabled]="startDisabled()" (click)="pending.set('daily')">Dzisiejsze powtórki</button>
          }
        </div>
      </div>
      <div class="panel"><h3>Jak się uczyć?</h3><p>{{ config().tip }}</p><div class="tag">Źródło pod każdym pytaniem</div></div>
    </div>
  `,
})
export class LearningPage {
  readonly mode = input.required<LearningMode>();
  protected readonly study = inject(StudyFacade);
  private readonly bank = inject(QuestionBankFacade);
  protected readonly registry = this.bank.entries;
  protected readonly pending = signal<StudyMode | null>(null);
  private readonly usesRegistryCount = computed(() => {
    const { lecture, topic, difficulty, priority } = this.study.filters();
    return lecture === ALL_LECTURES && topic === 'all' && difficulty === 'all' && !priority;
  });
  protected readonly data = this.bank.select(computed(() =>
    this.pending() || !this.usesRegistryCount() ? this.study.filters().lecture : undefined));
  protected readonly topics = this.bank.topics;
  protected readonly config = computed(() => modes[this.mode()]);
  protected readonly startDisabled = computed(() => this.data.isLoading() || !!this.data.error());
  protected readonly countLabel = computed(() => {
    const { kind, group } = this.config();
    const count = this.data.hasValue()
      ? this.study.available(this.data.value()).filter((question) => question.kind === kind).length
      : this.usesRegistryCount() ? this.bank.counts()?.[group] : undefined;
    return count === undefined ? '' : `${count} dostępnych pytań`;
  });

  constructor() {
    effect(() => {
      const mode = this.pending();
      if (!mode || !this.data.hasValue()) return;
      const data = this.data.value();
      untracked(() => {
        this.pending.set(null);
        this.study.startMode(data, mode);
      });
    });
  }

  protected changeFilters(filters: Partial<StudyFilters>): void {
    this.pending.set(null);
    this.study.updateFilters(filters);
  }
}
