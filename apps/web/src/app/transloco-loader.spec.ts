import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { firstValueFrom } from 'rxjs';

import { TranslocoHttpLoader } from './transloco-loader';

describe('TranslocoHttpLoader', () => {
  let http: HttpTestingController;
  let loader: TranslocoHttpLoader;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), TranslocoHttpLoader],
    });
    http = TestBed.inject(HttpTestingController);
    loader = TestBed.inject(TranslocoHttpLoader);
  });

  afterEach(() => http.verify());

  it('loads the requested language catalog', async () => {
    const translation = firstValueFrom(loader.getTranslation('cs'));
    http.expectOne('/i18n/cs.json').flush({ app: { home: 'Domovská stránka' } });

    await expect(translation).resolves.toEqual({
      app: { home: 'Domovská stránka' },
    });
  });
});
