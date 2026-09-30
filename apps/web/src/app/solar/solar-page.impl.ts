import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  TranslocoDatePipe,
  TranslocoDecimalPipe,
  TranslocoLocaleService,
} from '@jsverse/transloco-locale';
import type { ChartData, ChartOptions, TooltipItem } from 'chart.js';
import { DateTime } from 'luxon';
import { debounceTime, map, timer } from 'rxjs';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardSubtitle,
  CardTitle,
  ChartBar,
  ChartLine,
  FormItem,
  FormItemLabel,
  InputDate,
  Tooltip,
} from '@power-market-dashboard/ui';

import { MarketApiService } from '../market/market-api.service';
import type { DataStatusResponse, SolarResponse } from '../market/market-data.models';
import { MarketLiveService, type MarketRefresh } from '../market/market-live.service';
import {
  MARKET_ZONE,
  isMarketDate,
  marketDayRange,
  marketToday,
  shiftMarketDate,
} from '../market/market-time';

interface Metric {
  key: string;
  label: string;
  value: string;
  detail?: string;
}

interface ActualFreshnessWarning {
  label: string;
  message: string;
}

@Component({
  selector: 'app-solar-page',
  imports: [
    Badge,
    Button,
    Card,
    CardContent,
    CardHeader,
    CardSubtitle,
    CardTitle,
    ChartBar,
    ChartLine,
    FormItem,
    FormItemLabel,
    InputDate,
    Tooltip,
    TranslocoDatePipe,
    TranslocoDecimalPipe,
    TranslocoPipe,
  ],
  templateUrl: './solar-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SolarPage {
  private readonly api = inject(MarketApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly live = inject(MarketLiveService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly localeService = inject(TranslocoLocaleService);
  private readonly translationLanguage = toSignal(
    this.transloco.selectTranslation().pipe(map(() => this.transloco.getActiveLang())),
    { initialValue: this.transloco.getActiveLang() },
  );
  private readonly locale = toSignal(this.localeService.localeChanges$, {
    initialValue: this.localeService.getLocale(),
  });
  private requestVersion = 0;
  private clientStarted = false;

  protected readonly skeletons = [1, 2, 3, 4, 5, 6];
  protected readonly selectedDate = signal(this.readDate());
  protected readonly data = signal<SolarResponse | null>(null);
  protected readonly status = signal<DataStatusResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly refreshing = signal(false);
  protected readonly error = signal(false);
  protected readonly currentTime = signal<number | null>(null);

  protected readonly lastUpdated = computed(() => {
    const windows = this.data()?.metadata.windows ?? [];
    const values = windows.flatMap((window) =>
      window.storedAt || window.fetchedAt ? [window.storedAt ?? window.fetchedAt ?? ''] : [],
    );
    return values.sort().at(-1) ?? null;
  });

  protected readonly latestPoint = computed(
    () => [...(this.data()?.data ?? [])].reverse().find((point) => point.actualMw !== null) ?? null,
  );

  protected readonly metrics = computed<Metric[]>(() => {
    const result = this.data();
    const point = this.latestPoint();
    return [
      {
        key: 'actual',
        label: this.t('solar.metrics.actual'),
        value: this.formatMw(point?.actualMw ?? null),
        detail: point
          ? `${this.t('solar.metrics.interval')}: ${this.formatInterval(point.start, point.end)}`
          : undefined,
      },
      {
        key: 'forecast',
        label: this.t('solar.metrics.forecast'),
        value: this.formatMw(point?.forecastMw ?? null),
      },
      {
        key: 'deviation',
        label: this.t('solar.metrics.deviation'),
        value: this.formatSigned(point?.deviationMw ?? null, ' MW'),
        detail: this.formatSigned(point?.deviationPercent ?? null, ' %'),
      },
      {
        key: 'mae',
        label: this.t('solar.metrics.mae'),
        value: this.formatMw(result?.summary.maeMw ?? null),
      },
      {
        key: 'rmse',
        label: this.t('solar.metrics.rmse'),
        value: this.formatMw(result?.summary.rmseMw ?? null),
      },
      {
        key: 'coverage',
        label: this.t('solar.metrics.coverage'),
        value: result ? `${this.formatNumber(result.summary.coverage * 100, 1)} %` : '—',
      },
    ];
  });

  protected readonly productionChart = computed<ChartData<'line'>>(() => {
    const points = this.data()?.data ?? [];
    return {
      labels: points.map((point) => this.formatTime(point.start)),
      datasets: [
        {
          label: this.t('solar.series.actual'),
          data: points.map((point) => point.actualMw),
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22, 163, 74, 0.12)',
          pointRadius: 0,
          borderWidth: 2,
          spanGaps: false,
        },
        {
          label: this.t('solar.series.forecast'),
          data: points.map((point) => point.forecastMw),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.12)',
          pointRadius: 0,
          borderDash: [6, 4],
          borderWidth: 2,
          spanGaps: false,
        },
      ],
    };
  });

  protected readonly productionOptions = computed<ChartOptions<'line'>>(() => {
    const points = this.data()?.data ?? [];
    return {
      scales: {
        x: { ticks: { maxTicksLimit: 12 } },
        y: { beginAtZero: true, title: { display: true, text: 'MW' } },
      },
      plugins: {
        tooltip: {
          callbacks: {
            title: (items) => {
              const point = points[items[0]?.dataIndex ?? -1];
              return point ? this.formatTimeInterval(point.start, point.end) : '';
            },
          },
        },
      },
    };
  });

  protected readonly deviationChart = computed<ChartData<'bar'>>(() => {
    const points = this.data()?.data ?? [];
    return {
      labels: points.map((point) => this.formatTime(point.start)),
      datasets: [
        {
          label: this.t('solar.series.deviation'),
          data: points.map((point) => point.deviationMw),
          backgroundColor: points.map((point) =>
            point.deviationMw === null
              ? 'rgba(148, 163, 184, 0.35)'
              : point.deviationMw >= 0
                ? 'rgba(22, 163, 74, 0.75)'
                : 'rgba(220, 38, 38, 0.75)',
          ),
          borderWidth: 0,
        },
      ],
    };
  });

  protected readonly deviationOptions = computed<ChartOptions<'bar'>>(() => {
    const points = this.data()?.data ?? [];
    return {
      scales: {
        x: { ticks: { maxTicksLimit: 12 } },
        y: { title: { display: true, text: 'MW' } },
      },
      plugins: {
        tooltip: {
          callbacks: {
            title: (items) => {
              const point = points[items[0]?.dataIndex ?? -1];
              return point ? this.formatTimeInterval(point.start, point.end) : '';
            },
            afterLabel: (item: TooltipItem<'bar'>) => {
              const value = points[item.dataIndex]?.deviationPercent ?? null;
              return value === null
                ? ''
                : `${this.t('solar.table.deviation-percent')}: ${this.formatSigned(value, ' %')}`;
            },
          },
        },
      },
    };
  });

  protected readonly connectionColor = computed<'green' | 'yellow' | 'red'>(() => {
    if (this.error()) return 'red';
    const status = this.status();
    const datasets = status?.datasets.filter((item) =>
      ['solar-actual', 'solar-forecast'].includes(item.dataset),
    );
    const stale = datasets?.some(
      (dataset) =>
        !!dataset.error ||
        (dataset.pollAgeSeconds !== null &&
          dataset.pollAgeSeconds >
            (status?.additionalLatencyTargetSeconds ?? 30) + (status?.pollingSeconds ?? 15)),
    );
    if (stale || this.live.connectionState() === 'offline') return 'yellow';
    return this.live.connectionState() === 'connected' ? 'green' : 'yellow';
  });

  protected readonly connectionLabel = computed(() => {
    if (this.live.connectionState() === 'offline') return this.t('market.offline');
    if (this.connectionColor() === 'yellow' && this.status()) return this.t('market.delayed');
    return this.t(
      this.live.connectionState() === 'connected' ? 'market.live' : 'market.connecting',
    );
  });

  protected readonly connectionTooltip = computed(() =>
    this.t(
      `market.badge-tooltips.connection.${
        this.live.connectionState() === 'offline'
          ? 'offline'
          : this.connectionColor() === 'yellow' && this.status()
            ? 'delayed'
            : this.live.connectionState() === 'connected'
              ? 'live'
              : 'connecting'
      }`,
    ),
  );

  protected readonly actualFreshnessWarning = computed<ActualFreshnessWarning | null>(() => {
    const now = this.currentTime();
    const status = this.status();
    if (now === null || !status || this.selectedDate() !== marketToday(DateTime.fromMillis(now))) {
      return null;
    }
    const intervalEnd = status.datasets.find(
      (dataset) => dataset.dataset === 'solar-actual',
    )?.latestIntervalEnd;
    if (!intervalEnd) return null;
    const ageSeconds = Math.max(0, (now - Date.parse(intervalEnd)) / 1000);
    if (ageSeconds <= status.solarActualFreshnessTargetSeconds) return null;
    const minutes = Math.round(ageSeconds / 60);
    return {
      label: this.t('solar.freshness.badge', { minutes }),
      message: this.t('solar.freshness.message', {
        time: this.formatTime(intervalEnd),
      }),
    };
  });

  public constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const next = params.get('date');
      const valid = isMarketDate(next) ? next : marketToday();
      const changed = valid !== this.selectedDate();
      this.selectedDate.set(valid);
      if (changed && this.clientStarted) this.loadSolar();
    });

    afterNextRender(() => {
      const requestedDate = this.route.snapshot.queryParamMap.get('date');
      const selectedDate = this.selectedDate();
      if (requestedDate !== selectedDate) void this.writeDate(selectedDate, true);

      this.clientStarted = true;
      this.currentTime.set(Date.now());
      timer(30_000, 30_000)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.currentTime.set(Date.now()));
      this.live.refreshes$
        .pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
        .subscribe((refresh) => {
          if (this.affectsSolar(refresh)) this.loadSolar();
          if (refresh.type !== 'market-change' || this.affectsSolar(refresh)) {
            this.loadStatus();
          }
        });
      this.live.start();
      this.loadSolar();
      this.loadStatus();
    });
  }

  protected shiftDate(days: number): void {
    void this.writeDate(shiftMarketDate(this.selectedDate(), days));
  }

  protected goToday(): void {
    void this.writeDate(marketToday());
  }

  protected selectDate(value: string): void {
    if (isMarketDate(value)) void this.writeDate(value);
  }

  protected refresh(): void {
    this.loadSolar();
    this.loadStatus();
  }

  protected formatMw(value: number | null): string {
    return value === null ? '—' : `${this.formatNumber(value, 1)} MW`;
  }

  protected formatSigned(value: number | null, suffix: string): string {
    if (value === null) return '—';
    return `${this.formatNumber(value, 1, 'exceptZero')}${suffix}`;
  }

  protected formatTime(value: string): string {
    return this.localeService.localizeDate(value, this.locale(), {
      timeZone: MARKET_ZONE,
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected formatDateTime(value: string): string {
    return this.localeService.localizeDate(value, this.locale(), {
      timeZone: MARKET_ZONE,
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  protected formatInterval(start: string, end: string): string {
    const startLocal = DateTime.fromISO(start).setZone(MARKET_ZONE);
    const endLocal = DateTime.fromISO(end).setZone(MARKET_ZONE);
    const offsetChanges = startLocal.offset !== endLocal.offset;
    const formatDate = (value: string) =>
      this.localeService.localizeDate(value, this.locale(), {
        timeZone: MARKET_ZONE,
        dateStyle: 'medium',
      });
    const formatEndpoint = (value: string) =>
      this.localeService.localizeDate(value, this.locale(), {
        timeZone: MARKET_ZONE,
        hour: '2-digit',
        minute: '2-digit',
        ...(offsetChanges ? { timeZoneName: 'short' as const } : {}),
      });
    const startDate = formatDate(start);
    const endDate = formatDate(end);
    const startTime = formatEndpoint(start);
    const endTime = formatEndpoint(end);
    return startLocal.toISODate() === endLocal.toISODate()
      ? `${startDate}, ${startTime}–${endTime}`
      : `${startDate}, ${startTime} – ${endDate}, ${endTime}`;
  }

  protected formatTimeInterval(start: string, end: string): string {
    const startLocal = DateTime.fromISO(start).setZone(MARKET_ZONE);
    const endLocal = DateTime.fromISO(end).setZone(MARKET_ZONE);
    const offsetChanges = startLocal.offset !== endLocal.offset;
    const formatEndpoint = (value: string) =>
      this.localeService.localizeDate(value, this.locale(), {
        timeZone: MARKET_ZONE,
        hour: '2-digit',
        minute: '2-digit',
        ...(offsetChanges ? { timeZoneName: 'short' as const } : {}),
      });
    const startTime = formatEndpoint(start);
    const endTime = formatEndpoint(end);
    if (startLocal.toISODate() === endLocal.toISODate()) {
      return `${startTime}–${endTime}`;
    }
    const endDate = this.localeService.localizeDate(end, this.locale(), {
      timeZone: MARKET_ZONE,
      dateStyle: 'medium',
    });
    return `${startTime} – ${endDate}, ${endTime}`;
  }

  private readDate(): string {
    const value = this.route.snapshot.queryParamMap.get('date');
    return isMarketDate(value) ? value : marketToday();
  }

  private writeDate(date: string, replaceUrl = false): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { date },
      replaceUrl,
    });
  }

  private affectsSolar(refresh: MarketRefresh): boolean {
    if (refresh.type !== 'market-change') return true;
    if (!['solar-actual', 'solar-forecast'].includes(refresh.change.dataset)) {
      return false;
    }
    const range = marketDayRange(this.selectedDate());
    return (
      Date.parse(refresh.change.from) < Date.parse(range.to) &&
      Date.parse(refresh.change.to) > Date.parse(range.from)
    );
  }

  private loadSolar(): void {
    const version = ++this.requestVersion;
    const range = marketDayRange(this.selectedDate());
    this.refreshing.set(true);
    if (!this.data()) this.loading.set(true);
    this.api
      .solar(range.from, range.to)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          if (version !== this.requestVersion) return;
          this.data.set(data);
          this.error.set(false);
          this.loading.set(false);
          this.refreshing.set(false);
        },
        error: () => {
          if (version !== this.requestVersion) return;
          this.error.set(true);
          this.loading.set(false);
          this.refreshing.set(false);
        },
      });
  }

  private loadStatus(): void {
    this.api
      .status()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (status) => this.status.set(status),
        error: () => undefined,
      });
  }

  private formatNumber(
    value: number,
    digits: number,
    signDisplay?: Intl.NumberFormatOptions['signDisplay'],
  ): string {
    return this.localeService.localizeNumber(value, 'decimal', this.locale(), {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
      signDisplay,
    });
  }

  private t(key: string, params: Record<string, unknown> = {}): string {
    return this.transloco.translate(key, params, this.translationLanguage());
  }
}
