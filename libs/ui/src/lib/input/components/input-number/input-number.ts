import {
  Component,
  ElementRef,
  booleanAttribute,
  computed,
  inject,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { FormValueControl, ValidationError } from '@angular/forms/signals';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { faSolidXmark } from '@ng-icons/font-awesome/solid';
import { VariantProps, cva } from 'class-variance-authority';

import { UI_I18N, buildClasses } from '../../../helpers/public-api';

const styles = cva(
  'block w-full rounded-lg border border-primary-400 bg-primary-200 text-primary-contrast-200 focusable dark:border-secondary-600 dark:bg-secondary-700 dark:text-secondary-contrast-400 dark:placeholder-secondary-400',
  {
    variants: {
      size: {
        sm: 'p-2 pr-9 text-xs',
        md: 'p-2 pr-10 text-sm',
        lg: 'p-4 pr-12 text-base',
      },
      color: {
        primary: 'focus:border-primary-500 focus:outline-primary-500',
        blue: 'focus:border-blue-500 focus:outline-blue-500',
        red: 'border-red-500 focus:border-red-500 focus:outline-red-500 dark:border-red-500',
        green: 'focus:border-green-500 focus:outline-green-500',
        yellow: 'focus:border-yellow-500 focus:outline-yellow-500',
      },
      disabled: {
        true: 'cursor-not-allowed bg-gray-100 text-gray-400',
        false: '',
      },
    },
    defaultVariants: {
      color: 'primary',
      disabled: false,
      size: 'md',
    },
  },
);

export type InputNumberSize = NonNullable<VariantProps<typeof styles>['size']>;
export type InputNumberColor = NonNullable<VariantProps<typeof styles>['color']>;

const clearButtonPosition: Record<InputNumberSize, string> = {
  sm: 'right-2',
  md: 'right-2.5',
  lg: 'right-4',
};

@Component({
  selector: 'ui-input-number',
  imports: [NgIcon],
  templateUrl: './input-number.html',
  styleUrl: './input-number.css',
  viewProviders: [provideIcons({ faSolidXmark })],
  host: {
    '[hidden]': 'hidden()',
  },
})
export class InputNumber implements FormValueControl<number | null> {
  protected readonly i18n = inject(UI_I18N);
  private static nextId = 0;
  private readonly inputElement = viewChild.required<ElementRef<HTMLInputElement>>('inputElement');

  protected readonly fallbackId = `ui-input-number-${InputNumber.nextId++}`;
  protected readonly inputId = computed(() => this.labelId() || this.name() || this.fallbackId);
  protected readonly showErrors = computed(() => this.invalid() && this.touched());
  protected readonly maxAttr = computed(() => (typeof this.max() === 'number' ? this.max() : null));
  protected readonly minAttr = computed(() => (typeof this.min() === 'number' ? this.min() : null));
  protected readonly inputMode = computed<'numeric' | 'decimal'>(() =>
    Number.isFinite(this.step()) && Number.isInteger(this.step()) ? 'numeric' : 'decimal',
  );

  public readonly placeholder = input('');
  public readonly autocomplete = input<'off' | 'on' | undefined>('on');
  public readonly labelId = input('');
  public readonly color = input<InputNumberColor>('primary');
  public readonly size = input<InputNumberSize>('md');
  protected readonly clearButtonPosition = computed(() => clearButtonPosition[this.size()]);
  public readonly step = input(1);
  public readonly twClasses = computed(() =>
    buildClasses(
      styles({
        color: this.showErrors() ? 'red' : this.color(),
        disabled: this.disabled(),
        size: this.size(),
      }),
    ),
  );

  public readonly value = model<number | null>(null);
  public readonly touched = model(false);
  public readonly touch = output<void>();

  public readonly disabled = input(false, { transform: booleanAttribute });
  public readonly readonly = input(false, { transform: booleanAttribute });
  public readonly hidden = input(false, { transform: booleanAttribute });
  public readonly invalid = input(false, { transform: booleanAttribute });
  public readonly name = input('');
  public readonly required = input(false, { transform: booleanAttribute });
  public readonly min = input<number | undefined>();
  public readonly max = input<number | undefined>();
  public readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);

  public onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    this.value.set(Number.isNaN(value) ? null : value);
  }

  public onBlur(): void {
    this.touched.set(true);
    this.touch.emit();
  }

  public clear(): void {
    if (this.disabled() || this.readonly()) {
      return;
    }

    this.value.set(null);
    this.focus();
  }

  public focus(options?: FocusOptions): void {
    this.inputElement().nativeElement.focus(options);
  }
}
