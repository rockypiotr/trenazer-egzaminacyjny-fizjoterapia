import { ChangeDetectionStrategy, Component, computed, DOCUMENT, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { NoticeService } from '../core/notice.service';
import { ProgressFacade } from '../domains/progress/application/facades/progress.facade';
import { ProgressOverview } from '../domains/progress/application/facades/progress-overview';
import { QuestionBankFacade } from '../domains/question-bank/application/facades/question-bank.facade';
import { percentage } from '../shared/ui/study-labels';
import { StudyLoadState } from '../shared/ui/study-load-state';
import { MOBILE_NAVIGATION, NAVIGATION } from './navigation';

type NavigationItem = (typeof NAVIGATION | typeof MOBILE_NAVIGATION)[number];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, StudyLoadState],
  templateUrl: './trainer-shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerShell {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  protected readonly bank = inject(QuestionBankFacade);
  protected readonly registry = this.bank.registry;
  protected readonly progress = inject(ProgressFacade);
  private readonly overview = inject(ProgressOverview);
  protected readonly notice = inject(NoticeService);
  protected readonly additionalNavigation = NAVIGATION.slice(3);
  protected readonly mobileMenu = signal(false);
  protected readonly dark = computed(() => this.progress.state().theme === 'dark');
  protected readonly path = toSignal(this.router.events.pipe(
    filter((event) => event instanceof NavigationEnd),
    map((event) => event.urlAfterRedirects),
  ), { initialValue: this.router.url });
  protected readonly breadcrumb = computed(() => NAVIGATION.find((item) => item.path === this.path())?.label ?? 'Sesja');
  protected readonly navigation = computed(() => this.markActive(NAVIGATION));
  protected readonly mobileNavigation = computed(() => this.markActive(MOBILE_NAVIGATION));
  protected readonly storageLabel = computed(() => this.progress.persistent() ? '● Dane na urządzeniu' : '⚠ Zapis niedostępny');
  protected readonly theme = computed(() => this.dark()
    ? { title: 'Jasny motyw', icon: '☀' } : { title: 'Ciemny motyw', icon: '☾' });
  protected readonly masteredPercent = computed(() => {
    const stats = this.overview.model();
    return percentage(stats?.covered ?? 0, stats?.counts?.cards ?? 0);
  });
  protected readonly sideStats = computed(() => {
    const stats = this.overview.model();
    if (!stats) return this.registry.error() ? 'Zestawy niedostępne.' : 'Wczytywanie…';
    const mastered = stats.counts ? `${stats.covered}/${stats.counts.cards}` : stats.covered;
    return `${mastered} fiszek opanowanych · ${stats.due} do powtórki`;
  });
  protected readonly sourceSummary = computed(() => {
    const labels = this.bank.entries().map((set) => set.label.replace(/^Wykład /, ''));
    if (!labels.length) return '';
    return `Wiedza z wykładów ${new Intl.ListFormat('pl').format(labels)}.`;
  });

  constructor() {
    effect(() => this.document.documentElement.dataset['theme'] = this.progress.state().theme);
    effect(() => {
      this.path();
      this.overview.refresh();
      this.mobileMenu.set(false);
    });
  }

  private markActive(items: readonly NavigationItem[]) {
    const path = this.path();
    return items.map((item) => ({ ...item, active: path === item.path, ariaCurrent: path === item.path ? 'page' : null }));
  }

  protected async navigate(path: string): Promise<void> {
    if (this.router.url === path || await this.router.navigateByUrl(path)) this.mobileMenu.set(false);
  }
}
