import { WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { TranslocoService } from '@jsverse/transloco';
import { provideTranslocoLocale } from '@jsverse/transloco-locale';
import { NEVER } from 'rxjs';

import { Tooltip } from '@power-market-dashboard/ui';

import { BalancingLadderPage } from './balancing/balancing-ladder-page';
import { MarketApiService } from './market/market-api.service';
import type {
  DataStatusResponse,
  LadderResponse,
  MarketMetadata,
  SolarResponse,
} from './market/market-data.models';
import { LiveConnectionState, MarketLiveService } from './market/market-live.service';
import { SolarPage } from './solar/solar-page';
import { translocoTestingModule } from './transloco-testing';

const metadata: MarketMetadata = {
  area: 'HU',
  timezone: 'Europe/Budapest',
  source: 'ENTSO-E',
  sourcePublicationAt: null,
  publicationNote: '',
  windows: [],
};

const solarResponse: SolarResponse = {
  complete: true,
  data: [],
  metadata,
  resolutionSeconds: 900,
  summary: { coverage: 1, maeMw: null, rmseMw: null },
  unit: 'MW',
};

const ladderResponse: LadderResponse = {
  bids: [],
  complete: true,
  complexBidCount: 0,
  currency: 'HUF',
  direction: 'up',
  from: '2026-09-30T10:00:00.000Z',
  interpretation: 'published-offer-order',
  metadata,
  missingPriceCount: 0,
  priceUnit: 'HUF/MWh',
  product: 'afrr',
  productType: 'A04',
  steps: [],
  targetPrice: null,
  to: '2026-09-30T10:15:00.000Z',
  totalMw: 0,
  unknownAvailabilityCount: 0,
  volumeUnit: 'MW',
};

const apiStub = {
  ladder: vi.fn(() => NEVER),
  priceHistory: vi.fn(() => NEVER),
  solar: vi.fn(() => NEVER),
  status: vi.fn(() => NEVER),
};

const tooltipData = (fixture: ComponentFixture<unknown>) => {
  const elements = fixture.debugElement.queryAll(By.directive(Tooltip));
  return {
    elements,
    tooltips: elements.map((element) => element.injector.get(Tooltip)),
  };
};

const expectAccessibleBadges = (elements: ReturnType<typeof tooltipData>['elements']): void => {
  expect(elements).toHaveLength(3);
  for (const element of elements) {
    const host = element.nativeElement as HTMLElement;
    expect(host.getAttribute('tabindex')).toBe('0');
    expect(host.classList).toContain('cursor-help');
    expect(host.hasAttribute('title')).toBe(false);
    expect(element.injector.get(Tooltip).tooltipPosition()).toEqual(['bottomCenter', 'topCenter']);
  }
};

describe('status badge tooltips', () => {
  let connectionState: WritableSignal<LiveConnectionState>;

  beforeEach(() => {
    connectionState = signal<LiveConnectionState>('connected');
    apiStub.ladder.mockClear();
    apiStub.priceHistory.mockClear();
    apiStub.solar.mockClear();
    apiStub.status.mockClear();
  });

  const configure = async (page: typeof SolarPage | typeof BalancingLadderPage) => {
    await TestBed.configureTestingModule({
      imports: [page, translocoTestingModule()],
      providers: [
        provideRouter([]),
        provideTranslocoLocale({
          defaultLocale: 'en-US',
          langToLocaleMapping: { cs: 'cs-CZ', en: 'en-US' },
        }),
        { provide: MarketApiService, useValue: apiStub },
        {
          provide: MarketLiveService,
          useValue: {
            connectionState: connectionState.asReadonly(),
            refreshes$: NEVER,
            start: vi.fn(),
          },
        },
      ],
    }).compileComponents();
  };

  it('describes solar badges and reacts to state and language changes', async () => {
    await configure(SolarPage);
    const fixture = TestBed.createComponent(SolarPage);
    const state = fixture.componentInstance as unknown as {
      data: WritableSignal<SolarResponse | null>;
      productionChart: () => { datasets: Array<{ label?: string }> };
      status: WritableSignal<DataStatusResponse | null>;
    };
    state.data.set(solarResponse);
    await fixture.whenStable();

    let { elements, tooltips } = tooltipData(fixture);
    expectAccessibleBadges(elements);
    expect(tooltips.map((tooltip) => tooltip.target())).toEqual([
      'Data is shown for Hungary in the Europe/Budapest market time zone.',
      'Live updates are connected.',
      'All expected records are present.',
    ]);
    expect(state.productionChart().datasets.map((dataset) => dataset.label)).toEqual([
      'Actual generation',
      'Day-ahead forecast',
    ]);

    const freshStatus: DataStatusResponse = {
      additionalLatencyTargetSeconds: 30,
      bidPublicationDeadlineMinutesAfterDelivery: 15,
      solarActualFreshnessTargetSeconds: 1200,
      datasets: [
        {
          available: true,
          dataset: 'solar-actual',
          intervalAgeSeconds: 900,
          pollAgeSeconds: 2,
        },
        {
          available: true,
          dataset: 'solar-forecast',
          intervalAgeSeconds: 0,
          pollAgeSeconds: 2,
        },
      ],
      groups: [],
      pollingSeconds: 15,
    };
    state.status.set(freshStatus);
    await fixture.whenStable();

    ({ elements, tooltips } = tooltipData(fixture));
    expect(tooltips[1].target()).toBe('Live updates are connected.');

    state.status.set({
      ...freshStatus,
      datasets: freshStatus.datasets.map((dataset) =>
        dataset.dataset === 'solar-actual' ? { ...dataset, pollAgeSeconds: 60 } : dataset,
      ),
    });
    await fixture.whenStable();

    ({ elements, tooltips } = tooltipData(fixture));
    expect(tooltips[1].target()).toBe('Source data or updates are delayed.');

    connectionState.set('offline');
    state.data.set({ ...solarResponse, complete: false });
    TestBed.inject(TranslocoService).setActiveLang('cs');
    await fixture.whenStable();

    ({ elements, tooltips } = tooltipData(fixture));
    expect(tooltips.map((tooltip) => tooltip.target())).toEqual([
      'Data jsou zobrazena pro Maďarsko v tržním časovém pásmu Europe/Budapest.',
      'Živé aktualizace nejsou dostupné.',
      'Některé očekávané záznamy chybí.',
    ]);
    expect(state.productionChart().datasets.map((dataset) => dataset.label)).toEqual([
      'Skutečná výroba',
      'Day-ahead predikce',
    ]);
  });

  it('formats solar delivery intervals across ordinary and DST boundaries', async () => {
    await configure(SolarPage);
    const fixture = TestBed.createComponent(SolarPage);
    const state = fixture.componentInstance as unknown as {
      formatInterval: (start: string, end: string) => string;
      formatTimeInterval: (start: string, end: string) => string;
    };

    expect(state.formatInterval('2026-09-30T08:15:00.000Z', '2026-09-30T08:30:00.000Z')).toBe(
      'Sep 30, 2026, 10:15 AM–10:30 AM',
    );
    expect(
      state.formatTimeInterval('2026-09-30T21:45:00.000Z', '2026-09-30T22:00:00.000Z'),
    ).toBe('11:45 PM – Oct 1, 2026, 12:00 AM');

    const dstInterval = state.formatInterval(
      '2026-10-25T00:45:00.000Z',
      '2026-10-25T01:00:00.000Z',
    );
    expect(dstInterval).toContain('2:45 AM GMT+2');
    expect(dstInterval).toContain('2:00 AM GMT+1');
  });

  it('warns when todays actual interval becomes more than 20 minutes old', async () => {
    await configure(SolarPage);
    const fixture = TestBed.createComponent(SolarPage);
    const state = fixture.componentInstance as unknown as {
      currentTime: WritableSignal<number | null>;
      data: WritableSignal<SolarResponse | null>;
      selectedDate: WritableSignal<string>;
      status: WritableSignal<DataStatusResponse | null>;
    };
    await fixture.whenStable();

    const status: DataStatusResponse = {
      additionalLatencyTargetSeconds: 30,
      bidPublicationDeadlineMinutesAfterDelivery: 15,
      datasets: [
        {
          available: true,
          dataset: 'solar-actual',
          intervalAgeSeconds: 1199,
          latestIntervalEnd: '2026-09-30T12:15:00.000Z',
          pollAgeSeconds: 2,
        },
      ],
      groups: [],
      pollingSeconds: 15,
      solarActualFreshnessTargetSeconds: 1200,
    };
    state.data.set(solarResponse);
    state.selectedDate.set('2026-09-30');
    state.status.set(status);
    state.currentTime.set(Date.parse('2026-09-30T12:34:59.000Z'));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('Actual delayed');

    state.currentTime.set(Date.parse('2026-09-30T12:35:01.000Z'));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Actual delayed by 20 min');
    expect(fixture.nativeElement.textContent).toContain(
      'The latest actual interval ended at 02:15 PM. ENTSO-E has not published newer actual data yet.',
    );

    state.selectedDate.set('2026-09-29');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('Actual delayed');
  });

  it('describes balancing badges and reports delayed data', async () => {
    await configure(BalancingLadderPage);
    const fixture = TestBed.createComponent(BalancingLadderPage);
    const state = fixture.componentInstance as unknown as {
      ladder: WritableSignal<LadderResponse | null>;
      status: WritableSignal<{
        additionalLatencyTargetSeconds: number;
        bidPublicationDeadlineMinutesAfterDelivery: number;
        datasets: Array<{
          available: boolean;
          dataset: 'afrr';
          intervalAgeSeconds: number | null;
          pollAgeSeconds: number | null;
        }>;
        groups: [];
        pollingSeconds: number;
        solarActualFreshnessTargetSeconds: number;
      } | null>;
    };
    state.ladder.set(ladderResponse);
    state.status.set({
      additionalLatencyTargetSeconds: 30,
      bidPublicationDeadlineMinutesAfterDelivery: 15,
      solarActualFreshnessTargetSeconds: 1200,
      datasets: [
        {
          available: true,
          dataset: 'afrr',
          intervalAgeSeconds: null,
          pollAgeSeconds: 60,
        },
      ],
      groups: [],
      pollingSeconds: 15,
    });
    await fixture.whenStable();

    const { elements, tooltips } = tooltipData(fixture);
    expectAccessibleBadges(elements);
    expect(tooltips.map((tooltip) => tooltip.target())).toEqual([
      'Data for the Hungarian market comes from the ENTSO-E platform.',
      'Source data or updates are delayed.',
      'All expected records are present.',
    ]);
  });
});
