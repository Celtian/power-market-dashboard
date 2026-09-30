import { Combobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import { OverlayModule } from '@angular/cdk/overlay';
import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  ElementRef,
  booleanAttribute,
  computed,
  contentChild,
  inject,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { FormValueControl, ValidationError } from '@angular/forms/signals';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { faSolidCheck, faSolidChevronDown } from '@ng-icons/font-awesome/solid';
import { VariantProps, cva } from 'class-variance-authority';

import { UI_I18N, buildClasses } from '../../../helpers/public-api';
import { InputSelectOptionContext } from './input-select-option-context';
import { InputSelectOption } from './types';

const styles = cva(
  'flex w-full items-center justify-between rounded-lg border border-primary-400 bg-primary-200 text-left text-primary-contrast-200 focusable dark:border-secondary-600 dark:bg-secondary-700 dark:text-secondary-contrast-400',
  {
    variants: {
      size: {
        sm: 'min-h-8.5 px-2 text-xs',
        md: 'min-h-9.5 px-2.5 text-sm',
        lg: 'min-h-13.5 px-4 text-base',
      },
      color: {
        primary: 'focus:border-primary-500 focus:outline-primary-500',
        blue: 'focus:border-blue-500 focus:outline-blue-500',
        red: 'border-red-500 focus:border-red-500 focus:outline-red-500 dark:border-red-500',
        green: 'focus:border-green-500 focus:outline-green-500',
        yellow: 'focus:border-yellow-500 focus:outline-yellow-500',
      },
      disabled: {
        true: 'cursor-not-allowed bg-gray-100 text-gray-400 opacity-60',
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

export type InputSelectSize = NonNullable<VariantProps<typeof styles>['size']>;
export type InputSelectColor = NonNullable<VariantProps<typeof styles>['color']>;

@Component({
  selector: 'ui-input-select',
  imports: [
    Combobox,
    ComboboxPopup,
    ComboboxWidget,
    Listbox,
    NgIcon,
    NgTemplateOutlet,
    Option,
    OverlayModule,
  ],
  templateUrl: './input-select.html',
  styleUrl: './input-select.css',
  viewProviders: [provideIcons({ faSolidCheck, faSolidChevronDown })],
  host: {
    class: 'block',
    '[hidden]': 'hidden()',
  },
})
export class InputSelect<
  T extends string | number = string,
  R = undefined,
> implements FormValueControl<T> {
  private static nextId = 0;
  protected readonly i18n = inject(UI_I18N);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  protected readonly fallbackId = `ui-input-select-${InputSelect.nextId++}`;
  protected readonly inputId = computed(() => this.labelId() || this.name() || this.fallbackId);
  protected readonly showErrors = computed(() => this.invalid() && this.touched());
  protected readonly selectedOption = computed(
    () => this.options().find((option) => option.value === this.value()) ?? null,
  );
  protected readonly displayPlaceholder = computed(
    () => this.placeholder() ?? this.i18n().input.selectOption,
  );
  protected readonly selectedValues = computed(() => {
    const value = this.value();
    return this.options().some((option) => option.value === value) ? [value] : [];
  });
  protected readonly optionTemplate = contentChild(InputSelectOptionContext);
  protected readonly twClasses = computed(() =>
    buildClasses(
      styles({
        color: this.showErrors() ? 'red' : this.color(),
        disabled: this.disabled() || this.readonly(),
        size: this.size(),
      }),
    ),
  );

  public readonly options = input.required<readonly InputSelectOption<T, R>[]>();
  public readonly placeholder = input<string>();
  public readonly labelId = input('');
  public readonly ariaDescribedBy = input('');
  public readonly color = input<InputSelectColor>('primary');
  public readonly size = input<InputSelectSize>('md');

  public readonly value = model.required<T>();
  public readonly touched = model(false);
  public readonly touch = output<void>();

  public readonly disabled = input(false, { transform: booleanAttribute });
  public readonly readonly = input(false, { transform: booleanAttribute });
  public readonly hidden = input(false, { transform: booleanAttribute });
  public readonly invalid = input(false, { transform: booleanAttribute });
  public readonly name = input('');
  public readonly required = input(false, { transform: booleanAttribute });
  public readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);

  public onValuesChange(values: T[], combobox: Combobox): void {
    const value = values[0];
    if (value === undefined) {
      return;
    }

    const selected = this.options().find((option) => option.value === value);
    if (!selected || selected.disabled) {
      return;
    }

    this.value.set(value);
    combobox.expanded.set(false);
    this.focus();
  }

  public onBlur(): void {
    this.touched.set(true);
    this.touch.emit();
  }

  public focus(options?: FocusOptions): void {
    this.trigger().nativeElement.focus(options);
  }
}
