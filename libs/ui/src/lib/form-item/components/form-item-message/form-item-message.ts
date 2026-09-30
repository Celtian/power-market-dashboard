import { Component, computed, input } from '@angular/core';

import { VariantProps, cva } from 'class-variance-authority';

import { buildClasses } from '../../../helpers/public-api';

const styles = cva('block min-h-4 text-xs', {
  variants: {
    variant: {
      hint: '',
      error: 'text-danger-500',
    },
  },
  defaultVariants: {
    variant: 'hint',
  },
});

export type FormItemMessageVariant = NonNullable<VariantProps<typeof styles>['variant']>;

@Component({
  selector: 'ui-form-item-message',
  imports: [],
  templateUrl: './form-item-message.html',
  host: {
    '[class]': 'twClasses()',
    '[attr.role]': 'variant() === "error" ? "status" : null',
    '[attr.aria-live]': 'variant() === "error" ? "polite" : null',
  },
})
export class FormItemMessage {
  public readonly variant = input<FormItemMessageVariant>('hint');
  public readonly twClasses = computed(() => buildClasses(styles({ variant: this.variant() })));
}
