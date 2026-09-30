import { Component, input } from '@angular/core';

@Component({
  selector: 'ui-modal-content',
  templateUrl: './modal-content.html',
  host: {
    class:
      'block max-h-[calc(100dvh-12rem)] overflow-auto px-4 py-3 sm:px-5 sm:py-4 ui-scrollbar',
    '[attr.id]': 'contentId()',
  },
})
export class ModalContent {
  public readonly contentId = input<string>();
}
