import { DOCUMENT } from '@angular/common';
import { ApplicationRef, DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { SonnerService } from '@power-market-dashboard/ui';
import { filter, first, switchMap, timer } from 'rxjs';

const UPDATE_CHECK_INTERVAL = 6 * 60 * 60 * 1_000;

@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly applicationRef = inject(ApplicationRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly sonner = inject(SonnerService);
  private readonly swUpdate = inject(SwUpdate);
  private updateToastShown = false;
  private unrecoverableToastShown = false;

  constructor() {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    this.watchForUpdates();
    this.watchForUnrecoverableState();
    this.scheduleUpdateChecks();
  }

  private watchForUpdates(): void {
    this.swUpdate.versionUpdates
      .pipe(
        filter(
          (event): event is VersionReadyEvent => event.type === 'VERSION_READY',
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        if (this.updateToastShown) {
          return;
        }

        this.updateToastShown = true;
        this.sonner.info('New version is available', {
          action: this.reloadAction(),
          duration: Infinity,
          id: 'pwa-version-ready',
          important: true,
        });
      });
  }

  private watchForUnrecoverableState(): void {
    this.swUpdate.unrecoverable
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.unrecoverableToastShown) {
          return;
        }

        this.unrecoverableToastShown = true;
        this.sonner.error('The application needs to be reloaded', {
          action: this.reloadAction(),
          description: 'A cached application file can no longer be recovered.',
          duration: Infinity,
          id: 'pwa-unrecoverable',
          important: true,
        });
      });
  }

  private scheduleUpdateChecks(): void {
    this.applicationRef.isStable
      .pipe(
        filter(Boolean),
        first(),
        switchMap(() => timer(0, UPDATE_CHECK_INTERVAL)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        void this.swUpdate.checkForUpdate().catch(() => undefined);
      });
  }

  private reloadAction(): { label: string; onClick: () => void } {
    return {
      label: 'Reload',
      onClick: () => this.document.location.reload(),
    };
  }
}
