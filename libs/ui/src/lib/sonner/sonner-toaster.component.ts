import {
  Component,
  OnDestroy,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

import { NgxSonnerToaster, Position, Theme, ToastOptions } from 'ngx-sonner';

import { UI_OVERLAY_Z_INDEX } from '../helpers/overlay-layers';
import { SonnerToasterRegistry } from './sonner-toaster-registry';
import { SONNER_THEME } from './sonner.provider';

@Component({
  selector: 'ui-sonner-toaster',
  imports: [NgxSonnerToaster],
  templateUrl: './sonner-toaster.component.html',
})
export class SonnerToasterComponent implements OnDestroy {
  private readonly sonnerTheme = inject(SONNER_THEME, { optional: true });
  private readonly registry = inject(SonnerToasterRegistry);
  protected readonly browserReady = signal(false);

  public readonly theme = input<Theme | null>(null);
  public readonly resolvedTheme = computed(
    () => this.theme() ?? this.sonnerTheme?.() ?? 'system',
  );
  public readonly position = input<Position>('bottom-right');
  public readonly hotKey = input<string[]>(['altKey', 'KeyT']);
  public readonly richColors = input(true);
  public readonly expand = input(false);
  public readonly duration = input(4000);
  public readonly visibleToasts = input(3);
  public readonly closeButton = input(true);
  public readonly toastOptions = input<ToastOptions>({});
  public readonly offset = input<string | number | null>(null);
  public readonly dir = input<'ltr' | 'rtl' | 'auto'>('auto');
  public readonly invert = input(false);
  public readonly className = input('');
  public readonly style = input<Record<string, string>>({});
  public readonly zIndex = input(UI_OVERLAY_Z_INDEX.toast);

  public readonly toasterStyle = computed(() => ({
    'z-index': `${this.zIndex()}`,
    '--ngx-sonner-border-radius': '0.5rem',
    '--ngx-sonner-toast-normal-background': 'var(--app-primary-300)',
    '--ngx-sonner-toast-normal-border-color': 'var(--app-primary-400)',
    '--ngx-sonner-toast-normal-color': 'var(--app-primary-contrast-300)',
    '--ngx-sonner-toast-dark-normal-background': 'var(--app-secondary-800)',
    '--ngx-sonner-toast-dark-normal-border-color': 'var(--app-secondary-600)',
    '--ngx-sonner-toast-dark-normal-color': 'var(--app-secondary-contrast-800)',
    '--ngx-sonner-toast-success-background': 'var(--app-success-100)',
    '--ngx-sonner-toast-success-border': 'var(--app-success-300)',
    '--ngx-sonner-toast-success-color': 'var(--app-success-contrast-100)',
    '--ngx-sonner-toast-dark-success-background': 'var(--app-success-900)',
    '--ngx-sonner-toast-dark-success-border': 'var(--app-success-700)',
    '--ngx-sonner-toast-dark-success-color': 'var(--app-success-contrast-900)',
    '--ngx-sonner-toast-warning-background': 'var(--app-warning-100)',
    '--ngx-sonner-toast-warning-border': 'var(--app-warning-300)',
    '--ngx-sonner-toast-warning-color': 'var(--app-warning-contrast-100)',
    '--ngx-sonner-toast-dark-warning-background': 'var(--app-warning-900)',
    '--ngx-sonner-toast-dark-warning-border': 'var(--app-warning-700)',
    '--ngx-sonner-toast-dark-warning-color': 'var(--app-warning-contrast-900)',
    '--ngx-sonner-toast-error-background': 'var(--app-danger-100)',
    '--ngx-sonner-toast-error-border': 'var(--app-danger-300)',
    '--ngx-sonner-toast-error-color': 'var(--app-danger-contrast-100)',
    '--ngx-sonner-toast-dark-error-background': 'var(--app-danger-900)',
    '--ngx-sonner-toast-dark-error-border': 'var(--app-danger-700)',
    '--ngx-sonner-toast-dark-error-color': 'var(--app-danger-contrast-900)',
    '--ngx-sonner-toast-info-background': 'var(--app-primary-100)',
    '--ngx-sonner-toast-info-border': 'var(--app-primary-300)',
    '--ngx-sonner-toast-info-color': 'var(--app-primary-contrast-100)',
    '--ngx-sonner-toast-dark-info-background': 'var(--app-secondary-900)',
    '--ngx-sonner-toast-dark-info-border': 'var(--app-secondary-700)',
    '--ngx-sonner-toast-dark-info-color': 'var(--app-secondary-contrast-900)',
    '--ngx-sonner-toast-close-button-background': 'var(--app-primary-200)',
    '--ngx-sonner-toast-close-button-border':
      '1px solid var(--app-primary-400)',
    '--ngx-sonner-toast-close-button-color': 'var(--app-primary-contrast-200)',
    '--ngx-sonner-toast-close-button-hover-background':
      'var(--app-primary-300)',
    '--ngx-sonner-toast-close-button-hover-color':
      'var(--app-primary-contrast-300)',
    '--ngx-sonner-toast-close-button-hover-border-color':
      'var(--app-primary-500)',
    ...this.style(),
  }));

  public constructor() {
    afterNextRender(() => this.browserReady.set(true));
    this.registry.register();
  }

  public ngOnDestroy(): void {
    this.registry.unregister();
  }
}
