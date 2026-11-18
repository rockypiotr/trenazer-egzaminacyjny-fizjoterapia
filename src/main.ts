import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/core/app.config';
import { TrainerShell } from './app/layout/trainer-shell';

bootstrapApplication(TrainerShell, appConfig).catch(console.error);
