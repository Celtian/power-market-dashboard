import { provideHttpClient } from '@angular/common/http';
import {
  ApplicationConfig,
  computed,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { TranslocoService, provideTransloco } from '@jsverse/transloco';
import { provideTranslocoLocale } from '@jsverse/transloco-locale';
import { cookiesStorage, provideTranslocoPersistLang } from '@jsverse/transloco-persist-lang';
import { provideUpdateApp } from 'ngx-update-app';
import { firstValueFrom } from 'rxjs';

import {
  DEFAULT_UI_I18N,
  provideChartTheme,
  provideSonnerTheme,
  provideUiI18n,
  provideUiLocale,
} from '@power-market-dashboard/ui';

import { AppUpdatePromptService } from './app-update-prompt.service';
import { appRoutes } from './app.routes';
import { provideLocalizedTitle } from './localized-title-strategy';
import { PwaUpdateService } from './pwa-update.service';
import { ThemeService } from './theme.service';
import { TranslocoHttpLoader } from './transloco-loader';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(appRoutes),
    provideLocalizedTitle(),
    provideTransloco({
      config: {
        availableLangs: ['en', 'cs'],
        defaultLang: 'en',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
    provideTranslocoLocale({
      defaultLocale: 'en-US',
      langToLocaleMapping: { cs: 'cs-CZ', en: 'en-US' },
    }),
    provideTranslocoPersistLang({
      getLangFn: ({ cachedLang }) => (cachedLang === 'cs' ? 'cs' : 'en'),
      storage: { useValue: cookiesStorage() },
    }),
    provideAppInitializer(() => {
      const transloco = inject(TranslocoService);
      return firstValueFrom(transloco.load(transloco.getActiveLang()));
    }),
    provideUpdateApp({
      interval: 60_000,
      dryRun: false,
      onUpdateFactory: () => {
        const updatePrompt = inject(AppUpdatePromptService);
        return () => void updatePrompt.open();
      },
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideUiLocale((setLocale) => {
      const transloco = inject(TranslocoService);
      const update = (language: string) => setLocale(language === 'cs' ? 'cs-CZ' : 'en-US');
      update(transloco.getActiveLang());
      return transloco.langChanges$.subscribe(update);
    }),
    provideUiI18n((setI18n) => {
      const transloco = inject(TranslocoService);
      const update = () =>
        setI18n({
          ...DEFAULT_UI_I18N,
          calendar: {
            nextMonth: transloco.translate('ui.calendar.next-month'),
            nextPeriod: transloco.translate('ui.calendar.next-period'),
            nextYear: transloco.translate('ui.calendar.next-year'),
            previousMonth: transloco.translate('ui.calendar.previous-month'),
            previousPeriod: transloco.translate('ui.calendar.previous-period'),
            previousYear: transloco.translate('ui.calendar.previous-year'),
          },
          cancel: transloco.translate('ui.cancel'),
          input: {
            ...DEFAULT_UI_I18N.input,
            clear: transloco.translate('ui.input.clear'),
            datePlaceholder: transloco.translate('ui.input.date-placeholder'),
            openDatePicker: transloco.translate('ui.input.open-date-picker'),
            select: transloco.translate('ui.input.select'),
            selectDate: transloco.translate('ui.input.select-date'),
            selectOption: transloco.translate('ui.input.select-option'),
          },
          modal: { close: transloco.translate('ui.modal.close') },
          reset: transloco.translate('ui.reset'),
          retry: transloco.translate('ui.retry'),
          save: transloco.translate('ui.save'),
          validation: {
            email: transloco.translate('ui.validation.email'),
            invalid: transloco.translate('ui.validation.invalid'),
            maximum: (value) =>
              value === undefined
                ? transloco.translate('ui.validation.too-large')
                : transloco.translate('ui.validation.maximum', { value }),
            maximumDate: (value) =>
              value === undefined
                ? transloco.translate('ui.validation.too-late')
                : transloco.translate('ui.validation.maximum-date', { value }),
            maximumLength: (value) =>
              value === undefined
                ? transloco.translate('ui.validation.too-long')
                : transloco.translate('ui.validation.maximum-length', {
                    value,
                  }),
            minimum: (value) =>
              value === undefined
                ? transloco.translate('ui.validation.too-small')
                : transloco.translate('ui.validation.minimum', { value }),
            minimumDate: (value) =>
              value === undefined
                ? transloco.translate('ui.validation.too-early')
                : transloco.translate('ui.validation.minimum-date', { value }),
            minimumLength: (value) =>
              value === undefined
                ? transloco.translate('ui.validation.too-short')
                : transloco.translate('ui.validation.minimum-length', {
                    value,
                  }),
            parse: transloco.translate('ui.validation.parse'),
            pattern: transloco.translate('ui.validation.pattern'),
            required: transloco.translate('ui.validation.required'),
          },
        });
      return transloco.selectTranslation().subscribe(update);
    }),
    provideChartTheme(() => {
      const theme = inject(ThemeService);
      return computed(() => ({ type: theme.theme() }));
    }),
    provideSonnerTheme(() => inject(ThemeService).theme),
    provideAppInitializer(() => {
      inject(PwaUpdateService);
    }),
  ],
};
