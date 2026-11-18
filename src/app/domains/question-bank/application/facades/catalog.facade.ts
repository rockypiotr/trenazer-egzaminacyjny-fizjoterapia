import { Injectable, signal } from '@angular/core';
import { matchesLecture } from '../../domain/questions';
import { ALL_LECTURES, type Question, type QuestionKind } from '../../domain/question-bank.models';

export interface CatalogFilters {
  search: string;
  lecture: string;
  kind: QuestionKind | 'all';
  priority: boolean;
}

const PAGE_SIZE = 24;

@Injectable({ providedIn: 'root' })
export class CatalogFacade {
  private readonly state = signal<CatalogFilters>({ search: '', lecture: ALL_LECTURES, kind: 'all', priority: false });
  private readonly pageSize = signal(PAGE_SIZE);
  readonly filters = this.state.asReadonly();
  readonly limit = this.pageSize.asReadonly();

  filter(questions: readonly Question[]): Question[] {
    const { search, lecture, kind, priority } = this.filters();
    const term = search.trim().toLocaleLowerCase('pl-PL');
    return questions.filter((question) => {
      const answer = question.kind === 'quiz' ? '' : question.answer;
      const scenario = question.kind === 'case' ? question.scenario : '';
      return matchesLecture(question, lecture) && (kind === 'all' || question.kind === kind) &&
        (!priority || question.priority) &&
        (!term || `${question.question} ${question.topic} ${answer} ${scenario} ${question.slide}`.toLocaleLowerCase('pl-PL').includes(term));
    });
  }

  update(patch: Partial<CatalogFilters>): void {
    this.state.update((current) => ({ ...current, ...patch }));
    this.pageSize.set(PAGE_SIZE);
  }

  more(): void {
    this.pageSize.update((limit) => limit + PAGE_SIZE);
  }
}
