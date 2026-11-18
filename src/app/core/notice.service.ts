import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NoticeService {
  private readonly text = signal('');
  readonly message = this.text.asReadonly();
  private timer: ReturnType<typeof setTimeout> | undefined;

  show(message: string): void {
    clearTimeout(this.timer);
    this.text.set(message);
    this.timer = setTimeout(() => this.text.set(''), 3200);
  }
}
