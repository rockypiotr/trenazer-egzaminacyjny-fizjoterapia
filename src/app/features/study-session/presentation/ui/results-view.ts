import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { AnswerResult, FinishedSession } from '../../../../domains/study/domain/study.models';

interface ResultsModel extends FinishedSession {
  review: (AnswerResult & { source: string })[];
  mistakes: AnswerResult[];
  lectures: { title: string; correct: number; total: number }[];
}

@Component({
  selector: 'app-study-results',
  templateUrl: './results-view.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultsView {
  readonly result = input.required<ResultsModel>();
  readonly navigate = output<'/' | '/hard'>();
  protected readonly rounded = Math.round;

  protected score(correct: number, total: number): string {
    return total ? Math.round(100 * correct / total) + '%' : '–';
  }
}
