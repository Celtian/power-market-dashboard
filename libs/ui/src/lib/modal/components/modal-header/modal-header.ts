import { Component, booleanAttribute, inject, input, output } from '@angular/core';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { faSolidXmark } from '@ng-icons/font-awesome/solid';

import { ButtonIcon } from '../../../button/public-api';
import { UI_I18N } from '../../../helpers/ui-i18n.provider';

@Component({
  selector: 'ui-modal-header',
  imports: [ButtonIcon, NgIcon],
  templateUrl: './modal-header.html',
  providers: [provideIcons({ faSolidXmark })],
  host: {
    class: 'flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4',
  },
})
export class ModalHeader {
  protected readonly i18n = inject(UI_I18N);
  public readonly modalTitle = input.required<string>();
  public readonly titleId = input<string>();
  public readonly showCloseButton = input(false, {
    transform: booleanAttribute,
  });
  public readonly closeClicked = output<void>();
}
