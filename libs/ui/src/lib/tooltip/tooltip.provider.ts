import { InjectionToken, makeEnvironmentProviders } from '@angular/core';

export interface TooltipConfig {
  arrow: boolean;
  maxWidth: number | string;
}

export const DEFAULT_TOOLTIP_CONFIG: TooltipConfig = {
  arrow: true,
  maxWidth: '12rem',
};

export const TOOLTIP_CONFIG = new InjectionToken<TooltipConfig>(
  'TOOLTIP_CONFIG',
  {
    providedIn: 'root',
    factory: () => DEFAULT_TOOLTIP_CONFIG,
  },
);

export const provideTooltip = (config?: Partial<TooltipConfig>) => {
  return makeEnvironmentProviders([
    {
      provide: TOOLTIP_CONFIG,
      useValue: {
        ...DEFAULT_TOOLTIP_CONFIG,
        ...config,
      },
    },
  ]);
};
