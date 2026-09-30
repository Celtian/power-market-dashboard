import { Directive, booleanAttribute, computed, input } from '@angular/core';

import { type VariantProps, cva } from 'class-variance-authority';

import { buildClasses } from '../helpers/tailwind';

const styles = cva('inline-flex items-center rounded-full whitespace-nowrap', {
  variants: {
    color: {
      neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100',
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      yellow: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100',
      red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    },
    size: {
      xs: 'px-2 py-0.5 text-xs',
      sm: 'px-2.5 py-1 text-xs',
      base: 'px-3 py-1 text-sm',
    },
    weight: { base: 'font-normal', bold: 'font-semibold' },
  },
  defaultVariants: { color: 'neutral', size: 'sm', weight: 'base' },
});

export type BadgeColor = NonNullable<VariantProps<typeof styles>['color']>;
export type BadgeSize = NonNullable<VariantProps<typeof styles>['size']>;
export type BadgeWeight = NonNullable<VariantProps<typeof styles>['weight']>;

@Directive({
  selector: '[uiBadge]',
  host: {
    '[class]': 'classes()',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-hidden]': "decorative() ? 'true' : null",
  },
})
export class Badge {
  public readonly color = input<BadgeColor>('neutral');
  public readonly size = input<BadgeSize>('sm');
  public readonly weight = input<BadgeWeight>('base');
  public readonly ariaLabel = input('');
  public readonly decorative = input(false, { transform: booleanAttribute });
  protected readonly classes = computed(() =>
    buildClasses(styles({ color: this.color(), size: this.size(), weight: this.weight() })),
  );
}
