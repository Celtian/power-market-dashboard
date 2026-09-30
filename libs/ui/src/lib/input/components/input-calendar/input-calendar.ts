import { Grid, GridCell, GridCellWidget, GridRow } from '@angular/aria/grid';
import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  booleanAttribute,
  computed,
  inject,
  input,
  linkedSignal,
  model,
  output,
  viewChildren,
} from '@angular/core';
import { FormValueControl, ValidationError } from '@angular/forms/signals';

import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  faSolidAnglesLeft,
  faSolidAnglesRight,
  faSolidChevronLeft,
  faSolidChevronRight,
} from '@ng-icons/font-awesome/solid';
import { VariantProps, cva } from 'class-variance-authority';

import { ButtonIcon } from '../../../button/public-api';
import { UI_I18N, UI_LOCALE, buildClasses } from '../../../helpers/public-api';

const DAYS_PER_WEEK = 7;
const CALENDAR_ROWS = 6;
const CALENDAR_CELLS = DAYS_PER_WEEK * CALENDAR_ROWS;

const calendarStyles = cva(
  'w-full rounded-lg border bg-primary-200 p-3 text-primary-contrast-200 dark:bg-secondary-700 dark:text-secondary-contrast-400',
  {
    variants: {
      size: {
        sm: 'max-w-64 text-xs',
        md: 'max-w-80 text-sm',
        lg: 'max-w-96 text-base',
      },
      invalid: {
        true: 'border-danger-500 dark:border-danger-500',
        false: 'border-primary-400 dark:border-secondary-600',
      },
      disabled: {
        true: 'opacity-50',
        false: '',
      },
    },
    defaultVariants: { size: 'md', invalid: false, disabled: false },
  },
);

const titleStyles = cva('min-w-0 flex-1 truncate text-center font-semibold capitalize', {
  variants: {
    size: {
      sm: 'text-sm',
      md: 'text-sm',
      lg: 'text-base',
    },
  },
  defaultVariants: { size: 'md' },
});

const cellStyles = cva('p-0 text-center align-middle', {
  variants: {
    size: {
      sm: 'h-8',
      md: 'h-9',
      lg: 'h-11',
    },
    disabled: {
      true: 'pointer-events-none',
      false: '',
    },
  },
  defaultVariants: { size: 'md', disabled: false },
});

const dayStyles = cva(
  'flex size-full cursor-pointer items-center justify-center rounded-md border bg-transparent transition-colors focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 focus:ring-offset-primary-200 focus:outline-hidden disabled:cursor-not-allowed dark:focus:ring-secondary-400 dark:focus:ring-offset-secondary-700',
  {
    variants: {
      selected: {
        true: 'bg-secondary-800 text-secondary-contrast-800 dark:bg-primary-300 dark:text-primary-contrast-300',
        false:
          'text-primary-contrast-200 hover:bg-primary-300 dark:text-secondary-contrast-400 dark:hover:bg-secondary-600',
      },
      today: {
        true: 'border-primary-600 font-semibold dark:border-secondary-300',
        false: 'border-transparent',
      },
    },
    defaultVariants: { selected: false, today: false },
  },
);

const outsideDayStyles = cva(
  'flex size-full items-center justify-center rounded-md border border-transparent bg-transparent text-primary-500 dark:text-secondary-500',
);

interface CalendarDayCell {
  readonly date: Date;
  readonly dateValue: string;
  readonly day: number;
  readonly id: string;
  readonly ariaLabel: string;
  readonly isCurrentMonth: boolean;
  readonly isDisabled: boolean;
  readonly isSelected: boolean;
  readonly isToday: boolean;
  readonly cellClasses: string;
  readonly dayClasses: string;
}

export type InputCalendarSize = NonNullable<VariantProps<typeof calendarStyles>['size']>;

