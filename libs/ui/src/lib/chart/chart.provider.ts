import {
  type EnvironmentProviders,
  InjectionToken,
  type Signal,
  makeEnvironmentProviders,
  signal,
} from '@angular/core';

export type ChartThemeType = 'light' | 'dark' | 'system';

export interface ChartTheme {
  readonly type: ChartThemeType;
}

export const CHART_THEME = new InjectionToken<Signal<ChartTheme>>('CHART_THEME');

export const provideChartTheme = (
  themeFactory: () => Signal<ChartTheme> = () => signal({ type: 'system' }),
): EnvironmentProviders =>
  makeEnvironmentProviders([{ provide: CHART_THEME, useFactory: themeFactory }]);
