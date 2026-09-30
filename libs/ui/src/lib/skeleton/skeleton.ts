import { Component, computed, input } from '@angular/core';

import { VariantProps, cva } from 'class-variance-authority';

import { buildClasses } from '../helpers/tailwind';

const styles = cva('block surface-400 dark:surface-700', {
  variants: {
    animation: {
      pulse: 'animate-pulse',
      none: '',
    },
    shape: {
      circle: 'rounded-full',
      rectangle: 'rounded-lg',
    },
  },
  defaultVariants: {
    animation: 'pulse',
    shape: 'rectangle',
  },
});

export type SkeletonAnimation = NonNullable<VariantProps<typeof styles>['animation']>;
export type SkeletonShape = NonNullable<VariantProps<typeof styles>['shape']>;

@Component({
  selector: 'ui-skeleton',
  imports: [],
  templateUrl: './skeleton.html',
  host: {
    '[class]': 'twClasses()',
    '[style.width]': 'width()',
    '[style.height]': 'height()',
  },
})
export class Skeleton {
  public readonly animation = input<SkeletonAnimation>('pulse');
  public readonly shape = input<SkeletonShape>('rectangle');
  public readonly width = input<string>('100%');
  public readonly height = input<string>('1rem');

  public readonly twClasses = computed(() =>
    buildClasses(
      styles({
        animation: this.animation(),
        shape: this.shape(),
      }),
    ),
  );
}
