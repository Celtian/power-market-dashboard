import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { MarketApiService } from './market-api.service';

describe('MarketApiService', () => {
  let api: MarketApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(MarketApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests an end-exclusive solar range', () => {
    api.solar('2026-09-29T22:00:00.000Z', '2026-09-30T22:00:00.000Z').subscribe();

    const request = http.expectOne(
      (candidate) =>
        candidate.url === '/api/solar' &&
        candidate.params.get('from') === '2026-09-29T22:00:00.000Z' &&
        candidate.params.get('to') === '2026-09-30T22:00:00.000Z',
    );
    expect(request.request.method).toBe('GET');
    request.flush({});
  });

  it('serializes every ladder dimension independently', () => {
    api
      .ladder({
        at: '2026-09-30T10:00:00.000Z',
        product: 'afrr',
        direction: 'up',
        productType: 'A04',
        currency: 'HUF',
        targetMw: 100,
      })
      .subscribe();

    const request = http.expectOne(
      '/api/balancing/ladder?product=afrr&direction=up&productType=A04&currency=HUF&targetMw=100&at=2026-09-30T10:00:00.000Z',
    );
    expect(request.request.method).toBe('GET');
    request.flush({});
  });
});
