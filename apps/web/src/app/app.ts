import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  faSolidMoon,
  faSolidScaleBalanced,
  faSolidSun,
} from '@ng-icons/font-awesome/solid';
import {
  BottomNavigation,
  BottomNavigationItem,
  ButtonIcon,
  SonnerToasterComponent,
} from '@power-market-dashboard/ui';

import { ThemeService } from './theme.service';

@Component({
  imports: [
    BottomNavigation,
    BottomNavigationItem,
    ButtonIcon,
    NgIcon,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    SonnerToasterComponent,
  ],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  providers: [
    provideIcons({ faSolidMoon, faSolidScaleBalanced, faSolidSun }),
  ],
  host: { class: 'block min-h-screen' },
})
export class App {
  protected readonly currentYear = new Date().getFullYear();
  protected readonly theme = inject(ThemeService);
  protected readonly themeToggleIcon = computed(() =>
    this.theme.theme() === 'light' ? 'faSolidMoon' : 'faSolidSun',
  );
  protected readonly themeToggleLabel = computed(() =>
    this.theme.theme() === 'light'
      ? 'Switch to dark theme'
      : 'Switch to light theme',
  );
}
