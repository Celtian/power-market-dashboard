import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BalancingLadderPage } from './balancing/balancing-ladder-page';
import { appRoutes } from './app.routes';
import { SolarPage } from './solar/solar-page';

describe('appRoutes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(appRoutes)],
    });
  });

  it('redirects the root route to solar', async () => {
    const harness = await RouterTestingHarness.create();

    const page = await harness.navigateByUrl('/', SolarPage);

    expect(page).toBeInstanceOf(SolarPage);
    expect(TestBed.inject(Router).url).toBe('/solar');
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

  it('redirects unknown routes to solar', async () => {
    const harness = await RouterTestingHarness.create();

    const page = await harness.navigateByUrl('/missing', SolarPage);

    expect(page).toBeInstanceOf(SolarPage);
    expect(TestBed.inject(Router).url).toBe('/solar');
  });
});
