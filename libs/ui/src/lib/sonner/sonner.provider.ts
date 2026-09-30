import {
  EnvironmentProviders,
  InjectionToken,
  Signal,
  makeEnvironmentProviders,
  signal,
} from '@angular/core';

import { Theme } from 'ngx-sonner';

export const SONNER_THEME = new InjectionToken<Signal<Theme>>('SONNER_THEME');

export const provideSonnerTheme = (
  themeFactory: () => Signal<Theme> = () => signal('system'),
): EnvironmentProviders => {
  return makeEnvironmentProviders([
    {
      provide: SONNER_THEME,
      useFactory: themeFactory,
    },
  ]);
};
