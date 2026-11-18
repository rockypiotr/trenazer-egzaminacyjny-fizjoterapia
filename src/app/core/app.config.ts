import { provideHttpClient } from '@angular/common/http';
import type { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding, withHashLocation, withInMemoryScrolling, withRouterConfig } from '@angular/router';
import { routes } from '../app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withHashLocation(),
      withRouterConfig({ canceledNavigationResolution: 'computed' }),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
  ],
};
