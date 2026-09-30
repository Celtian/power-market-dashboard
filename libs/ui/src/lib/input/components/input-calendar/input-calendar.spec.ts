import { TestBed } from '@angular/core/testing';

import * as axe from 'axe-core';

import { InputCalendar, InputCalendarSize } from './input-calendar';

interface CalendarInternals {
  monthYearLabel(): string;
  nextMonth(): void;
  nextYear(): void;
  onCalendarKeydown(event: KeyboardEvent): void;
  previousMonth(): void;
  previousYear(): void;
  selectDate(date: Date): void;
  weeks(): { isSelected: boolean }[][];
}

const dateValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const AXE_OPTIONS = {
  resultTypes: ['violations'],
  rules: { 'color-contrast': { enabled: false } },
} satisfies axe.RunOptions;

describe('InputCalendar', () => {
  it('renders and supports selection, form state, focus, visibility, and accessibility', async () => {
    const fixture = TestBed.createComponent(InputCalendar);
    const component = fixture.componentInstance;
    const internals = component as unknown as CalendarInternals;
    const host = fixture.nativeElement as HTMLElement;
    let touchCount = 0;
    component.touch.subscribe(() => touchCount++);
    fixture.componentRef.setInput('labelId', 'calendar');
    fixture.componentRef.setInput('locale', 'en-US');
    fixture.componentRef.setInput('firstDayOfWeek', 1);
    fixture.componentRef.setInput('size', 'lg' satisfies InputCalendarSize);
    fixture.componentRef.setInput('minDate', new Date(2026, 6, 10));
    fixture.componentRef.setInput('maxDate', '2026-07-20');
    component.value.set('2026-07-16');
    await fixture.whenStable();

    const calendar = host.firstElementChild as HTMLElement;
    const table = host.querySelector('table') as HTMLTableElement;
    const selectedDay = host.querySelector('[data-date="2026-07-16"]') as HTMLButtonElement;
    const readonlyDay = host.querySelector('[data-date="2026-07-18"]') as HTMLButtonElement;
    const weekdayLabels = [...host.querySelectorAll<HTMLElement>('thead span[aria-hidden="true"]')];

    expect(calendar.classList).toContain('max-w-96');
    expect(calendar.classList).toContain('text-base');
    expect(table.id).toBe('calendar');
    expect(table.querySelectorAll('tbody tr')).toHaveLength(6);
    expect(table.querySelectorAll('tbody td')).toHaveLength(42);
    expect(weekdayLabels[0]?.textContent?.trim()).toBe('Mon');
    expect(selectedDay.parentElement?.classList).toContain('h-11');
    expect(selectedDay.classList).toContain('bg-secondary-800');
    expect(selectedDay.getAttribute('aria-label')).toContain('Thursday');
    expect((await axe.run(host, AXE_OPTIONS)).violations).toEqual([]);

    internals.selectDate(new Date(2026, 6, 9));
    expect(component.value()).toBe('2026-07-16');

    internals.selectDate(new Date(2026, 6, 20));
    expect(component.value()).toBe('2026-07-20');

    fixture.componentRef.setInput('readonly', true);
    await fixture.whenStable();
    internals.selectDate(new Date(2026, 6, 18));
    expect(component.value()).toBe('2026-07-20');
    expect(readonlyDay.disabled).toBe(true);

    fixture.componentRef.setInput('readonly', false);
    fixture.componentRef.setInput('disabled', true);
    internals.selectDate(new Date(2026, 6, 18));
    expect(component.value()).toBe('2026-07-20');

    fixture.componentRef.setInput('disabled', false);
    component.value.set('2026-07-16');
    fixture.componentRef.setInput('labelId', '');
    fixture.componentRef.setInput('name', 'startsOn');
    fixture.componentRef.setInput('invalid', true);
    fixture.componentRef.setInput('required', true);
    await fixture.whenStable();

    const day = host.querySelector('[data-date="2026-07-16"]') as HTMLButtonElement;
    expect(table.id).toBe('startsOn');
    expect(table.getAttribute('aria-invalid')).toBe('false');
    expect(table.getAttribute('aria-required')).toBe('true');

    day.dispatchEvent(
      new FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: document.body,
      }),
    );
    await fixture.whenStable();
    expect(component.touched()).toBe(true);
    expect(touchCount).toBe(1);
    expect(table.getAttribute('aria-invalid')).toBe('true');
    expect(host.firstElementChild?.classList).toContain('border-danger-500');

    component.focus();
    expect(document.activeElement).toBe(day);

    fixture.componentRef.setInput('hidden', true);
    await fixture.whenStable();
    expect(host.hidden).toBe(true);

    const today = dateValue(new Date());
    fixture.componentRef.setInput('hidden', false);
    fixture.componentRef.setInput('labelId', '');
    fixture.componentRef.setInput('name', '');
    fixture.componentRef.setInput('locale', 'en-US');
    fixture.componentRef.setInput('firstDayOfWeek', -1);
    fixture.componentRef.setInput('minDate', null);
    fixture.componentRef.setInput('maxDate', null);
    component.value.set(today);
    await fixture.whenStable();

    const todayButton = host.querySelector(`[data-date="${today}"]`) as HTMLButtonElement;
    const firstWeekday = host.querySelector('thead span[aria-hidden="true"]') as HTMLElement;

    expect(todayButton.getAttribute('aria-current')).toBe('date');
    expect(firstWeekday.textContent?.trim()).toBe('Sat');
    expect(table.id).toMatch(/^ui-input-calendar-\d+$/);

    fixture.componentRef.setInput('minDate', '2026-01-01');
    fixture.componentRef.setInput('maxDate', '2027-12-31');
    component.value.set('2026-07-16');

    expect(internals.monthYearLabel()).toContain('July');
    expect(internals.weeks()).toHaveLength(6);
    expect(internals.weeks().flat()).toHaveLength(42);

    internals.nextMonth();
    expect(internals.monthYearLabel()).toContain('August');
    internals.previousMonth();
    internals.nextYear();
    expect(internals.monthYearLabel()).toContain('2027');
    internals.previousYear();

    fixture.componentRef.setInput('minDate', '2026-07-01');
    fixture.componentRef.setInput('maxDate', '2026-07-31');
    internals.previousMonth();
    internals.nextMonth();
    expect(internals.monthYearLabel()).toContain('July');

    component.value.set('not-a-date');
    expect(
      internals
        .weeks()
        .flat()
        .some((day) => day.isSelected),
    ).toBe(false);
    expect(internals.monthYearLabel()).toContain('July');

    fixture.componentRef.setInput('minDate', '2026-08-10');
    fixture.componentRef.setInput('maxDate', '2026-09-30');
    component.value.set('2026-07-31');

    const arrowRight = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    Object.defineProperty(arrowRight, 'target', {
      value: { dataset: { day: '31' } },
    });
    internals.onCalendarKeydown(arrowRight);
    await fixture.whenStable();

    expect(internals.monthYearLabel()).toContain('August');
    expect((document.activeElement as HTMLElement).dataset['date']).toBe('2026-08-10');

    const pageDown = new KeyboardEvent('keydown', { key: 'PageDown' });
    const preventDefault = vi.spyOn(pageDown, 'preventDefault');
    internals.onCalendarKeydown(pageDown);
    await fixture.whenStable();
    expect(preventDefault).toHaveBeenCalled();
    expect(internals.monthYearLabel()).toContain('September');
  });
});
