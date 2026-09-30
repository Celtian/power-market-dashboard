import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { SwUpdate, UnrecoverableStateEvent } from '@angular/service-worker';

import { TranslocoService } from '@jsverse/transloco';
import { Subject } from 'rxjs';

import { SonnerService } from '@power-market-dashboard/ui';

import { PwaUpdateService } from './pwa-update.service';

describe('PwaUpdateService', () => {
  let unrecoverable: Subject<UnrecoverableStateEvent>;
  let reload: ReturnType<typeof vi.fn>;
  let sonner: {
    error: ReturnType<typeof vi.fn>;
  };

  function configure(isEnabled = true): PwaUpdateService {
    unrecoverable = new Subject<UnrecoverableStateEvent>();
    reload = vi.fn();
    sonner = { error: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        PwaUpdateService,
        {
          provide: SwUpdate,
          useValue: {
            isEnabled,
            unrecoverable,
          },
        },
        { provide: SonnerService, useValue: sonner },
        {
          provide: TranslocoService,
          useValue: {
            translate: (key: string) =>
              ({
                'pwa.reload-action': 'Reload',
                'pwa.reload-description': 'A cached application file can no longer be recovered.',
                'pwa.reload-title': 'The application needs to be reloaded',
              })[key] ?? key,
          },
        },
        {
          provide: DOCUMENT,
          useValue: { location: { reload } },
        },
      ],
    });

    return TestBed.inject(PwaUpdateService);
  }

  it('does nothing when service workers are disabled', () => {
    configure(false);

    unrecoverable.next({
      type: 'UNRECOVERABLE_STATE',
      reason: 'Missing cached chunk',
    });

    expect(sonner.error).not.toHaveBeenCalled();
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

    const options = sonner.error.mock.calls[0]?.[1];
    options.action.onClick();
    expect(reload).toHaveBeenCalledOnce();
  });
});
