import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { correctQuizText } from '../../../../domains/question-bank/domain/questions';
import type { Quiz } from '../../../../domains/question-bank/domain/question-bank.models';
import type { QuizChoice, StudySession } from '../../../../domains/study/domain/study.models';

@Component({
  selector: 'app-quiz-question',
  templateUrl: './quiz-view.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizView {
  readonly question = input.required<Quiz>();
  readonly session = input.required<StudySession>();
  readonly choose = output<QuizChoice>();
  readonly move = output<{ position: number; delta: number }>();
  readonly check = output<void>();
  readonly next = output<void>();

  protected readonly feedback = computed(() => {
    const result = this.session().phase === 'feedback' ? this.session().results.at(-1) : undefined;
    return result ? { ...result, label: result.good ? '✓ Poprawnie' : '✕ Niepoprawnie' } : undefined;
  });
  protected readonly answer = computed(() => correctQuizText(this.question()));
  protected readonly submitDisabled = computed(() => this.question().qtype !== 'order' && !this.session().chosen.length);
  protected readonly optionsDisabled = computed(() => this.session().phase === 'feedback');
  protected readonly nextLabel = computed(() => {
    const { index, items } = this.session();
    return index === items.length - 1 ? 'Zobacz wyniki →' : 'Następne pytanie →';
  });
  protected readonly steps = computed(() => {
    const quiz = this.question();
    if (quiz.qtype !== 'order') return [];
    const { order } = this.session();
    return order.map((index, position) => ({
      index, position, label: quiz.options[index],
      upDisabled: this.optionsDisabled() || position === 0,
      downDisabled: this.optionsDisabled() || position === order.length - 1,
    }));
  });
  protected readonly options = computed(() => {
    const question = this.question();
    const selected = this.session().chosen;
    if (question.qtype === 'order') return [];
    if (question.qtype === 'tf') {
      return ([
        { value: 'true', label: 'Prawda', letter: 'P' },
        { value: 'false', label: 'Fałsz', letter: 'F' },
      ] as const).map((option) => ({
        ...option, selected: selected.includes(option.value), highlightCorrect: false, highlightIncorrect: false, mark: '',
      }));
    }
    return question.options.map((label, value) => {
      const chosen = selected.includes(value);
      const correct = question.qtype === 'single' ? question.correct === value : question.correct.includes(value);
      return {
        value, label, letter: String.fromCharCode(65 + value), selected: chosen,
        highlightCorrect: this.optionsDisabled() && correct,
        highlightIncorrect: this.optionsDisabled() && chosen && !correct,
        mark: chosen ? '☑' : '□',
      };
    });
  });
}
