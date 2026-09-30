import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { SONNER_THEME, provideSonnerTheme } from './sonner.provider';

describe('provideSonnerTheme', () => {
  it('should provide the system theme by default', () => {
    TestBed.configureTestingModule({
      providers: [provideSonnerTheme()],
    });

    expect(TestBed.inject(SONNER_THEME)()).toBe('system');
  });

  it('should use a custom reactive theme factory', () => {
    TestBed.configureTestingModule({
      providers: [provideSonnerTheme(() => signal('dark'))],
    });

    expect(TestBed.inject(SONNER_THEME)()).toBe('dark');
  });
});
