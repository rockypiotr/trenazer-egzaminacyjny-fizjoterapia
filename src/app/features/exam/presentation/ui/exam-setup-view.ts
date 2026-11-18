import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormField, FormRoot, form, required } from '@angular/forms/signals';
import { ALL_LECTURES, type SetEntry } from '../../../../domains/question-bank/domain/question-bank.models';
import { type ExamSetup } from '../../../../domains/study/domain/study.models';

type ExamSelection = Pick<ExamSetup, 'lecture' | 'which'>;

interface ExamFormModel extends ExamSelection {
  size: string;
  limit: string;
}

@Component({
  selector: 'app-exam-setup',
  imports: [FormField, FormRoot],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exam-setup-view.html',
})
export class ExamSetupView {
  readonly sets = input.required<SetEntry[]>();
  readonly questionCount = input.required<number | undefined>();
  readonly loading = input(false);
  readonly failed = input(false);
  readonly selectionChange = output<ExamSelection>();
  readonly begin = output<ExamSetup>();

  private readonly formModel = signal<ExamFormModel>({ lecture: ALL_LECTURES, which: 'mixed', size: '20', limit: '0' });
  protected readonly examForm = form(this.formModel, (fields) => {
    required(fields.lecture);
    required(fields.which);
    required(fields.size);
    required(fields.limit);
  }, {
    submission: { action: async () => this.start() },
  });
  private readonly dataUnavailable = computed(() => this.loading() || this.failed());
  protected readonly startDisabled = computed(() =>
    this.dataUnavailable() || this.examForm().invalid() || this.examForm().submitting(),
  );
  protected readonly poolSummary = computed(() => {
    if (this.loading()) return 'Ładowanie pytań…';
    if (this.failed()) return '';
    const count = this.questionCount();
    const description = 'Jeśli dostępnych jest mniej pytań niż wybierzesz, egzamin obejmie całą dostępną pulę.';
    return count === undefined ? description : `Baza: ${count} pytań. ${description}`;
  });
  protected readonly lectures = computed(() => [
    { value: ALL_LECTURES, label: this.sets().length === 2 ? 'Oba wykłady' : 'Wszystkie wykłady' },
    ...this.sets().map((set) => ({
      value: set.id,
      label: `Tylko ${set.label[0].toLocaleLowerCase('pl')}${set.label.slice(1)}`,
    })),
  ]);
  protected readonly types: readonly { value: ExamSetup['which']; label: string }[] = [
    { value: 'mixed', label: 'Mieszane' },
    { value: 'open', label: 'Wyłącznie otwarte i scenariusze' },
    { value: 'test', label: 'Tylko automatycznie oceniane' },
  ];
  protected readonly sizes = ['10', '20', '40'].map((value) => ({ value, label: value }));
  protected readonly limits = [
    { value: '0', label: 'Bez limitu' },
    ...['10', '20', '40'].map((value) => ({ value, label: value + ' minut' })),
  ];

  protected changeSelection(): void {
    const { lecture, which } = this.examForm().value();
    this.selectionChange.emit({ lecture, which });
  }

  private start(): void {
    if (this.dataUnavailable()) return;
    const { lecture, which, size, limit } = this.examForm().value();
    this.begin.emit({ lecture, which, size: Number(size), limit: Number(limit) });
  }
}
