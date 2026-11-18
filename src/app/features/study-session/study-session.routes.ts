import { inject } from '@angular/core';
import { Router, type Routes } from '@angular/router';
import { StudyFacade } from '../../domains/study/application/facades/study.facade';
import type { LearningMode } from '../../domains/study/domain/study.models';
import type { SessionPage } from './presentation/pages/session.page';

const learningModes: LearningMode[] = ['flash', 'quiz', 'recall', 'case'];

export const studySessionRoutes: Routes = [
  ...learningModes.map((mode) => ({
    path: mode,
    data: { mode },
    loadComponent: () => import('./presentation/pages/learning.page').then((m) => m.LearningPage),
  })),
  { path: 'hard', loadComponent: () => import('./presentation/pages/review.page').then((m) => m.ReviewPage) },
  {
    path: 'session',
    canActivate: [() => Boolean(inject(StudyFacade).current()) || inject(Router).parseUrl('/')],
    canDeactivate: [(page: SessionPage | null) => page?.canLeave() ?? true],
    loadComponent: () => import('./presentation/pages/session.page').then((m) => m.SessionPage),
  },
  {
    path: 'results',
    canActivate: [() => Boolean(inject(StudyFacade).finished()) || inject(Router).parseUrl('/')],
    loadComponent: () => import('./presentation/pages/results.page').then((m) => m.ResultsPage),
  },
];
