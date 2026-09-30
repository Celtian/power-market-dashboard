import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';

import { BaseChartDirective } from 'ng2-charts';

import { ChartBar, ChartLine } from './chart';

describe('charts', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('attaches the tooltip shadow plugin to line charts', async () => {
    const fixture = TestBed.createComponent(ChartLine);
    fixture.componentRef.setInput('accessibleLabel', 'Line chart');
    fixture.componentRef.setInput('data', { datasets: [] });

    await fixture.whenStable();

    const chart = fixture.debugElement
      .query(By.directive(BaseChartDirective))
      .injector.get(BaseChartDirective);
    expect(chart.plugins.map((plugin) => plugin.id)).toContain('ui-chart-tooltip-shadow');
  });

  it('attaches the tooltip shadow plugin to bar charts', async () => {
    const fixture = TestBed.createComponent(ChartBar);
    fixture.componentRef.setInput('accessibleLabel', 'Bar chart');
    fixture.componentRef.setInput('data', { datasets: [] });

    await fixture.whenStable();

    const chart = fixture.debugElement
      .query(By.directive(BaseChartDirective))
      .injector.get(BaseChartDirective);
    expect(chart.plugins.map((plugin) => plugin.id)).toContain('ui-chart-tooltip-shadow');
  });
});