@Component({
  selector: 'ui-input-calendar',
  imports: [ButtonIcon, Grid, GridCell, GridCellWidget, GridRow, NgIcon],
  templateUrl: './input-calendar.html',
  viewProviders: [
    provideIcons({
      faSolidChevronLeft,
      faSolidChevronRight,
      faSolidAnglesLeft,
      faSolidAnglesRight,
    }),
  ],
  host: {
    class: 'block',
    '[hidden]': 'hidden()',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class InputCalendar implements FormValueControl<string> {
  private static nextId = 0;
  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  protected readonly i18n = inject(UI_I18N);
  private readonly uiLocale = inject(UI_LOCALE);
  private readonly dayButtons = viewChildren(GridCellWidget);
  private readonly today = new Date();
  private readonly todayValue = this.toDateValue(this.today);

  public readonly value = model('');
  public readonly touched = model(false);
  public readonly touch = output<void>();

  protected readonly fallbackId = `ui-input-calendar-${InputCalendar.nextId++}`;
  protected readonly calendarId = computed(() => this.labelId() || this.name() || this.fallbackId);
  protected readonly headingId = computed(() => `${this.calendarId()}-heading`);
  protected readonly selectedDate = computed(() => this.parseDateValue(this.value()));
  protected readonly viewMonth = linkedSignal<string, Date>({
    source: this.value,
    computation: (value, previous) => {
      const selectedDate = this.parseDateValue(value);
      return selectedDate
        ? this.startOfMonth(selectedDate)
        : (previous?.value ?? this.startOfMonth(this.today));
    },
  });
  protected readonly minDateValue = computed(() => this.normalizeDateInput(this.minDate()));
  protected readonly maxDateValue = computed(() => this.normalizeDateInput(this.maxDate()));
  protected readonly showErrors = computed(() => this.invalid() && this.touched());
  protected readonly monthYearLabel = computed(() =>
    new Intl.DateTimeFormat(this.resolvedLocale(), {
      month: 'long',
      year: 'numeric',
    }).format(this.viewMonth()),
  );
  protected readonly weekdays = computed(() => {
    const formatterLong = new Intl.DateTimeFormat(this.resolvedLocale(), {
      weekday: 'long',
    });
    const formatterShort = new Intl.DateTimeFormat(this.resolvedLocale(), {
      weekday: 'short',
    });

    return Array.from({ length: DAYS_PER_WEEK }, (_, index) => {
      const day = (this.normalizedFirstDayOfWeek() + index) % DAYS_PER_WEEK;
      const date = new Date(2023, 0, day + 1);

      return {
        long: formatterLong.format(date),
        short: formatterShort.format(date),
      };
    });
  });
  protected readonly weeks = computed(() => this.createCalendarWeeks(this.viewMonth()));
  protected readonly calendarClasses = computed(() =>
    buildClasses(
      calendarStyles({
        size: this.size(),
        invalid: this.showErrors(),
        disabled: this.disabled(),
      }),
    ),
  );
  protected readonly titleClasses = computed(() => titleStyles({ size: this.size() }));
  protected readonly canGoPreviousMonth = computed(() => this.canGoToMonth(-1));
  protected readonly canGoNextMonth = computed(() => this.canGoToMonth(1));
  protected readonly canGoPreviousYear = computed(() => this.canGoToMonth(-12));
  protected readonly canGoNextYear = computed(() => this.canGoToMonth(12));

  public readonly locale = input<string | undefined>(undefined);
  protected readonly resolvedLocale = computed(() => this.locale() ?? this.uiLocale());
  public readonly firstDayOfWeek = input(1);
  public readonly minDate = input<string | Date | null>(null);
  public readonly maxDate = input<string | Date | null>(null);
  public readonly size = input<InputCalendarSize>('md');
  public readonly labelId = input('');

  public readonly disabled = input(false, { transform: booleanAttribute });
  public readonly readonly = input(false, { transform: booleanAttribute });
  public readonly hidden = input(false, { transform: booleanAttribute });
  public readonly invalid = input(false, { transform: booleanAttribute });
  public readonly name = input('');
  public readonly required = input(false, { transform: booleanAttribute });
  public readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);

  public focus(options?: FocusOptions): void {
    this.focusSelectedOrFirstDay(options);
  }

  protected selectDate(date: Date): void {
    if (this.disabled() || this.readonly() || this.isDateDisabled(date)) {
      return;
    }

    this.value.set(this.toDateValue(date));
  }

  protected previousMonth(): void {
    this.changeMonth(-1);
  }

  protected nextMonth(): void {
    this.changeMonth(1);
  }

  protected previousYear(): void {
    this.changeMonth(-12);
  }

  protected nextYear(): void {
    this.changeMonth(12);
  }

  protected onFocusOut(event: FocusEvent): void {
    const nextTarget = event.relatedTarget;

    if (nextTarget instanceof Node && this.hostElement.nativeElement.contains(nextTarget)) {
      return;
    }

    this.touched.set(true);
    this.touch.emit();
  }

  protected onCalendarKeydown(event: KeyboardEvent): void {
    if (event.key === 'PageUp') {
      event.preventDefault();
      this.previousMonth();
      this.focusAfterRender(() => this.focusSelectedOrFirstDay());
      return;
    }

    if (event.key === 'PageDown') {
      event.preventDefault();
      this.nextMonth();
      this.focusAfterRender(() => this.focusSelectedOrFirstDay());
      return;
    }

    const target = event.target as HTMLElement;
    const day = Number(target.dataset['day']);

    if (!day) {
      return;
    }

    const daysInMonth = this.getDaysInMonth(this.viewMonth());

    if (
      ((event.key === 'ArrowLeft' && day === 1) || (event.key === 'ArrowUp' && day <= 7)) &&
      this.canGoPreviousMonth()
    ) {
      this.previousMonth();
      this.focusAfterRender(() => this.focusLastEnabledDay());
    }

    if (
      ((event.key === 'ArrowRight' && day === daysInMonth) ||
        (event.key === 'ArrowDown' && day > daysInMonth - 7)) &&
      this.canGoNextMonth()
    ) {
      this.nextMonth();
      this.focusAfterRender(() => this.focusFirstEnabledDay());
    }
  }

  private changeMonth(offset: number): void {
    if (this.disabled() || !this.canGoToMonth(offset)) {
      return;
    }

    const month = this.viewMonth();
    this.viewMonth.set(new Date(month.getFullYear(), month.getMonth() + offset, 1));
  }

  private focusFirstEnabledDay(options?: FocusOptions): void {
    this.enabledDayButtons()[0]?.element.focus(options);
  }

  private focusLastEnabledDay(options?: FocusOptions): void {
    const buttons = this.enabledDayButtons();
    buttons[buttons.length - 1]?.element.focus(options);
  }

  private focusSelectedOrFirstDay(options?: FocusOptions): void {
    const selectedValue = this.value();
    const buttons = this.enabledDayButtons();
    const button =
      buttons.find((dayButton) => dayButton.element.dataset['date'] === selectedValue) ??
      buttons[0];

    button?.element.focus(options);
  }

  private enabledDayButtons(): readonly GridCellWidget[] {
    return this.dayButtons().filter((dayButton) => !dayButton.element.hasAttribute('disabled'));
  }

  private focusAfterRender(callback: () => void): void {
    afterNextRender(callback, { injector: this.injector });
  }

  private createCalendarWeeks(viewMonth: Date): CalendarDayCell[][] {
    const firstDayOffset =
      (DAYS_PER_WEEK + viewMonth.getDay() - this.normalizedFirstDayOfWeek()) % DAYS_PER_WEEK;
    const daysInMonth = this.getDaysInMonth(viewMonth);
    const previousMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
    const daysInPreviousMonth = this.getDaysInMonth(previousMonth);
    const cells: CalendarDayCell[] = [];

    for (let index = firstDayOffset - 1; index >= 0; index--) {
      const day = daysInPreviousMonth - index;
      cells.push(
        this.createDayCell(
          new Date(previousMonth.getFullYear(), previousMonth.getMonth(), day),
          false,
        ),
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(
        this.createDayCell(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day), true),
      );
    }

    const nextMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
    const trailingDays = CALENDAR_CELLS - cells.length;

    for (let day = 1; day <= trailingDays; day++) {
      cells.push(
        this.createDayCell(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), day), false),
      );
    }

    return Array.from({ length: CALENDAR_ROWS }, (_, weekIndex) =>
      cells.slice(weekIndex * DAYS_PER_WEEK, weekIndex * DAYS_PER_WEEK + DAYS_PER_WEEK),
    );
  }

  private createDayCell(date: Date, isCurrentMonth: boolean): CalendarDayCell {
    const dateValue = this.toDateValue(date);
    const selectedDate = this.selectedDate();
    const isDisabled = !isCurrentMonth || this.isDateDisabled(date);
    const isSelected =
      !isDisabled && !!selectedDate && this.toDateValue(selectedDate) === dateValue;
    const isToday = dateValue === this.todayValue;

    return {
      date,
      dateValue,
      day: date.getDate(),
      id: `${this.calendarId()}-${dateValue}`,
      ariaLabel: new Intl.DateTimeFormat(this.resolvedLocale(), {
        dateStyle: 'full',
      }).format(date),
      isCurrentMonth,
      isDisabled,
      isSelected,
      isToday,
      cellClasses: cellStyles({
        size: this.size(),
        disabled: this.disabled() || this.readonly() || isDisabled,
      }),
      dayClasses: isCurrentMonth
        ? dayStyles({ selected: isSelected, today: isToday })
        : outsideDayStyles(),
    };
  }

  private isDateDisabled(date: Date): boolean {
    const dateValue = this.toDateValue(date);
    const minDateValue = this.minDateValue();
    const maxDateValue = this.maxDateValue();

    return (
      (!!minDateValue && dateValue < minDateValue) || (!!maxDateValue && dateValue > maxDateValue)
    );
  }

  private canGoToMonth(offset: number): boolean {
    const month = this.viewMonth();
    const targetMonth = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    const targetMonthStart = this.toDateValue(targetMonth);
    const targetMonthEnd = this.toDateValue(
      new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0),
    );
    const minDateValue = this.minDateValue();
    const maxDateValue = this.maxDateValue();

    return (
      (!minDateValue || targetMonthEnd >= minDateValue) &&
      (!maxDateValue || targetMonthStart <= maxDateValue)
    );
  }

  private parseDateValue(value: string | null | undefined): Date | null {
    if (!value) {
      return null;
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (!match) {
      return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = new Date(year, month, day);

    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
      return null;
    }

    return date;
  }

  private normalizeDateInput(value: string | Date | null | undefined): string | null {
    if (value instanceof Date) {
      return this.isValidDate(value) ? this.toDateValue(value) : null;
    }

    return value && this.parseDateValue(value) ? value : null;
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private isValidDate(value: Date): boolean {
    return !Number.isNaN(value.getTime());
  }

  private getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  private toDateValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private normalizedFirstDayOfWeek(): number {
    return ((this.firstDayOfWeek() % DAYS_PER_WEEK) + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  }
}
