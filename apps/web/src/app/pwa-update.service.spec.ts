import { DOCUMENT } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  SwUpdate,
  UnrecoverableStateEvent,
  VersionEvent,
} from '@angular/service-worker';
import { SonnerService } from '@power-market-dashboard/ui';
import { Subject } from 'rxjs';

import { PwaUpdateService } from './pwa-update.service';

describe('PwaUpdateService', () => {
  const sixHours = 6 * 60 * 60 * 1_000;
  let isStable: Subject<boolean>;
  let versionUpdates: Subject<VersionEvent>;
  let unrecoverable: Subject<UnrecoverableStateEvent>;
  let checkForUpdate: ReturnType<typeof vi.fn>;
  let reload: ReturnType<typeof vi.fn>;
  let sonner: {
    info: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  function configure(isEnabled = true): PwaUpdateService {
    isStable = new Subject<boolean>();
    versionUpdates = new Subject<VersionEvent>();
    unrecoverable = new Subject<UnrecoverableStateEvent>();
    checkForUpdate = vi.fn().mockResolvedValue(false);
    reload = vi.fn();
    sonner = { info: vi.fn(), error: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        PwaUpdateService,
        { provide: ApplicationRef, useValue: { isStable } },
        {
          provide: SwUpdate,
          useValue: {
            checkForUpdate,
            isEnabled,
            unrecoverable,
            versionUpdates,
          },
        },
        { provide: SonnerService, useValue: sonner },
        {
          provide: DOCUMENT,
          useValue: { location: { reload } },
        },
      ],
    });

    return TestBed.inject(PwaUpdateService);
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing when service workers are disabled', async () => {
    configure(false);

    isStable.next(true);
    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'current' },
      latestVersion: { hash: 'latest' },
    });
    await vi.advanceTimersByTimeAsync(sixHours);

    expect(checkForUpdate).not.toHaveBeenCalled();
    expect(sonner.info).not.toHaveBeenCalled();
  });

  it('checks immediately after stabilization and every six hours', async () => {
    configure();

    isStable.next(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(checkForUpdate).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(sixHours);
    expect(checkForUpdate).toHaveBeenCalledTimes(2);
  });

  it('shows one persistent reload toast for a ready version', () => {
    configure();
    const event: VersionEvent = {
      type: 'VERSION_READY',
      currentVersion: { hash: 'current' },
      latestVersion: { hash: 'latest' },
    };

    versionUpdates.next(event);
    versionUpdates.next(event);

    expect(sonner.info).toHaveBeenCalledOnce();
    expect(sonner.info).toHaveBeenCalledWith(
      'New version is available',
      expect.objectContaining({
        duration: Infinity,
        id: 'pwa-version-ready',
        important: true,
      }),
    );

    const options = sonner.info.mock.calls[0]?.[1];
    options.action.onClick();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('shows one persistent reload toast for an unrecoverable state', () => {
    configure();
    const event: UnrecoverableStateEvent = {
      type: 'UNRECOVERABLE_STATE',
      reason: 'Missing cached chunk',
    };

    unrecoverable.next(event);
    unrecoverable.next(event);

    expect(sonner.error).toHaveBeenCalledOnce();
    expect(sonner.error).toHaveBeenCalledWith(
      'The application needs to be reloaded',
      expect.objectContaining({
        duration: Infinity,
        id: 'pwa-unrecoverable',
        important: true,
      }),
    );
  });

  it('silently ignores a failed update check', async () => {
    configure();
    checkForUpdate.mockRejectedValue(new Error('Network unavailable'));

    isStable.next(true);
    await vi.advanceTimersByTimeAsync(0);

    expect(sonner.error).not.toHaveBeenCalled();
  });
});
