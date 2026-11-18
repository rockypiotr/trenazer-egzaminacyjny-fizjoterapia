import { HttpClient } from '@angular/common/http';
import { DOCUMENT, inject, Injectable, signal } from '@angular/core';
import { forkJoin, map, type Observable, of, shareReplay, tap } from 'rxjs';
import { isQuestionId } from '../domain/questions';
import { ALL_LECTURES, type LectureSet, type Question, type SetContent, type SetEntry, type StudyData } from '../domain/question-bank.models';

const setIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
type SetMetadata = Pick<SetEntry, 'counts' | 'topics' | 'progressIds'>;

@Injectable({ providedIn: 'root' })
export class QuestionBankRepository {
  private readonly http = inject(HttpClient);
  private readonly registryUrl = new URL('data/sets.json', inject(DOCUMENT).baseURI);
  private readonly cache = new Map<string, Observable<LectureSet>>();
  private readonly inferredMetadata = signal(new Map<string, SetMetadata>());
  readonly metadata = this.inferredMetadata.asReadonly();

  loadRegistry() {
    return this.http.get<SetEntry[]>(this.registryUrl.href).pipe(
      map((registry) => {
        if (!Array.isArray(registry) || registry.some((entry) => !entry || typeof entry.file !== 'string')) {
          throw new Error('Rejestr zestawów ma niepoprawny format.');
        }
        const ids = new Set(registry.map((entry) => entry.id));
        if (ids.size !== registry.length || ids.has(ALL_LECTURES) ||
            [...ids].some((id) => typeof id !== 'string' || !setIdPattern.test(id))) {
          throw new Error('Każdy zestaw musi mieć własne, poprawne ID. ID „both” jest zarezerwowane.');
        }
        return registry;
      }),
    );
  }

  load(entries: readonly SetEntry[]) {
    const sets$ = entries.length ? forkJoin(entries.map((entry) => this.loadSet(entry))) : of([]);
    return sets$.pipe(
      map((sets): StudyData => {
        const cards = sets.flatMap((set) => set.cards);
        const quizzes = sets.flatMap((set) => set.quizzes);
        const opens = sets.flatMap((set) => set.opens);
        const cases = sets.flatMap((set) => set.cases);
        const all = [...cards, ...quizzes, ...opens, ...cases];
        const questionsById = new Map(all.map((question) => [question.id, question]));
        if (questionsById.size !== all.length) throw new Error('Każde pytanie musi mieć własne ID.');

        return {
          sets, cards, quizzes, opens, cases, all, questionsById,
          setsById: new Map(sets.map((set) => [set.id, set])),
          images: sets.flatMap((set) => set.images),
          coverage: sets.flatMap((set) => set.coverage),
        };
      }),
    );
  }

  private loadSet(entry: SetEntry) {
    const cached = this.cache.get(entry.id);
    if (cached) return cached;

    const url = new URL(entry.file, this.registryUrl);
    const request = this.http.get<Partial<SetContent>>(url.href).pipe(
      map((content): LectureSet => ({
        ...entry,
        cards: this.validate(content.cards, 'card', 'F', entry),
        quizzes: this.validate(content.quizzes, 'quiz', 'Q', entry),
        opens: this.validate(content.opens, 'open', 'O', entry),
        cases: this.validate(content.cases, 'case', 'C', entry),
        coverage: content.coverage ?? [],
        images: (content.images ?? []).map((image) => ({ ...image, src: new URL(image.src, url).href })),
      })),
      tap((set) => {
        if (entry.counts && entry.topics && entry.progressIds) return;
        const { cards, quizzes, opens, cases } = set;
        this.inferredMetadata.update((metadata) => new Map(metadata).set(entry.id, {
          counts: entry.counts ?? { cards: cards.length, quizzes: quizzes.length, opens: opens.length, cases: cases.length },
          topics: entry.topics ?? [...new Set([...cards, ...quizzes, ...opens, ...cases].map((question) => question.topic))],
          progressIds: entry.progressIds ?? [...cards, ...quizzes].map((question) => question.id),
        }));
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.cache.set(entry.id, request);
    return request;
  }

  private validate<T extends Question>(
    items: T[] = [], kind: T['kind'], prefix: string, entry: SetEntry,
  ): T[] {
    for (const question of items) {
      if (!isQuestionId(question.id, prefix) || question.kind !== kind || question.lecture !== entry.id) {
        throw new Error(`Sprawdź ID, typ i zestaw pytania ${question.id} w ${entry.file}.`);
      }
    }
    return items;
  }
}
