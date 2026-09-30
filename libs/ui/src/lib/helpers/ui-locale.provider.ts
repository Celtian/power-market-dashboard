import {
  DestroyRef,
  InjectionToken,
  type Signal,
  inject,
  makeEnvironmentProviders,
  signal,
} from '@angular/core';

export type UiLocaleCleanup = VoidFunction | { unsubscribe: VoidFunction } | void;
export type UiLocaleFactory = (setLocale: (locale: string) => void) => UiLocaleCleanup;

export const UI_LOCALE = new InjectionToken<Signal<string>>('UI_LOCALE', {
  providedIn: 'root',
  factory: () => signal('en-US'),
});

export const provideUiLocale = (localeFactory?: UiLocaleFactory) =>
  makeEnvironmentProviders([
    {
      provide: UI_LOCALE,
      useFactory: () => {
        const destroyRef = inject(DestroyRef);
        const locale = signal('en-US');
        const cleanup = localeFactory?.((value) => locale.set(value));

        if (typeof cleanup === 'function') {
          destroyRef.onDestroy(cleanup);
        } else if (cleanup?.unsubscribe) {
          destroyRef.onDestroy(() => cleanup.unsubscribe());
        }

        return locale;
      },
    },
  ]);
