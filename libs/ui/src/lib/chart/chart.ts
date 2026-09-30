import { Component, type InputSignal, type Signal, computed, inject, input } from '@angular/core';

import type { ChartData, ChartOptions, Plugin } from 'chart.js';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { createChartTooltipShadowPlugin, mergeChartTheme } from './chart-theme';
import { CHART_THEME } from './chart.provider';

@Component({
  selector: 'ui-chart-line',
  imports: [BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
  template: `
    <div class="relative size-full">
      <canvas
        baseChart
        role="img"
        type="line"
        [attr.aria-label]="accessibleLabel()"
        [data]="data()"
        [legend]="legend()"
        [options]="resolvedOptions()"
        [plugins]="tooltipPlugins"
      ></canvas>
    </div>
  `,
  host: { class: 'block h-80 w-full' },
})
export class ChartLine {
  private readonly chartTheme = inject(CHART_THEME, { optional: true });
  public readonly accessibleLabel = input.required<string>();
  public readonly data = input.required<ChartData<'line'>>();
  public readonly legend = input(false);
  public readonly options: InputSignal<ChartOptions<'line'>> = input<ChartOptions<'line'>>({});
  protected readonly tooltipPlugins: Plugin<'line'>[] = [
    createChartTooltipShadowPlugin<'line'>(),
  ];
  protected readonly resolvedOptions: Signal<ChartOptions<'line'>> = computed(() =>
    mergeChartTheme<'line'>(this.chartTheme?.() ?? { type: 'light' }, this.options()),
  );
}

@Component({
  selector: 'ui-chart-bar',
  imports: [BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
  template: `
    <div class="relative size-full">
      <canvas
        baseChart
        role="img"
        type="bar"
        [attr.aria-label]="accessibleLabel()"
        [data]="data()"
        [legend]="legend()"
        [options]="resolvedOptions()"
        [plugins]="tooltipPlugins"
      ></canvas>
    </div>
  `,
  host: { class: 'block h-64 w-full' },
})
export class ChartBar {
  private readonly chartTheme = inject(CHART_THEME, { optional: true });
  public readonly accessibleLabel = input.required<string>();
  public readonly data = input.required<ChartData<'bar'>>();
  public readonly legend = input(false);
  public readonly options: InputSignal<ChartOptions<'bar'>> = input<ChartOptions<'bar'>>({});
  protected readonly tooltipPlugins: Plugin<'bar'>[] = [
    createChartTooltipShadowPlugin<'bar'>(),
  ];
  protected readonly resolvedOptions: Signal<ChartOptions<'bar'>> = computed(() =>
    mergeChartTheme<'bar'>(this.chartTheme?.() ?? { type: 'light' }, this.options()),
  );
}
