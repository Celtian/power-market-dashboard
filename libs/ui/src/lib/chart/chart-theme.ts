import type { ChartOptions, ChartType } from 'chart.js';

import type { ChartTheme } from './chart.provider';

type DefinedOptions<T extends ChartType> = NonNullable<ChartOptions<T>>;

const isDark = (theme: ChartTheme): boolean =>
  theme.type === 'dark' ||
  (theme.type === 'system' &&
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark'));

const cssValue = (name: string, fallback: string): string => {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
};

export const mergeChartTheme = <T extends ChartType>(
  theme: ChartTheme,
  options: ChartOptions<T>,
): ChartOptions<T> => {
  const dark = isDark(theme);
  const text = dark
    ? cssValue('--app-secondary-contrast-800', '#e5e7eb')
    : cssValue('--app-primary-contrast-200', '#1f2937');
  const grid = dark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(100, 116, 139, 0.18)';
  const themed: ChartOptions<T> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { labels: { color: text, usePointStyle: true } },
      tooltip: {
        backgroundColor: dark ? '#181f2d' : '#ffffff',
        borderColor: dark ? '#424b5a' : '#d1d5db',
        borderWidth: 1,
        bodyColor: text,
        titleColor: text,
      },
    },
    scales: {
      x: { grid: { color: grid }, ticks: { color: text } },
      y: { grid: { color: grid }, ticks: { color: text } },
    },
  } as ChartOptions<T>;
  const base = themed as DefinedOptions<T>;
  const supplied = options as DefinedOptions<T>;
  return {
    ...base,
    ...supplied,
    plugins: {
      ...base.plugins,
      ...supplied.plugins,
      legend: {
        ...base.plugins?.legend,
        ...supplied.plugins?.legend,
        labels: {
          ...base.plugins?.legend?.labels,
          ...supplied.plugins?.legend?.labels,
        },
      },
      tooltip: { ...base.plugins?.tooltip, ...supplied.plugins?.tooltip },
    },
    scales: {
      ...base.scales,
      ...supplied.scales,
      x: {
        ...base.scales?.['x'],
        ...supplied.scales?.['x'],
        grid: { ...base.scales?.['x']?.grid, ...supplied.scales?.['x']?.grid },
        ticks: {
          ...base.scales?.['x']?.ticks,
          ...supplied.scales?.['x']?.ticks,
        },
      },
      y: {
        ...base.scales?.['y'],
        ...supplied.scales?.['y'],
        grid: { ...base.scales?.['y']?.grid, ...supplied.scales?.['y']?.grid },
        ticks: {
          ...base.scales?.['y']?.ticks,
          ...supplied.scales?.['y']?.ticks,
        },
      },
    },
  } as ChartOptions<T>;
};
