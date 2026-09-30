import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let mediaQuery: MediaQueryList;

  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
    ensureThemeMeta().content = '#1d4ed8';
    mediaQuery = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList;
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mediaQuery));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the system theme when no preference is stored', () => {
    Object.defineProperty(mediaQuery, 'matches', {
      configurable: true,
      value: true,
    });

    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('dark');
    expect(document.documentElement.classList).toContain('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(themeColor()).toBe('#2a3444');
  });

  it('restores a stored theme instead of the system theme', () => {
    localStorage.setItem('theme', 'light');
    Object.defineProperty(mediaQuery, 'matches', {
      configurable: true,
      value: true,
    });

    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('light');
    expect(document.documentElement.classList).not.toContain('dark');
    expect(themeColor()).toBe('#1d4ed8');
  });

  it('persists explicit theme changes', () => {
    const service = TestBed.inject(ThemeService);

    service.setTheme('dark');

    expect(service.theme()).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement.classList).toContain('dark');
    expect(themeColor()).toBe('#2a3444');

    service.toggleTheme();

    expect(service.theme()).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('follows system changes until an explicit preference is selected', () => {
    const service = TestBed.inject(ThemeService);

    setSystemDarkMode(true);

    expect(service.theme()).toBe('dark');

    service.setTheme('light');
    setSystemDarkMode(true);

    expect(service.theme()).toBe('light');
  });

  it('synchronizes theme changes from another tab', () => {
    const service = TestBed.inject(ThemeService);

    window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: 'dark' }));

    expect(service.theme()).toBe('dark');
    expect(document.documentElement.classList).toContain('dark');
  });

  it('does not access browser state or mutate the document during SSR', () => {
    ensureThemeMeta().content = 'server-color';
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });
    const service = TestBed.inject(ThemeService);

    service.setTheme('dark');

    expect(service.theme()).toBe('dark');
    expect(localStorage.getItem('theme')).toBeNull();
    expect(document.documentElement.classList).not.toContain('dark');
    expect(themeColor()).toBe('server-color');
  });

  function setSystemDarkMode(matches: boolean): void {
    Object.defineProperty(mediaQuery, 'matches', {
      configurable: true,
      value: matches,
    });
    const changeListener = vi
      .mocked(mediaQuery.addEventListener)
      .mock.calls.find(([type]) => type === 'change')?.[1] as EventListener | undefined;
    changeListener?.(new Event('change'));
  }
});

function ensureThemeMeta(): HTMLMetaElement {
  const existing = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (existing) {
    return existing;
  }

  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  document.head.append(meta);
  return meta;
}

function themeColor(): string | null {
  return document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content ?? null;
}
