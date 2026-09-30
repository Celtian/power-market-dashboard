import type { Chart } from 'chart.js';

import { createChartTooltipShadowPlugin, mergeChartTheme } from './chart-theme';

describe('chart theme', () => {
  beforeEach(() => {
    document.documentElement.style.setProperty('--app-primary-200', '#light-background');
    document.documentElement.style.setProperty('--app-primary-400', '#light-border');
    document.documentElement.style.setProperty('--app-primary-contrast-200', '#light-text');
    document.documentElement.style.setProperty('--app-secondary-600', '#dark-border');
    document.documentElement.style.setProperty('--app-secondary-800', '#dark-background');
    document.documentElement.style.setProperty('--app-secondary-contrast-800', '#dark-text');
    document.body.style.fontFamily = 'Test Sans, sans-serif';
  });

  afterEach(() => {
    for (const property of [
      '--app-primary-200',
      '--app-primary-400',
      '--app-primary-contrast-200',
      '--app-secondary-600',
      '--app-secondary-800',
      '--app-secondary-contrast-800',
    ]) {
      document.documentElement.style.removeProperty(property);
    }
    document.body.style.removeProperty('font-family');
  });

  it('styles the light tooltip like ui-tooltip and preserves supplied options', () => {
    const label = vi.fn(() => 'Supplied label');
    const options = mergeChartTheme<'line'>(
      { type: 'light' },
      { plugins: { tooltip: { callbacks: { label }, caretSize: 7 } } },
    );

    expect(options.maintainAspectRatio).toBe(false);
    expect(options.plugins?.tooltip).toEqual(
      expect.objectContaining({
        backgroundColor: '#light-background',
        bodyColor: '#light-text',
        bodyFont: { family: '"Test Sans", sans-serif', size: 12 },
        bodySpacing: 2,
        borderColor: '#light-border',
        borderWidth: 1,
        boxPadding: 4,
        callbacks: { label },
        caretSize: 7,
        cornerRadius: 8,
        padding: { x: 8, y: 4 },
        titleColor: '#light-text',
        titleFont: { family: '"Test Sans", sans-serif', size: 12, weight: 600 },
        titleMarginBottom: 4,
        titleSpacing: 0,
      }),
    );
    expect(options.scales?.['x']?.grid?.color).toBe('rgba(100, 116, 139, 0.18)');
  });

  it('uses ui-tooltip colors and grid colors in the dark theme', () => {
    const options = mergeChartTheme<'bar'>({ type: 'dark' }, {});

    expect(options.plugins?.tooltip).toEqual(
      expect.objectContaining({
        backgroundColor: '#dark-background',
        bodyColor: '#dark-text',
        borderColor: '#dark-border',
        titleColor: '#dark-text',
      }),
    );
    expect(options.scales?.['y']?.grid?.color).toBe('rgba(148, 163, 184, 0.18)');
  });

  it('adds and safely restores the canvas tooltip shadow', () => {
    const context = {
      restore: vi.fn(),
      save: vi.fn(),
      shadowBlur: 0,
      shadowColor: '',
      shadowOffsetX: 0,
      shadowOffsetY: 0,
    } as unknown as CanvasRenderingContext2D;
    const chart = { ctx: context } as unknown as Chart<'line'>;
    const plugin = createChartTooltipShadowPlugin<'line'>();

    plugin.beforeTooltipDraw?.(chart, {} as never, {});

    expect(context.save).toHaveBeenCalledOnce();
    expect(context.shadowColor).toBe('rgba(0, 0, 0, 0.2)');
    expect(context.shadowBlur).toBe(15);
    expect(context.shadowOffsetX).toBe(0);
    expect(context.shadowOffsetY).toBe(6);

    plugin.afterTooltipDraw?.(chart, {} as never, {});
    expect(context.restore).toHaveBeenCalledOnce();
  });
});
