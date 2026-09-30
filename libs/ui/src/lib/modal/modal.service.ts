import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { Service, inject } from '@angular/core';

import {
  ModalConfirm,
  ModalConfirmData,
  ModalConfirmDialogData,
} from './components/modal-confirm/modal-confirm';

@Service()
export class ModalService {
  private static nextId = 0;
  private readonly dialog = inject(Dialog);

  public confirm(data: ModalConfirmData): DialogRef<boolean> {
    return this.open(data, true);
  }

  public action(data: ModalConfirmData): DialogRef<boolean> {
    return this.open(data, false);
  }

  private open(data: ModalConfirmData, destructive: boolean): DialogRef<boolean> {
    const id = ModalService.nextId++;
    const dialogData: ModalConfirmDialogData = {
      ...data,
      confirmColor: destructive ? 'danger' : 'default',
      contentId: `ui-modal-confirm-content-${id}`,
      titleId: `ui-modal-confirm-title-${id}`,
    };

    return this.dialog.open<boolean, ModalConfirmDialogData>(ModalConfirm, {
      ariaDescribedBy: dialogData.contentId,
      ariaLabelledBy: dialogData.titleId,
      ariaModal: true,
      autoFocus: destructive ? '[data-modal-cancel]' : '[data-modal-confirm]',
      backdropClass: 'cdk-overlay-dark-backdrop',
      data: dialogData,
      disableClose: false,
      hasBackdrop: true,
      panelClass: ['ui-modal-sm'],
      restoreFocus: true,
      role: destructive ? 'alertdialog' : 'dialog',
    });
  }
}
