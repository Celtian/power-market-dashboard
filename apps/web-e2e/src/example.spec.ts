import { expect, test } from '@playwright/test';

test('exposes the PWA metadata', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Power Market Dashboard$/);

  const manifest = await page.evaluate(async () => {
    const response = await fetch('/manifest.webmanifest');
    return response.json() as Promise<{
      name: string;
      short_name: string;
      icons: { src: string; purpose: string }[];
    }>;
  });

  expect(manifest.name).toBe('Power Market Dashboard');
  expect(manifest.short_name).toBe('Power Market');
  expect(manifest.icons).toHaveLength(8);
  expect(manifest.icons.every((icon) => icon.purpose === 'any maskable')).toBe(true);
});

test('keeps the header home link around the logo and shows its hover state', async ({ page }) => {
  await page.goto('/solar');

  const homeLink = page.getByRole('link', {
    name: 'Power Market Dashboard home',
  });
  const logo = homeLink.locator('app-logo');
  const compactLogo = logo.locator('[data-logo="icon"]');
  const landscapeLogo = logo.locator('[data-logo="landscape"]');
  await expect(homeLink).toBeVisible();
  await expect(compactLogo).toBeHidden();
  await expect(landscapeLogo).toBeVisible();

  const [homeLinkBox, logoBox] = await Promise.all([homeLink.boundingBox(), logo.boundingBox()]);
  expect(homeLinkBox).not.toBeNull();
  expect(logoBox).not.toBeNull();
  expect(homeLinkBox?.height).toBe(56);
  expect(Math.abs((homeLinkBox?.width ?? 0) - (logoBox?.width ?? 0) - 16)).toBeLessThan(1);

  const backgroundBeforeHover = await homeLink.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await homeLink.hover();

  await expect
    .poll(() => homeLink.evaluate((element) => getComputedStyle(element).backgroundColor))
    .not.toBe(backgroundBeforeHover);
});

test('@chromium registers the Angular service worker', async ({ page }) => {
  await page.goto('/');

  const scriptUrl = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active?.scriptURL;
  });

  expect(scriptUrl).toContain('/ngsw-worker.js');
});

