import type { Routes } from '@angular/router';
import { studySessionRoutes } from './features/study-session/study-session.routes';

export const routes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./features/home/presentation/pages/home.page').then((m) => m.HomePage) },
  ...studySessionRoutes,
  { path: 'exam', loadComponent: () => import('./features/exam/presentation/pages/exam.page').then((m) => m.ExamPage) },
  { path: 'catalog', loadComponent: () => import('./features/catalog/presentation/pages/catalog.page').then((m) => m.CatalogPage) },
  { path: 'coverage', loadComponent: () => import('./features/gallery/presentation/pages/coverage.page').then((m) => m.CoveragePage) },
  { path: 'gallery', loadComponent: () => import('./features/gallery/presentation/pages/gallery.page').then((m) => m.GalleryPage) },
  { path: 'settings', loadComponent: () => import('./features/progress/presentation/pages/settings.page').then((m) => m.SettingsPage) },
  { path: '**', redirectTo: '' },
];
