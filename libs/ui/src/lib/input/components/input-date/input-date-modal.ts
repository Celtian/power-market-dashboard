import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject, signal } from '@angular/core';

import { Button } from '../../../button/public-api';
import { UI_I18N } from '../../../helpers/public-api';
import { ModalContent, ModalFooter, ModalHeader, ModalWrapper } from '../../../modal/public-api';
import { InputCalendar } from '../input-calendar/input-calendar';

export interface InputDateModalData {
  readonly calendarId: string;
  readonly contentId: string;
  readonly firstDayOfWeek: number;
  readonly locale: string | undefined;
  readonly maxDate: string | Date | null;
  readonly minDate: string | Date | null;
  readonly titleId: string;
  readonly value: string;
}

@Component({
  selector: 'ui-input-date-modal',
  imports: [Button, InputCalendar, ModalContent, ModalFooter, ModalHeader],
  templateUrl: './input-date-modal.html',
  hostDirectives: [ModalWrapper],
})
export class InputDateModal {
  protected readonly i18n = inject(UI_I18N);
  protected readonly data = inject<InputDateModalData>(DIALOG_DATA);
  private readonly dialogRef = inject<DialogRef<string | undefined>>(DialogRef);

  protected readonly value = signal(this.data.value);

  protected cancel(): void {
    this.dialogRef.close(undefined);
  }

  protected select(): void {
    this.dialogRef.close(this.value());
  }
}
