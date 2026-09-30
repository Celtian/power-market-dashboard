import type { ChartOptions, ChartType, Plugin } from 'chart.js';

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

const fontFamily = (): string => {
  const fallback = 'ui-sans-serif, system-ui, sans-serif';
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.body).fontFamily || fallback;
};

export const createChartTooltipShadowPlugin = <T extends ChartType>(): Plugin<T> => ({
  id: 'ui-chart-tooltip-shadow',
  beforeTooltipDraw: (chart) => {
    chart.ctx.save();
    chart.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    chart.ctx.shadowBlur = 15;
    chart.ctx.shadowOffsetX = 0;
    chart.ctx.shadowOffsetY = 6;
  },
  afterTooltipDraw: (chart) => {
    chart.ctx.restore();
  },
});

export const mergeChartTheme = <T extends ChartType>(
  theme: ChartTheme,
  options: ChartOptions<T>,
): ChartOptions<T> => {
  const dark = isDark(theme);
  const text = dark
    ? cssValue('--app-secondary-contrast-800', '#e5e7eb')
    : cssValue('--app-primary-contrast-200', '#1f2937');
  const tooltipBackground = dark
    ? cssValue('--app-secondary-800', '#1f2937')
    : cssValue('--app-primary-200', '#bfdbfe');
  const tooltipBorder = dark
    ? cssValue('--app-secondary-600', '#374151')
    : cssValue('--app-primary-400', '#60a5fa');
  const grid = dark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(100, 116, 139, 0.18)';
  const tooltipFont = { family: fontFamily(), size: 12 };
  const themed: ChartOptions<T> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { labels: { color: text, usePointStyle: true } },
      tooltip: {
        backgroundColor: tooltipBackground,
        borderColor: tooltipBorder,
        borderWidth: 1,
        bodyFont: tooltipFont,
        bodySpacing: 2,
        boxPadding: 4,
        bodyColor: text,
        cornerRadius: 8,
        padding: { x: 8, y: 4 },
        titleFont: { ...tooltipFont, weight: 600 },
        titleMarginBottom: 4,
        titleSpacing: 0,
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
