import { test, expect } from '@playwright/test';

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
  expect(manifest.icons.every((icon) => icon.purpose === 'any maskable')).toBe(
    true,
  );
});

test('@chromium registers the Angular service worker', async ({ page }) => {
  await page.goto('/');

  const scriptUrl = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active?.scriptURL;
  });

  expect(scriptUrl).toContain('/ngsw-worker.js');
});

test('@chromium reloads the cached app shell while offline', async ({
  context,
  page,
}) => {
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
