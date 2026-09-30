import { TestBed } from '@angular/core/testing';

import { TranslocoService } from '@jsverse/transloco';
import {
  TranslocoPersistLangService,
  cookiesStorage,
  provideTranslocoPersistLang,
} from '@jsverse/transloco-persist-lang';

import { translocoTestingModule } from './transloco-testing';

describe('language persistence', () => {
  beforeEach(() => {
    document.cookie = 'translocoLang=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
  });

  afterEach(() => {
    document.cookie = 'translocoLang=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
  });

  it('uses English when no language cookie exists', () => {
    configurePersistence();

    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('en');
  });

  it('restores Czech and persists later language changes', () => {
    document.cookie = 'translocoLang=cs;path=/';
    configurePersistence();
    const transloco = TestBed.inject(TranslocoService);

    expect(transloco.getActiveLang()).toBe('cs');

    transloco.setActiveLang('en');

    expect(document.cookie).toContain('translocoLang=en');
  });

  it('falls back to English for an unsupported cookie value', () => {
    document.cookie = 'translocoLang=de;path=/';
    configurePersistence();

    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('en');
  });

  function configurePersistence(): void {
    TestBed.configureTestingModule({
      imports: [translocoTestingModule()],
      providers: [
        provideTranslocoPersistLang({
          getLangFn: ({ cachedLang }) => (cachedLang === 'cs' ? 'cs' : 'en'),
          storage: { useValue: cookiesStorage() },
        }),
      ],
    });
    TestBed.inject(TranslocoPersistLangService);
  }
});