test('@chromium reloads the cached app shell while offline', async ({ context, page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.waitForFunction(async () => {
    const cacheNames = await caches.keys();
    const responses = await Promise.all(
      cacheNames.map(async (cacheName) => {
        const cache = await caches.open(cacheName);
        return cache.match('/index.csr.html');
      }),
    );
    return responses.some(Boolean);
  });

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Power Market Dashboard$/);
    await expect(page.getByRole('heading', { name: 'Solar' })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});

test('shows an in-place not-found page and links back to the dashboard', async ({ page }) => {
  await page.goto('/missing');

  await expect(page).toHaveURL(/\/missing$/);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await expect(page.locator('app-logo [data-logo="landscape"]').last()).toBeVisible();

  await page.getByRole('link', { name: 'Back to dashboard' }).click();

  await expect(page).toHaveURL(/\/solar\?date=\d{4}-\d{2}-\d{2}$/);
  await expect(page.getByRole('heading', { name: 'Solar' })).toBeVisible();
});

const installMarketMocks = async (page: import('@playwright/test').Page) => {
  await page.addInitScript(() => {
    class FakeEventSource extends EventTarget {
      public onopen: ((event: Event) => void) | null = null;
      public onerror: ((event: Event) => void) | null = null;

      public constructor() {
        super();
        setTimeout(() => {
          const event = new Event('open');
          this.onopen?.(event);
          this.dispatchEvent(new MessageEvent('ready', { data: '{}' }));
        });
      }

      public close() {
        this.dispatchEvent(new Event('close'));
      }
    }
    Object.defineProperty(window, 'EventSource', {
      configurable: true,
      value: FakeEventSource,
    });
  });

  await page.route('**/api/data-status', (route) =>
    route.fulfill({
      json: {
        datasets: [
          {
            dataset: 'solar-actual',
            available: true,
            pollAgeSeconds: 2,
            intervalAgeSeconds: 60,
            latestIntervalEnd: '2026-09-30T08:30:00.000Z',
          },
          {
            dataset: 'solar-forecast',
            available: true,
            pollAgeSeconds: 2,
            intervalAgeSeconds: 60,
          },
          {
            dataset: 'afrr',
            available: true,
            pollAgeSeconds: 2,
            intervalAgeSeconds: 60,
          },
          {
            dataset: 'mfrr',
            available: true,
            pollAgeSeconds: 2,
            intervalAgeSeconds: 60,
          },
        ],
        groups: [
          {
            product: 'afrr',
            direction: 'up',
            productType: 'A04',
            currency: 'HUF',
          },
          {
            product: 'mfrr',
            direction: 'up',
            productType: 'A04',
            currency: 'HUF',
          },
        ],
        additionalLatencyTargetSeconds: 30,
        solarActualFreshnessTargetSeconds: 1200,
        pollingSeconds: 15,
        bidPublicationDeadlineMinutesAfterDelivery: 30,
      },
    }),
  );
};

test('renders the live solar comparison dashboard from API data', async ({ page }) => {
  await installMarketMocks(page);
  await page.route('**/api/solar?*', (route) =>
    route.fulfill({
      json: {
        data: [
          {
            start: '2026-09-30T08:00:00.000Z',
            end: '2026-09-30T08:15:00.000Z',
            actualMw: 125,
            forecastMw: null,
            deviationMw: null,
            deviationPercent: null,
          },
          {
            start: '2026-09-30T08:15:00.000Z',
            end: '2026-09-30T08:30:00.000Z',
            actualMw: 140,
            forecastMw: 135,
            deviationMw: 5,
            deviationPercent: 3.7037,
          },
        ],
        resolutionSeconds: 900,
        unit: 'MW',
        complete: true,
        summary: { maeMw: 5, rmseMw: 5, coverage: 1 },
        metadata: {
          area: 'HU',
          timezone: 'Europe/Budapest',
          source: 'ENTSO-E',
          sourcePublicationAt: null,
          publicationNote: '',
          windows: [
            {
              dataset: 'solar-actual',
              from: '2026-09-30T00:00:00.000Z',
              to: '2026-10-01T00:00:00.000Z',
              snapshotId: 'solar-snapshot',
              checkedAt: '2026-09-30T09:00:00.000Z',
              lastSuccessAt: '2026-09-30T09:00:00.000Z',
              error: null,
              noData: false,
              fetchedAt: '2026-09-30T09:00:00.000Z',
              storedAt: '2026-09-30T09:00:00.000Z',
              sourceCreatedAt: '2026-09-30T08:59:00.000Z',
              revision: 1,
            },
          ],
        },
      },
    }),
  );

  await page.goto('/solar?date=2026-09-30');

  await expect(page.getByRole('heading', { name: 'Solar production' })).toBeVisible();
  const dateControls = page.getByRole('group', {
    name: 'Solar delivery day controls',
  });
  await expect(dateControls.locator('xpath=ancestor::*[@ui-card]')).toHaveCount(1);
  await expect(dateControls.getByRole('button', { name: 'Previous day' })).toBeVisible();
  await expect(dateControls.getByRole('textbox', { name: 'Delivery day' })).toBeVisible();
  await expect(dateControls.getByRole('button', { name: 'Today', exact: true })).toBeVisible();
  await expect(dateControls.getByRole('button', { name: 'Next day' })).toBeVisible();
  await expect(dateControls.getByRole('button', { name: 'Refresh' })).toBeVisible();
  await expect(
    page.locator('article').filter({ hasText: 'Latest actual' }).getByText('140.0 MW'),
  ).toBeVisible();
  const latestActual = page.locator('article').filter({
    hasText: 'Latest actual',
  });
  await expect(latestActual).toContainText('Interval: Sep 30, 2026, 10:15 AM–10:30 AM');
  const sourceMetadata = page.locator('p').filter({
    hasText: 'Source: ENTSO-E',
  });
  await expect(sourceMetadata).toContainText('Updated');
  await expect(sourceMetadata).toContainText('11:00 AM');
  await expect(page.getByText(/Actual delayed by \d+ min/)).toBeVisible();
  await expect(
    page.getByText(
      'The latest actual interval ended at 10:30 AM. ENTSO-E has not published newer actual data yet.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByRole('img', { name: /comparing actual and forecast/i })).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount(3);
  const solarRows = page.locator('table tbody tr');
  await expect(solarRows.nth(0)).toContainText('10:00 AM–10:15 AM');
  await expect(solarRows.nth(0).locator('td').nth(0)).toHaveText('125.0 MW');
  await expect(solarRows.nth(0).locator('td').nth(1)).toHaveText('—');
  await expect(solarRows.nth(0).locator('td').nth(2)).toHaveText('—');
  await expect(solarRows.nth(0).locator('td').nth(3)).toHaveText('—');
  await expect(solarRows.nth(1)).toContainText('10:15 AM–10:30 AM');
  await expect(solarRows.nth(1)).toContainText('+5.0 MW');
  await expect(solarRows.nth(1)).toContainText('+3.7 %');

  await page.getByRole('button', { name: 'Switch to Czech' }).click();
  await expect(
    page.locator('article').filter({ hasText: 'Poslední skutečnost' }).getByText('140,0 MW'),
  ).toBeVisible();
  await expect(page.locator('article').filter({ hasText: 'Poslední skutečnost' })).toContainText(
    'Interval: 30. 9. 2026, 10:15–10:30',
  );
  await expect(page.locator('p').filter({ hasText: 'Zdroj: ENTSO-E' })).toContainText('11:00');
  await expect(page.getByText(/Skutečnost zpožděna o \d+ min/)).toBeVisible();
  await expect(
    page.getByText(
      'Poslední skutečný interval skončil ve 10:30. ENTSO-E zatím novější data nezveřejnilo.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(solarRows.nth(1)).toContainText('+5,0 MW');
  await expect(solarRows.nth(1)).toContainText('+3,7 %');

  await page.getByRole('textbox', { name: 'Den dodávky' }).fill('2026-10-01');
  await expect(page).toHaveURL(/date=2026-10-01/);
  await expect(page.getByText(/Skutečnost zpožděna/)).toHaveCount(0);

  await page.getByRole('button', { name: 'Otevřít výběr data' }).click();

  const datePicker = page.getByRole('dialog', { name: 'Vybrat datum' });
  await expect(datePicker).toBeVisible();
  await expect(datePicker.getByRole('button', { name: 'Zrušit', exact: true })).toBeVisible();
  await expect(datePicker.getByRole('button', { name: 'Vybrat', exact: true })).toBeVisible();
});

test('renders balancing ladder and target price history from API data', async ({ page }) => {
  await installMarketMocks(page);
  await page.route('**/api/balancing/ladder?*', (route) =>
    route.fulfill({
      json: {
        from: '2026-09-30T10:00:00.000Z',
        to: '2026-09-30T10:15:00.000Z',
        product: 'afrr',
        direction: 'up',
        productType: 'A04',
        currency: 'HUF',
        priceUnit: 'HUF/MWh',
        volumeUnit: 'MW',
        steps: [{ fromMw: 0, toMw: 150, price: 25000, bidIds: ['bid-1'] }],
        totalMw: 150,
        targetPrice: 25000,
        complete: true,
        missingPriceCount: 0,
        unknownAvailabilityCount: 0,
        complexBidCount: 0,
        interpretation: 'published-offer-order',
        bids: [
          {
            start: '2026-09-30T10:00:00.000Z',
            end: '2026-09-30T10:15:00.000Z',
            resolutionSeconds: 900,
            bidId: 'bid-1',
            direction: 'up',
            productType: 'A04',
            currency: 'HUF',
            mw: 150,
            price: 25000,
            available: true,
            cancelled: false,
            divisible: true,
            complexity: null,
            validityStart: null,
            validityEnd: null,
            revision: 1,
          },
        ],
        metadata: {
          area: 'HU',
          timezone: 'Europe/Budapest',
          source: 'ENTSO-E',
          sourcePublicationAt: null,
          publicationNote: '',
          windows: [],
        },
      },
    }),
  );
  await page.route('**/api/balancing/price-history?*', (route) =>
    route.fulfill({
      json: {
        data: [
          {
            from: '2026-09-30T10:00:00.000Z',
            to: '2026-09-30T10:15:00.000Z',
            price: 25000,
            totalMw: 150,
            complete: true,
            snapshotId: 'snapshot-1',
          },
        ],
        targetMw: 100,
        product: 'afrr',
        direction: 'up',
        productType: 'A04',
        currency: 'HUF',
        priceUnit: 'HUF/MWh',
        metadata: {
          area: 'HU',
          timezone: 'Europe/Budapest',
          source: 'ENTSO-E',
          sourcePublicationAt: null,
          publicationNote: '',
          windows: [],
        },
      },
    }),
  );

  await page.goto(
    '/balancing/ladder?at=2026-09-30T10%3A00%3A00.000Z&product=afrr&direction=up&productType=A04&currency=HUF&targetMw=100',
  );

  await expect(page.getByRole('heading', { name: 'Balancing energy bid ladder' })).toBeVisible();
  await expect(
    page.locator('article').filter({ hasText: 'Price at target' }).getByText('25,000.00 HUF/MWh'),
  ).toBeVisible();
  await expect(page.getByRole('img', { name: /cumulative megawatts/i })).toBeVisible();
  const bidRow = page.getByRole('row', { name: /bid-1/ });
  await expect(bidRow).toContainText('25,000.00 HUF/MWh');
  await expect(bidRow).toContainText('150.0 MW');
  const historyRow = page.locator('table tbody tr').last();
  await expect(historyRow).toContainText('9/30/26, 12:00 PM');
  await expect(historyRow).toContainText('25,000.00 HUF/MWh');

  await page.getByRole('button', { name: 'Switch to Czech' }).click();
  await expect(
    page
      .locator('article')
      .filter({ hasText: 'Cena na cíli' })
      .getByText(/25.000,00 HUF\/MWh/),
  ).toBeVisible();
  await expect(bidRow).toContainText(/25.000,00 HUF\/MWh/);
  await expect(bidRow).toContainText('150,0 MW');
  await expect(historyRow).toContainText('30.09.26 12:00');

  await page.getByLabel('Produkt').click();
  await page.getByRole('option', { name: 'mFRR' }).click();
  await expect(page).toHaveURL(/product=mfrr/);

  await page.getByLabel('Cílový výkon (MW)').fill('125');
  await expect(page).toHaveURL(/targetMw=125/);
});
