import { Component, computed, input } from '@angular/core';

import { type VariantProps, cva } from 'class-variance-authority';

import { buildClasses } from '../../../helpers/public-api';

const styles = cva(
  'flex flex-wrap items-center gap-2 px-4 py-3 sm:px-5 sm:py-4',
  {
    variants: {
      align: {
        start: 'justify-start',
        center: 'justify-center',
        end: 'justify-end',
      },
    },
    defaultVariants: { align: 'end' },
  },
);

export type ModalFooterAlign = NonNullable<
  VariantProps<typeof styles>['align']
>;

@Component({
  selector: 'ui-modal-footer',
  templateUrl: './modal-footer.html',
  host: { '[class]': 'twClasses()' },
})
export class ModalFooter {
  public readonly align = input<ModalFooterAlign>('end');
  protected readonly twClasses = computed(() =>
    buildClasses(styles({ align: this.align() })),
  );
}
