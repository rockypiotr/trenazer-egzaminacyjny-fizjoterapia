import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { percentage } from '../../../../shared/ui/study-labels';
import type { LearningMode, StudyMode } from '../../../../domains/study/domain/study.models';

interface HomeModel {
  counts?: { cards: number; quizzes: number; opens: number; cases: number };
  covered: number;
  due: number;
  attempts: number;
  sessions: number;
  lectures: { id: string; label: string; title: string; total?: number; mastered: number }[];
}

@Component({
  selector: 'app-study-home',
  templateUrl: './home-view.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeView {
  readonly model = input.required<HomeModel>();
  readonly start = output<StudyMode>();
  readonly exam = output<void>();
  readonly lecture = output<string>();
  protected readonly description = computed(() => {
    const counts = this.model().counts;
    return counts
      ? `${counts.cards} fiszek, ${counts.quizzes} pytań testowych, ${counts.opens} pytań otwartych i ${counts.cases} scenariuszy — opracowanych z prezentacji, ze źródłami na slajdach.`
      : 'Fiszki, pytania testowe, pytania otwarte i scenariusze opracowane z prezentacji, ze źródłami na slajdach.';
  });
  protected readonly lectures = computed(() => this.model().lectures.map((set) => ({
    ...set,
    progress: percentage(set.mastered, set.total ?? 0),
    summary: `${set.total === undefined ? set.mastered : `${set.mastered}/${set.total}`} fiszek opanowanych`,
  })));
  protected readonly modes: { id: LearningMode; icon: string; title: string; description: string }[] = [
    { id: 'flash', icon: '▤', title: 'Inteligentne fiszki', description: 'Przypomnij z pamięci i oceń odpowiedź. System planuje kolejną powtórkę.' },
    { id: 'quiz', icon: '☑', title: 'Quizy i sekwencje', description: 'ABCD, wielokrotny wybór, prawda/fałsz, kolejność etapów.' },
    { id: 'recall', icon: '✎', title: 'Odpowiedź własnymi słowami', description: 'Zapisz odpowiedź, poznaj wzór i oceń się samodzielnie.' },
    { id: 'case', icon: '♧', title: 'Przypadki praktyczne', description: 'Ćwicz rozpoznawanie sytuacji i właściwe decyzje na podstawie slajdów.' },
  ];
}
