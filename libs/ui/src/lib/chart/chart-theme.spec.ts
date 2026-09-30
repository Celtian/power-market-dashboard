import { mergeChartTheme } from './chart-theme';

describe('chart theme', () => {
  it('merges supplied options over the light theme', () => {
    const options = mergeChartTheme<'line'>(
      { type: 'light' },
      { plugins: { tooltip: { enabled: false } } },
    );

    expect(options.maintainAspectRatio).toBe(false);
    expect(options.plugins?.tooltip).toEqual(expect.objectContaining({ enabled: false }));
    expect(options.scales?.['x']?.grid?.color).toBe('rgba(100, 116, 139, 0.18)');
  });

  it('uses dark grid colors', () => {
    const options = mergeChartTheme<'bar'>({ type: 'dark' }, {});
    expect(options.scales?.['y']?.grid?.color).toBe('rgba(148, 163, 184, 0.18)');
  });
});
