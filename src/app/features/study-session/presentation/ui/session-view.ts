import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { difficulties } from '../../../../shared/ui/study-labels';
import type { Question } from '../../../../domains/question-bank/domain/question-bank.models';
import type { QuizChoice, SessionMode, StudySession } from '../../../../domains/study/domain/study.models';
import { QuizView } from './quiz-view';

const titles: Record<SessionMode, string> = {
  exam: 'Próbny egzamin', flash: 'Inteligentne fiszki', daily: 'Powtórka dzienna',
  quiz: 'Quiz', recall: 'Odpowiedzi z pamięci', case: 'Przypadki',
  priority: 'Sprint priorytetów', saved: 'Zapisane pytania', review: 'Powtórka błędów',
};

@Component({
  selector: 'app-session',
  imports: [QuizView],
  templateUrl: './session-view.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionView {
  readonly session = input.required<StudySession>();
  readonly question = input.required<Question>();
  readonly source = input.required<string>();
  readonly remaining = input.required<string>();
  readonly saved = input.required<boolean>();
  readonly bookmark = output<void>();
  readonly reveal = output<void>();
  readonly rate = output<number>();
  readonly draft = output<string>();
  readonly grade = output<number>();
  readonly choose = output<QuizChoice>();
  readonly move = output<{ position: number; delta: number }>();
  readonly check = output<void>();
  readonly next = output<void>();
  readonly exit = output<void>();

  protected readonly title = computed(() => titles[this.session().mode]);
  protected readonly modeLabel = computed(() => this.session().isExam ? 'SYMULACJA EGZAMINU' : 'AKTYWNA NAUKA');
  protected readonly bookmarkLabel = computed(() => this.saved() ? '★ Zapisane' : '☆ Zapisz pytanie');
  protected readonly draftPreview = computed(() => this.session().draft || '(Brak wpisanej odpowiedzi)');
  protected readonly difficulties = difficulties;
  protected readonly ratings = [
    { grade: 0, label: 'Nie pamiętam', detail: 'Wróci pod koniec sesji', style: 'again' },
    { grade: 1, label: 'Trudne', detail: 'Powtórz jutro', style: '' },
    { grade: 2, label: 'Pamiętam', detail: 'Dłuższy odstęp', style: '' },
    { grade: 3, label: 'Bardzo łatwe', detail: 'Najdłuższy odstęp', style: 'easy' },
  ];
}
