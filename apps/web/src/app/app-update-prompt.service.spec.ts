import { Dialog } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { AppUpdatePromptService } from './app-update-prompt.service';
import { AppUpdatePrompt } from './components/app-update-prompt/app-update-prompt';

describe('AppUpdatePromptService', () => {
  let closed: Subject<boolean | undefined>;
  let dialogOpen: ReturnType<typeof vi.fn>;
  let reload: ReturnType<typeof vi.fn>;
  let updatePosition: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    closed = new Subject<boolean | undefined>();
    reload = vi.fn();
    updatePosition = vi.fn();
    dialogOpen = vi.fn().mockReturnValue({ closed, updatePosition });

    const bottom = vi.fn().mockReturnValue('position-strategy');
    const left = vi.fn().mockReturnValue({ bottom });
    const global = vi.fn().mockReturnValue({ left });

    TestBed.configureTestingModule({
      providers: [
        AppUpdatePromptService,
        { provide: Dialog, useValue: { open: dialogOpen } },
        {
          provide: Overlay,
          useValue: { position: () => ({ global }) },
        },
        { provide: DOCUMENT, useValue: { location: { reload } } },
      ],
    });
  });

  it('opens an accessible bottom-left prompt without a backdrop', async () => {
    await TestBed.inject(AppUpdatePromptService).open();

    expect(dialogOpen).toHaveBeenCalledWith(
      AppUpdatePrompt,
      expect.objectContaining({
        ariaDescribedBy: 'app-update-description',
        ariaLabelledBy: 'app-update-title',
        ariaModal: false,
        autoFocus: false,
        hasBackdrop: false,
        maxWidth: 'calc(100vw - 1rem)',
        positionStrategy: 'position-strategy',
        restoreFocus: true,
        role: 'dialog',
      }),
    );
    expect(updatePosition).toHaveBeenCalledOnce();
  });

  it('reloads only when the update is confirmed', async () => {
    await TestBed.inject(AppUpdatePromptService).open();

    closed.next(false);
    expect(reload).not.toHaveBeenCalled();

    closed.next(true);
    expect(reload).toHaveBeenCalledOnce();
  });
});
