import { Directive } from '@angular/core';

@Directive({
  selector: '[uiModalWrapper]',
  host: {
    class:
      'relative block max-h-[calc(100dvh-2rem)] overflow-hidden rounded-lg border border-primary-400 bg-primary-300 text-primary-contrast-300 shadow-lg divide-y divide-primary-400 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-contrast-800 dark:divide-secondary-600',
  },
})
export class ModalWrapper {}
