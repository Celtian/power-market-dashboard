import { Dialog, DialogConfig, DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';

import { EMPTY } from 'rxjs';

import {
  ModalConfirm,
  ModalConfirmDialogData,
} from './components/modal-confirm/modal-confirm';
import { ModalService } from './modal.service';

describe('ModalService', () => {
  let config: DialogConfig<ModalConfirmDialogData>;
  const open = vi.fn(
    (
      _component: typeof ModalConfirm,
      dialogConfig: DialogConfig<ModalConfirmDialogData>,
    ) => {
      config = dialogConfig;
      return { closed: EMPTY } as unknown as DialogRef<boolean>;
    },
  );

  beforeEach(() => {
    open.mockClear();
    TestBed.configureTestingModule({
      providers: [ModalService, { provide: Dialog, useValue: { open } }],
    });
  });

  it('opens an accessible destructive confirmation dialog with unique labelled content', () => {
    const data = {
      cancelLabel: 'Cancel',
      confirmLabel: 'Delete',
      content: 'This cannot be undone.',
      title: 'Delete project?',
    };

    TestBed.inject(ModalService).confirm(data);

    expect(open).toHaveBeenCalledWith(ModalConfirm, expect.any(Object));
    expect(config.role).toBe('alertdialog');
    expect(config.ariaModal).toBe(true);
    expect(config.autoFocus).toBe('[data-modal-cancel]');
    expect(config.restoreFocus).toBe(true);
    expect(config.disableClose).toBe(false);
    expect(config.hasBackdrop).toBe(true);
    expect(config.ariaLabelledBy).toBe(config.data?.titleId);
    expect(config.ariaDescribedBy).toBe(config.data?.contentId);
    expect(config.data).toMatchObject(data);
    expect(config.data?.confirmColor).toBe('danger');
  });

  it('opens an accessible non-destructive action dialog focused on its primary action', () => {
    const data = {
      cancelLabel: 'Cancel',
      confirmLabel: 'View plans',
      content: 'Upgrade your plan to continue.',
      title: 'User limit reached',
    };

    TestBed.inject(ModalService).action(data);

    expect(config.role).toBe('dialog');
    expect(config.autoFocus).toBe('[data-modal-confirm]');
    expect(config.ariaModal).toBe(true);
    expect(config.restoreFocus).toBe(true);
    expect(config.data).toMatchObject(data);
    expect(config.data?.confirmColor).toBe('default');
  });
});
