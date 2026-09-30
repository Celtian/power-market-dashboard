import { Dialog } from '@angular/cdk/dialog';
import {
  Component,
  DestroyRef,
  ElementRef,
  booleanAttribute,
  computed,
  inject,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormValueControl, ValidationError } from '@angular/forms/signals';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { faSolidCalendarDays } from '@ng-icons/font-awesome/solid';
import { VariantProps, cva } from 'class-variance-authority';
import { take } from 'rxjs';

import { UI_I18N, buildClasses } from '../../../helpers/public-api';
import { InputDateModal, InputDateModalData } from './input-date-modal';

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

export type InputDateSize = NonNullable<VariantProps<typeof styles>['size']>;
export type InputDateColor = NonNullable<VariantProps<typeof styles>['color']>;

const calendarButtonPosition: Record<InputDateSize, string> = {
  sm: 'right-2',
  md: 'right-2.5',
  lg: 'right-4',
};

@Component({
  selector: 'ui-input-date',
  imports: [NgIcon],
  templateUrl: './input-date.html',
  viewProviders: [provideIcons({ faSolidCalendarDays })],
  host: {
    '[hidden]': 'hidden()',
  },
})
export class InputDate implements FormValueControl<string> {
  protected readonly i18n = inject(UI_I18N);
  private static nextId = 0;
  private static nextDialogId = 0;
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(Dialog);
  private readonly inputElement = viewChild.required<ElementRef<HTMLInputElement>>('inputElement');

  protected readonly fallbackId = `ui-input-date-${InputDate.nextId++}`;
  protected readonly inputId = computed(() => this.labelId() || this.name() || this.fallbackId);
  protected readonly showErrors = computed(() => this.invalid() && this.touched());
  protected readonly displayPlaceholder = computed(
    () => this.placeholder() ?? this.i18n().input.datePlaceholder,
  );
  protected readonly calendarButtonPosition = computed(() => calendarButtonPosition[this.size()]);
  protected readonly twClasses = computed(() =>
    buildClasses(
      styles({
        color: this.showErrors() ? 'red' : this.color(),
        disabled: this.disabled(),
        size: this.size(),
      }),
    ),
  );

  public readonly locale = input<string | undefined>(undefined);
  public readonly firstDayOfWeek = input(1);
  public readonly minDate = input<string | Date | null>(null);
  public readonly maxDate = input<string | Date | null>(null);
  public readonly placeholder = input<string>();
  public readonly labelId = input('');
  public readonly color = input<InputDateColor>('primary');
  public readonly size = input<InputDateSize>('md');

  public readonly value = model('');
  public readonly touched = model(false);
  public readonly touch = output<void>();

  public readonly disabled = input(false, { transform: booleanAttribute });
  public readonly readonly = input(false, { transform: booleanAttribute });
  public readonly hidden = input(false, { transform: booleanAttribute });
  public readonly invalid = input(false, { transform: booleanAttribute });
  public readonly name = input('');
  public readonly required = input(false, { transform: booleanAttribute });
  public readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);

  public onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }

  public onBlur(): void {
    this.touched.set(true);
    this.touch.emit();
  }

  public openDatePicker(): void {
    if (this.disabled() || this.readonly()) {
      return;
    }

    const id = InputDate.nextDialogId++;
    const data: InputDateModalData = {
      calendarId: `ui-input-date-calendar-${id}`,
      contentId: `ui-input-date-content-${id}`,
      firstDayOfWeek: this.firstDayOfWeek(),
      locale: this.locale(),
      maxDate: this.maxDate(),
      minDate: this.minDate(),
      titleId: `ui-input-date-title-${id}`,
      value: this.value(),
    };

    this.dialog
      .open<string | undefined, InputDateModalData>(InputDateModal, {
        ariaDescribedBy: data.contentId,
        ariaLabelledBy: data.titleId,
        ariaModal: true,
        autoFocus: 'first-tabbable',
        backdropClass: 'cdk-overlay-dark-backdrop',
        data,
        disableClose: false,
        hasBackdrop: true,
        panelClass: ['ui-modal-sm'],
        restoreFocus: true,
        role: 'dialog',
      })
      .closed.pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        if (value === undefined) {
          return;
        }

        this.value.set(value);
      });
  }

  public focus(options?: FocusOptions): void {
    this.inputElement().nativeElement.focus(options);
  }
}
