import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  PLATFORM_ID,
  Service,
  inject,
  signal,
} from '@angular/core';

export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'theme';
const THEME_COLORS: Record<Theme, string> = {
  dark: '#2a3444',
  light: '#1d4ed8',
};

const isTheme = (value: string | null): value is Theme =>
  value === 'light' || value === 'dark';

@Service()
export class ThemeService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly themeState = signal<Theme>('light');
  private readonly mediaQuery =
    this.isBrowser && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : undefined;
  private hasStoredPreference = false;

  public readonly theme = this.themeState.asReadonly();

  public constructor() {
    if (!this.isBrowser) {
      return;
    }

    const storedTheme = this.readStoredTheme();
    this.hasStoredPreference = storedTheme !== null;
    this.applyTheme(storedTheme ?? this.systemTheme());

    const onSystemThemeChange = () => {
      if (!this.hasStoredPreference) {
        this.applyTheme(this.systemTheme());
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) {
        return;
      }

      const storedTheme = isTheme(event.newValue) ? event.newValue : null;
      this.hasStoredPreference = storedTheme !== null;
      this.applyTheme(storedTheme ?? this.systemTheme());
    };

    this.mediaQuery?.addEventListener('change', onSystemThemeChange);
    window.addEventListener('storage', onStorage);
    this.destroyRef.onDestroy(() => {
      this.mediaQuery?.removeEventListener('change', onSystemThemeChange);
      window.removeEventListener('storage', onStorage);
    });
  }

  public setTheme(theme: Theme): void {
    this.applyTheme(theme);

    if (!this.isBrowser) {
      return;
    }

    this.hasStoredPreference = true;
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

  private systemTheme(): Theme {
    return this.mediaQuery?.matches ? 'dark' : 'light';
  }
}
