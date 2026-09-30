import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { TranslocoService } from '@jsverse/transloco';
import { provideTranslocoLocale } from '@jsverse/transloco-locale';

import { appRoutes } from './app.routes';
import { BalancingLadderPage } from './balancing/balancing-ladder-page';
import { provideLocalizedTitle } from './localized-title-strategy';
import { NotFoundPage } from './not-found/not-found-page';
import { SolarPage } from './solar/solar-page';
import { translocoTestingModule } from './transloco-testing';

describe('appRoutes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [translocoTestingModule()],
      providers: [
        provideRouter(appRoutes),
        provideLocalizedTitle(),
        provideTranslocoLocale({
          defaultLocale: 'en-US',
          langToLocaleMapping: { cs: 'cs-CZ', en: 'en-US' },
        }),
      ],
    });
  });

  it('redirects the root route to solar', async () => {
    const harness = await RouterTestingHarness.create();

    const page = await harness.navigateByUrl('/', SolarPage);

    harness.detectChanges();
    await harness.fixture.whenStable();
    expect(page).toBeInstanceOf(SolarPage);
    expect(TestBed.inject(Router).url).toMatch(/^\/solar\?date=\d{4}-\d{2}-\d{2}$/);
  });

  it('loads the solar page directly', async () => {
    const harness = await RouterTestingHarness.create();

    const page = await harness.navigateByUrl('/solar', SolarPage);

    expect(page).toBeInstanceOf(SolarPage);
  });

  it('redirects balancing to its ladder page', async () => {
    const harness = await RouterTestingHarness.create();

    const page = await harness.navigateByUrl('/balancing', BalancingLadderPage);

    expect(page).toBeInstanceOf(BalancingLadderPage);
    expect(TestBed.inject(Router).url).toBe('/balancing/ladder');
  });

  it('renders the not-found page without replacing the unknown URL', async () => {
    const harness = await RouterTestingHarness.create();

    const page = await harness.navigateByUrl('/missing', NotFoundPage);

    expect(page).toBeInstanceOf(NotFoundPage);
    expect(TestBed.inject(Router).url).toBe('/missing');
    expect(document.title).toBe('Page Not Found | Power Market Dashboard');
  });

  it('updates the page title when the language changes', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/solar', SolarPage);

    expect(document.title).toBe('Solar | Power Market Dashboard');

    TestBed.inject(TranslocoService).setActiveLang('cs');
    await harness.fixture.whenStable();

    expect(document.title).toBe('Solární výroba | Power Market Dashboard');
  });
});
