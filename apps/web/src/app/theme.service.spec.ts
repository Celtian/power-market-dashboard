import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
    ensureThemeMeta().content = '#1d4ed8';
  });

  it('uses the dark theme when no preference is stored', () => {
    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('dark');
    expect(document.documentElement.classList).toContain('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(themeColor()).toBe('#2a3444');
  });

  it('restores a stored theme instead of the default theme', () => {
    localStorage.setItem('theme', 'light');

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

  it('falls back to the dark theme when the stored preference is removed', () => {
    localStorage.setItem('theme', 'light');
    const service = TestBed.inject(ThemeService);

    window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: null }));

    expect(service.theme()).toBe('dark');
    expect(document.documentElement.classList).toContain('dark');
  });

  it('synchronizes theme changes from another tab', () => {
    const service = TestBed.inject(ThemeService);

    window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: 'light' }));

    expect(service.theme()).toBe('light');
    expect(document.documentElement.classList).not.toContain('dark');
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
