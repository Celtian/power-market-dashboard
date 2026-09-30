import { VariantProps, cva } from 'class-variance-authority';

const sharedVariants = {
  color: {
    default:
      'surface-300 hover:surface-400 focus:border-primary-500 focus:outline-primary-500 dark:surface-800 dark:hover:surface-700 dark:focus:border-primary-400 dark:focus:outline-primary-400',
    danger:
      'bg-danger-600 text-danger-contrast-600 hover:bg-danger-700 focus:border-danger-700 focus:outline-danger-500 dark:bg-danger-700 dark:text-danger-contrast-700 dark:hover:bg-danger-600 dark:focus:border-danger-500 dark:focus:outline-danger-400',
  },
  disabled: {
    true: 'pointer-events-none cursor-not-allowed opacity-50',
    false: '',
  },
  withBorder: {
    true: 'border border-primary-400 dark:border-secondary-600',
    false: '',
  },
  rounded: {
    none: '',
    all: 'rounded-lg',
    start: 'rounded-s-lg',
    end: 'rounded-e-lg',
  },
  active: {
    true: '',
    false: '',
  },
} as const;

const sharedDefaultVariants = {
  disabled: false,
  active: false,
  color: 'default',
  withBorder: false,
  rounded: 'none',
} as const;

export const buttonStyles = cva(
  'inline-flex items-center justify-center gap-2 font-medium focusable',
  {
    variants: {
      size: {
        xs: 'px-2.5 py-1.5 text-xs',
        sm: 'px-3 py-2 text-sm',
        base: 'px-4 py-2.5 text-sm',
        lg: 'px-5 py-3 text-base',
        xl: 'px-6 py-3.5 text-base',
      },
      ...sharedVariants,
    },
    defaultVariants: {
      size: 'base',
      ...sharedDefaultVariants,
    },
  },
);

export const buttonIconStyles = cva(
  'inline-flex aspect-square shrink-0 items-center justify-center p-0 leading-none font-medium focusable',
  {
    variants: {
      size: {
        xs: 'size-7 text-xs',
        sm: 'size-9 text-sm',
        base: 'size-10 text-sm',
        lg: 'size-12 text-base',
        xl: 'size-14 text-base',
      },
      ...sharedVariants,
    },
    defaultVariants: {
      size: 'base',
      ...sharedDefaultVariants,
    },
  },
);

export type ButtonSize = NonNullable<VariantProps<typeof buttonStyles>['size']>;
export type ButtonRadius = NonNullable<VariantProps<typeof buttonStyles>['rounded']>;
export type ButtonColor = NonNullable<VariantProps<typeof buttonStyles>['color']>;
