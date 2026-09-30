import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, PLATFORM_ID, Service, inject, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'theme';
const DEFAULT_THEME: Theme = 'dark';
const THEME_COLORS: Record<Theme, string> = {
  dark: '#2a3444',
  light: '#1d4ed8',
};

const isTheme = (value: string | null): value is Theme => value === 'light' || value === 'dark';

@Service()
export class ThemeService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly themeState = signal<Theme>(DEFAULT_THEME);

  public readonly theme = this.themeState.asReadonly();

  public constructor() {
    if (!this.isBrowser) {
      return;
    }

    this.applyTheme(this.readStoredTheme() ?? DEFAULT_THEME);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) {
        return;
      }

      const storedTheme = isTheme(event.newValue) ? event.newValue : null;
      this.applyTheme(storedTheme ?? DEFAULT_THEME);
    };

    window.addEventListener('storage', onStorage);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('storage', onStorage);
    });
  }

  public setTheme(theme: Theme): void {
    this.applyTheme(theme);

    if (!this.isBrowser) {
      return;
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The selected theme still applies when storage is unavailable.
    }
  }

  public toggleTheme(): void {
    this.setTheme(this.themeState() === 'light' ? 'dark' : 'light');
  }

  private applyTheme(theme: Theme): void {
    this.themeState.set(theme);

    if (!this.isBrowser) {
      return;
    }

    this.document.documentElement.classList.toggle('dark', theme === 'dark');
    this.document.documentElement.style.colorScheme = theme;
    this.document
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLORS[theme]);
  }

  private readStoredTheme(): Theme | null {
    try {
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      return isTheme(storedTheme) ? storedTheme : null;
    } catch {
      return null;
    }
  }

}
