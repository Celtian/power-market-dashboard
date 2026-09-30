import { Component, computed, input } from '@angular/core';

import { type VariantProps, cva } from 'class-variance-authority';

import { buildClasses } from '../helpers/tailwind';

const paddingStyles = cva('', {
  variants: {
    size: { sm: '', base: '' },
    withPadding: { true: '', false: '' },
  },
  compoundVariants: [
    { size: 'sm', withPadding: true, class: 'px-3 py-4' },
    { size: 'base', withPadding: true, class: 'px-4 py-5 sm:px-6' },
  ],
  defaultVariants: { size: 'base', withPadding: true },
});

export type CardSize = NonNullable<VariantProps<typeof paddingStyles>['size']>;

@Component({
  selector: 'ui-card, [ui-card]',
  template: '<ng-content />',
  host: {
    class:
      'block overflow-hidden rounded-xl border border-primary-400 surface-300 shadow-sm dark:border-secondary-600 dark:surface-800',
  },
})
export class Card {}

@Component({
  selector: 'ui-card-header, [ui-card-header]',
  template: '<ng-content />',
  host: { '[class]': 'classes()' },
})
export class CardHeader {
  public readonly size = input<CardSize>('base');
  public readonly withPadding = input(true);
  protected readonly classes = computed(() =>
    buildClasses(
      'flex items-start justify-between gap-3 border-b border-primary-400 dark:border-secondary-600',
      paddingStyles({ size: this.size(), withPadding: this.withPadding() }),
    ),
  );
}

@Component({
  selector: 'ui-card-title, [ui-card-title]',
  template: '<ng-content />',
  host: {
    class: 'block text-lg font-semibold',
    role: 'heading',
    '[attr.aria-level]': 'level()',
  },
})
export class CardTitle {
  public readonly level = input<1 | 2 | 3 | 4 | 5 | 6>(2);
}

@Component({
  selector: 'ui-card-subtitle, [ui-card-subtitle]',
  template: '<ng-content />',
  host: { class: 'mt-1 block text-sm opacity-75' },
})
export class CardSubtitle {}

@Component({
  selector: 'ui-card-action, [ui-card-action]',
  template: '<ng-content />',
  host: { class: 'flex shrink-0 items-center justify-end' },
})
export class CardAction {}

@Component({
  selector: 'ui-card-content, [ui-card-content]',
  template: '<ng-content />',
  host: { '[class]': 'classes()' },
})
export class CardContent {
  public readonly size = input<CardSize>('base');
  public readonly withPadding = input(true);
  protected readonly classes = computed(() =>
    buildClasses('block', paddingStyles({ size: this.size(), withPadding: this.withPadding() })),
  );
}
