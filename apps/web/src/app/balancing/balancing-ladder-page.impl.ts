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
import { ActivatedRoute, ParamMap, Router } from '@angular/router';

import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  TranslocoDatePipe,
  TranslocoDecimalPipe,
  TranslocoLocaleService,
} from '@jsverse/transloco-locale';
import type { ChartData, ChartOptions } from 'chart.js';
import { DateTime } from 'luxon';
import { debounceTime, forkJoin, map } from 'rxjs';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardSubtitle,
  CardTitle,
  ChartLine,
  FormItem,
  FormItemLabel,
  InputDate,
  InputNumber,
  InputSelect,
  type InputSelectOption,
  Tooltip,
} from '@power-market-dashboard/ui';

import { MarketApiService } from '../market/market-api.service';
import type {
  BalancingProduct,
  BidPoint,
  DataStatusResponse,
  Direction,
  LadderResponse,
  PriceHistoryResponse,
  ProductGroup,
} from '../market/market-data.models';
import { MarketLiveService, type MarketRefresh } from '../market/market-live.service';
import {
  MARKET_ZONE,
  deliveryQuarters,
  historyRange,
  isMarketDate,
  latestPublishedQuarter,
  marketDateFromInstant,
} from '../market/market-time';

interface Metric {
  key: string;
  label: string;
  value: string;
  detail?: string;
}

interface BidRow {
  bid: BidPoint;
  cumulative: number | null;
}

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];
const validAt = (value: string | null): value is string => {
  if (!value) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && time % 900_000 === 0;
};

