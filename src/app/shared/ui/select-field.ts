import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-select-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'field' },
  template: `
    <label [for]="fieldId()">{{ label() }}</label>
    <select #select [id]="fieldId()" (change)="changed.emit(select.value)">
      @for (option of options(); track option.value) {
        <option [value]="option.value" [selected]="option.value === value()">{{ option.label }}</option>
      }
    </select>
  `,
})
export class SelectField {
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly options = input.required<readonly SelectOption[]>();
  readonly changed = output<string>();
}
