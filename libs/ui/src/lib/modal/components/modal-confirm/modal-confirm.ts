import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject } from '@angular/core';

import { ButtonColor } from '../../../button/button.styles';
import { Button } from '../../../button/public-api';
import { ModalWrapper } from '../../directives/modal-wrapper';
import { ModalContent } from '../modal-content/modal-content';
import { ModalFooter } from '../modal-footer/modal-footer';
import { ModalHeader } from '../modal-header/modal-header';

export interface ModalConfirmData {
  readonly cancelLabel: string;
  readonly confirmLabel: string;
  readonly content: string;
  readonly title: string;
}

export interface ModalConfirmDialogData extends ModalConfirmData {
  readonly confirmColor: ButtonColor;
  readonly contentId: string;
  readonly titleId: string;
}

@Component({
  selector: 'ui-modal-confirm',
  imports: [Button, ModalContent, ModalFooter, ModalHeader],
  templateUrl: './modal-confirm.html',
  hostDirectives: [ModalWrapper],
})
export class ModalConfirm {
  protected readonly data = inject<ModalConfirmDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject(DialogRef<boolean>);

  protected cancel(): void {
    this.dialogRef.close(false);
  }

  protected confirm(): void {
    this.dialogRef.close(true);
  }
}