@Component({
  selector: 'app-balancing-ladder-page',
  imports: [
    Badge,
    Button,
    Card,
    CardContent,
    CardHeader,
    CardSubtitle,
    CardTitle,
    ChartLine,
    FormItem,
    FormItemLabel,
    InputDate,
    InputNumber,
    InputSelect,
    Tooltip,
    TranslocoDatePipe,
    TranslocoDecimalPipe,
    TranslocoPipe,
  ],
  templateUrl: './balancing-ladder-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BalancingLadderPage {
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

  protected readonly skeletons = [1, 2, 3, 4];
  protected readonly at = signal(this.readAt(this.route.snapshot.queryParamMap));
  protected readonly product = signal<BalancingProduct>(
    this.readProduct(this.route.snapshot.queryParamMap),
  );
  protected readonly direction = signal<Direction>(
    this.readDirection(this.route.snapshot.queryParamMap),
  );
  protected readonly productType = signal(this.readProductType(this.route.snapshot.queryParamMap));
  protected readonly currency = signal(this.readCurrency(this.route.snapshot.queryParamMap));
  protected readonly targetMw = signal(this.readTarget(this.route.snapshot.queryParamMap));
  protected readonly ladder = signal<LadderResponse | null>(null);
  protected readonly history = signal<PriceHistoryResponse | null>(null);
  protected readonly status = signal<DataStatusResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly refreshing = signal(false);
  protected readonly error = signal(false);

  protected readonly selectedDate = computed(() => marketDateFromInstant(this.at()));
  protected readonly quarters = computed(() =>
    deliveryQuarters(this.selectedDate(), this.locale()),
  );
  protected readonly products = computed(() => {
    const values = unique((this.status()?.groups ?? []).map((group) => group.product));
    return values.length ? values : (['afrr', 'mfrr'] as BalancingProduct[]);
  });
  protected readonly directions = computed(() => {
    const values = unique(
      (this.status()?.groups ?? [])
        .filter((group) => group.product === this.product())
        .map((group) => group.direction),
    );
    return values.length ? values : (['up', 'down'] as Direction[]);
  });
  protected readonly productTypes = computed(() => {
    const values = unique(
      (this.status()?.groups ?? [])
        .filter((group) => group.product === this.product() && group.direction === this.direction())
        .map((group) => group.productType),
    );
    return values.length ? values : [this.productType()];
  });
  protected readonly currencies = computed(() => {
    const values = unique(
      (this.status()?.groups ?? [])
        .filter(
          (group) =>
            group.product === this.product() &&
            group.direction === this.direction() &&
            group.productType === this.productType() &&
            group.currency !== null,
        )
        .map((group) => group.currency as string),
    );
    return values.length ? values : [this.currency()];
  });
  protected readonly productOptions = computed<InputSelectOption<BalancingProduct>[]>(() =>
    this.products().map((value) => ({
      label: this.productLabel(value),
      value,
    })),
  );
  protected readonly directionOptions = computed<InputSelectOption<Direction>[]>(() =>
    this.directions().map((value) => ({
      label: this.directionLabel(value),
      value,
    })),
  );
  protected readonly productTypeOptions = computed<InputSelectOption[]>(() =>
    this.productTypes().map((value) => ({ label: value, value })),
  );
  protected readonly currencyOptions = computed<InputSelectOption[]>(() =>
    this.currencies().map((value) => ({ label: value, value })),
  );
  protected readonly quarterOptions = computed<InputSelectOption[]>(() =>
    this.quarters().map(({ label, value }) => ({ label, value })),
  );

  protected readonly metrics = computed<Metric[]>(() => {
    const result = this.ladder();
    return [
      {
        key: 'target',
        label: this.t('balancing.metrics.target-price'),
        value: this.formatPrice(result?.targetPrice ?? null),
        detail: `${this.formatNumber(this.targetMw(), 1)} MW`,
      },
      {
        key: 'volume',
        label: this.t('balancing.metrics.total-volume'),
        value: this.formatMw(result?.totalMw ?? null),
      },
      {
        key: 'bids',
        label: this.t('balancing.metrics.bids'),
        value: result ? this.formatNumber(result.bids.length, 0) : '—',
        detail: result ? `${result.steps.length} ${this.t('balancing.metrics.steps')}` : undefined,
      },
      {
        key: 'quality',
        label: this.t('balancing.metrics.quality'),
        value: result ? this.t(result.complete ? 'market.complete' : 'market.incomplete') : '—',
        detail: result
          ? `${result.missingPriceCount} / ${result.unknownAvailabilityCount} / ${result.complexBidCount}`
          : undefined,
      },
    ];
  });

  protected readonly ladderChart = computed<ChartData<'line'>>(() => {
    const result = this.ladder();
    const points = (result?.steps ?? []).flatMap((step) => [
      { x: step.fromMw, y: step.price },
      { x: step.toMw, y: step.price },
    ]);
    const datasets: ChartData<'line'>['datasets'] = [
      {
        label: this.t('balancing.series.ladder'),
        data: points,
        parsing: false,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.12)',
        pointRadius: 0,
        borderWidth: 2,
      },
    ];
    if (result?.targetPrice !== null && result?.targetPrice !== undefined) {
      datasets.push({
        label: this.t('balancing.series.target'),
        data: [{ x: this.targetMw(), y: result.targetPrice }],
        parsing: false,
        borderColor: '#dc2626',
        backgroundColor: '#dc2626',
        pointRadius: 6,
        pointHoverRadius: 8,
        showLine: false,
      });
    }
    return { datasets };
  });

  protected readonly ladderOptions = computed<ChartOptions<'line'>>(() => ({
    scales: {
      x: {
        type: 'linear',
        beginAtZero: true,
        title: { display: true, text: 'MW' },
      },
      y: {
        title: {
          display: true,
          text: `${this.currency()}/MWh`,
        },
      },
    },
  }));

  protected readonly historyChart = computed<ChartData<'line'>>(() => {
    const points = this.history()?.data ?? [];
    return {
      labels: points.map((point) => this.formatDateTime(point.from)),
      datasets: [
        {
          label: this.t('balancing.series.history'),
          data: points.map((point) => point.price),
          borderColor: '#7c3aed',
          backgroundColor: 'rgba(124, 58, 237, 0.12)',
          pointRadius: 2,
          borderWidth: 2,
          spanGaps: false,
        },
      ],
    };
  });

  protected readonly historyOptions = computed<ChartOptions<'line'>>(() => ({
    scales: {
      x: { ticks: { maxTicksLimit: 12 } },
      y: {
        title: {
          display: true,
          text: `${this.currency()}/MWh`,
        },
      },
    },
  }));

  protected readonly bidRows = computed<BidRow[]>(() => {
    const bids = [...(this.ladder()?.bids ?? [])];
    const eligible = bids
      .filter(
        (bid) =>
          !bid.cancelled &&
          bid.available !== false &&
          bid.price !== null &&
          !!bid.currency &&
          bid.mw > 0,
      )
      .sort((left, right) => {
        const price =
          this.direction() === 'up'
            ? (left.price ?? 0) - (right.price ?? 0)
            : (right.price ?? 0) - (left.price ?? 0);
        return price || left.bidId.localeCompare(right.bidId);
      });
    let cumulative = 0;
    const rows = eligible.map((bid) => {
      cumulative += bid.mw;
      return { bid, cumulative };
    });
    const eligibleIds = new Set(eligible.map((bid) => bid.bidId));
    return [
      ...rows,
      ...bids
        .filter((bid) => !eligibleIds.has(bid.bidId))
        .map((bid) => ({ bid, cumulative: null })),
    ];
  });

  protected readonly connectionColor = computed<'green' | 'yellow' | 'red'>(() => {
    if (this.error()) return 'red';
    const status = this.status();
    const dataset = status?.datasets.find((item) => item.dataset === this.product());
    const pipelineDelayed = status?.pipeline && status.pipeline.status !== 'healthy';
    const stale =
      !!dataset?.error ||
      (dataset?.pollAgeSeconds !== null &&
        dataset?.pollAgeSeconds !== undefined &&
        dataset.pollAgeSeconds >
          (status?.additionalLatencyTargetSeconds ?? 30) + (status?.pollingSeconds ?? 15));
    if (pipelineDelayed || stale || this.live.connectionState() === 'offline') return 'yellow';
    return this.live.connectionState() === 'connected' ? 'green' : 'yellow';
  });

  protected readonly connectionLabel = computed(() => {
    if (this.live.connectionState() === 'offline') return this.t('market.offline');
    if (this.connectionColor() === 'yellow' && this.status()) {
      return this.t('market.delayed');
    }
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

  public constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const before = this.filterKey();
      this.applyParams(params);
      if (this.clientStarted && before !== this.filterKey()) this.loadAll();
    });

    afterNextRender(() => {
      this.clientStarted = true;
      this.live.refreshes$
        .pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
        .subscribe((refresh) => {
          if (this.affectsSelection(refresh)) this.loadAll();
          if (refresh.type !== 'market-change' || this.affectsSelection(refresh)) {
            this.loadStatus();
          }
        });
      this.live.start();
      void this.writeFilters(true);
      this.loadStatus();
      this.loadAll();
    });
  }

  protected selectProduct(product: BalancingProduct): void {
    const group = this.findGroup({ product });
    this.useGroup(
      group ?? {
        product,
        direction: this.direction(),
        productType: this.productType(),
        currency: this.currency(),
      },
    );
  }

  protected selectDirection(direction: Direction): void {
    const group = this.findGroup({ product: this.product(), direction });
    this.useGroup(
      group ?? {
        product: this.product(),
        direction,
        productType: this.productType(),
        currency: this.currency(),
      },
    );
  }

  protected selectProductType(productType: string): void {
    const group = this.findGroup({
      product: this.product(),
      direction: this.direction(),
      productType,
    });
    this.useGroup(
      group ?? {
        product: this.product(),
        direction: this.direction(),
        productType,
        currency: this.currency(),
      },
    );
  }

  protected selectCurrency(currency: string): void {
    this.currency.set(currency);
    this.commitFilters();
  }

  protected selectDate(date: string): void {
    if (!isMarketDate(date)) return;
    const local = DateTime.fromISO(this.at()).setZone(MARKET_ZONE);
    const time = local.toFormat('HH:mm');
    const quarters = deliveryQuarters(date, this.locale());
    this.at.set(
      quarters.find((quarter) => quarter.label.startsWith(time))?.value ??
        quarters[0]?.value ??
        this.at(),
    );
    this.commitFilters();
  }

  protected selectQuarter(value: string): void {
    if (validAt(value)) {
      this.at.set(value);
      this.commitFilters();
    }
  }

  protected selectTarget(value: number | null): void {
    if (value !== null && Number.isFinite(value) && value > 0) {
      this.targetMw.set(value);
      this.commitFilters();
    }
  }

  protected refresh(): void {
    this.loadStatus();
    this.loadAll();
  }

  protected productLabel(product: BalancingProduct): string {
    return product === 'afrr' ? 'aFRR' : 'mFRR';
  }

  protected directionLabel(direction: Direction): string {
    return this.t(`balancing.direction.${direction}`);
  }

  protected formatPrice(value: number | null): string {
    return value === null ? '—' : `${this.formatNumber(value, 2)} ${this.currency()}/MWh`;
  }

  protected formatMw(value: number | null): string {
    return value === null ? '—' : `${this.formatNumber(value, 1)} MW`;
  }

  protected formatNumber(value: number, digits: number): string {
    return this.localeService.localizeNumber(value, 'decimal', this.locale(), {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    });
  }

  protected formatDateTime(value: string): string {
    return this.localeService.localizeDate(value, this.locale(), {
      timeZone: MARKET_ZONE,
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  protected bidFlags(bid: BidPoint): string[] {
    const flags: string[] = [];
    if (bid.cancelled) flags.push(this.t('balancing.flags.cancelled'));
    if (bid.available === false) flags.push(this.t('balancing.flags.unavailable'));
    if (bid.available === null) flags.push(this.t('balancing.flags.unknown'));
    if (bid.complexity) flags.push(bid.complexity);
    return flags;
  }

  private useGroup(group: ProductGroup): void {
    this.product.set(group.product);
    this.direction.set(group.direction);
    this.productType.set(group.productType);
    this.currency.set(group.currency ?? this.currency());
    this.commitFilters();
  }

  private commitFilters(): void {
    void this.writeFilters();
    this.loadAll();
  }

  private loadAll(): void {
    const version = ++this.requestVersion;
    const query = {
      at: this.at(),
      product: this.product(),
      direction: this.direction(),
      productType: this.productType(),
      currency: this.currency(),
      targetMw: this.targetMw(),
    };
    const range = historyRange(query.at);
    this.refreshing.set(true);
    if (!this.ladder()) this.loading.set(true);
    forkJoin({
      ladder: this.api.ladder(query),
      history: this.api.priceHistory({ ...query, ...range }),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (version !== this.requestVersion) return;
          this.ladder.set(response.ladder);
          this.history.set(response.history);
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
        next: (status) => {
          this.status.set(status);
          this.ensureAvailableGroup();
        },
        error: () => undefined,
      });
  }

  private ensureAvailableGroup(): void {
    const groups =
      this.status()?.groups.filter(
        (group): group is ProductGroup & { currency: string } => group.currency !== null,
      ) ?? [];
    if (!groups.length) return;
    const exact = groups.find(
      (group) =>
        group.product === this.product() &&
        group.direction === this.direction() &&
        group.productType === this.productType() &&
        group.currency === this.currency(),
    );
    if (exact) return;
    const preferred =
      groups.find(
        (group) =>
          group.product === 'afrr' &&
          group.direction === 'up' &&
          group.productType === 'A04' &&
          group.currency === 'HUF',
      ) ?? groups[0];
    this.product.set(preferred.product);
    this.direction.set(preferred.direction);
    this.productType.set(preferred.productType);
    this.currency.set(preferred.currency);
    void this.writeFilters(true);
    this.loadAll();
  }

  private findGroup(criteria: Partial<ProductGroup>): ProductGroup | undefined {
    return this.status()?.groups.find(
      (group) =>
        group.currency !== null &&
        Object.entries(criteria).every(
          ([key, value]) => group[key as keyof ProductGroup] === value,
        ),
    );
  }

  private affectsSelection(refresh: MarketRefresh): boolean {
    if (refresh.type !== 'market-change') return true;
    if (refresh.change.dataset !== this.product()) return false;
    const range = historyRange(this.at());
    return (
      Date.parse(refresh.change.from) < Date.parse(range.to) &&
      Date.parse(refresh.change.to) > Date.parse(range.from)
    );
  }

  private applyParams(params: ParamMap): void {
    this.at.set(this.readAt(params));
    this.product.set(this.readProduct(params));
    this.direction.set(this.readDirection(params));
    this.productType.set(this.readProductType(params));
    this.currency.set(this.readCurrency(params));
    this.targetMw.set(this.readTarget(params));
  }

  private readAt(params: ParamMap): string {
    const value = params.get('at');
    return validAt(value) ? new Date(value).toISOString() : latestPublishedQuarter();
  }

  private readProduct(params: ParamMap): BalancingProduct {
    return params.get('product') === 'mfrr' ? 'mfrr' : 'afrr';
  }

  private readDirection(params: ParamMap): Direction {
    return params.get('direction') === 'down' ? 'down' : 'up';
  }

  private readProductType(params: ParamMap): string {
    const value = params.get('productType');
    return value && /^[A-Za-z0-9-]{1,32}$/.test(value) ? value : 'A04';
  }

  private readCurrency(params: ParamMap): string {
    const value = params.get('currency');
    return value && /^[A-Z]{3}$/.test(value) ? value : 'HUF';
  }

  private readTarget(params: ParamMap): number {
    const value = Number(params.get('targetMw'));
    return Number.isFinite(value) && value > 0 ? value : 100;
  }

  private writeFilters(replaceUrl = false): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        at: this.at(),
        product: this.product(),
        direction: this.direction(),
        productType: this.productType(),
        currency: this.currency(),
        targetMw: this.targetMw(),
      },
      replaceUrl,
    });
  }

  private filterKey(): string {
    return [
      this.at(),
      this.product(),
      this.direction(),
      this.productType(),
      this.currency(),
      this.targetMw(),
    ].join('|');
  }

  private t(key: string): string {
    return this.transloco.translate(key, {}, this.translationLanguage());
  }
}
