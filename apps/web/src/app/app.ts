import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { TranslocoPipe, TranslocoService, translateSignal } from '@jsverse/transloco';
import { marker as _ } from '@jsverse/transloco-keys-manager/marker';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  faSolidBars,
  faSolidChevronUp,
  faSolidMoon,
  faSolidScaleBalanced,
  faSolidSun,
} from '@ng-icons/font-awesome/solid';
import { NgxScrollTopDirective } from 'ngx-scrolltop';
import { NgxUpdateAppDirective } from 'ngx-update-app';

import {
  BottomNavigation,
  BottomNavigationItem,
  ButtonIcon,
  Dropdown,
  DropdownPanel,
  Flag,
  SonnerToasterComponent,
  Tooltip,
} from '@power-market-dashboard/ui';

import { Logo } from './components/logo/logo';
import { ThemeService } from './theme.service';

const LANGUAGE_TOGGLE_KEYS = {
  cs: _('app.language.switch-to-cs'),
  en: _('app.language.switch-to-en'),
} as const;

const THEME_TOGGLE_KEYS = {
  dark: _('app.theme.switch-to-dark'),
  light: _('app.theme.switch-to-light'),
} as const;

@Component({
  imports: [
    BottomNavigation,
    BottomNavigationItem,
    ButtonIcon,
    Dropdown,
    DropdownPanel,
    Flag,
    Logo,
    NgIcon,
    NgxScrollTopDirective,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    SonnerToasterComponent,
    Tooltip,
    TranslocoPipe,
  ],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  providers: [
    provideIcons({
      faSolidBars,
      faSolidChevronUp,
      faSolidMoon,
      faSolidScaleBalanced,
      faSolidSun,
    }),
  ],
  host: { class: 'block min-h-screen' },
  hostDirectives: [NgxUpdateAppDirective],
})
export class App {
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly transloco = inject(TranslocoService);
  private readonly activeLanguage = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });
  private readonly languageToggleKey = computed(() =>
    this.activeLanguage() === 'cs' ? LANGUAGE_TOGGLE_KEYS.en : LANGUAGE_TOGGLE_KEYS.cs,
  );
  private readonly themeToggleKey = computed(() =>
    this.theme.theme() === 'light' ? THEME_TOGGLE_KEYS.dark : THEME_TOGGLE_KEYS.light,
  );

  protected readonly currentYear = new Date().getFullYear();
  protected readonly theme = inject(ThemeService);
  protected readonly languageFlag = computed(() => (this.activeLanguage() === 'cs' ? 'cz' : 'gb'));
  protected readonly languageToggleLabel = translateSignal(this.languageToggleKey);
  protected readonly themeToggleIcon = computed(() =>
    this.theme.theme() === 'light' ? 'faSolidMoon' : 'faSolidSun',
  );
  protected readonly themeToggleLabel = translateSignal(this.themeToggleKey);

  public constructor() {
    this.setDocumentLanguage(this.activeLanguage());
    this.transloco.langChanges$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((language) => this.setDocumentLanguage(language));
  }

  protected toggleLanguage(): void {
    this.transloco.setActiveLang(this.activeLanguage() === 'cs' ? 'en' : 'cs');
  }

  private setDocumentLanguage(language: string): void {
    this.document.documentElement.lang = language;
  }
}
