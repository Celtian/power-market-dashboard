import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideSonnerTheme, provideUiI18n } from '@power-market-dashboard/ui';

import { appRoutes } from './app.routes';
import { PwaUpdateService } from './pwa-update.service';
import { ThemeService } from './theme.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideUiI18n(),
    provideSonnerTheme(() => inject(ThemeService).theme),
    provideAppInitializer(() => {
      inject(PwaUpdateService);
    }),
  ],
};
