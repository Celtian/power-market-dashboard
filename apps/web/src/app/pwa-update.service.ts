import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';

import { TranslocoService } from '@jsverse/transloco';

import { SonnerService } from '@power-market-dashboard/ui';

@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly sonner = inject(SonnerService);
  private readonly swUpdate = inject(SwUpdate);
  private readonly transloco = inject(TranslocoService);
  private unrecoverableToastShown = false;

  constructor() {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    this.watchForUnrecoverableState();
  }

  private watchForUnrecoverableState(): void {
    this.swUpdate.unrecoverable.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.unrecoverableToastShown) {
        return;
      }

      this.unrecoverableToastShown = true;
      this.sonner.error(this.transloco.translate('pwa.reload-title'), {
        action: this.reloadAction(),
        description: this.transloco.translate('pwa.reload-description'),
        duration: Infinity,
        id: 'pwa-unrecoverable',
        important: true,
      });
    });
  }

  private reloadAction(): { label: string; onClick: () => void } {
    return {
      label: this.transloco.translate('pwa.reload-action'),
      onClick: () => this.document.location.reload(),
    };
  }
}
