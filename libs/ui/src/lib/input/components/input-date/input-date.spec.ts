import { DIALOG_DATA, Dialog, DialogConfig, DialogRef } from '@angular/cdk/dialog';
import { Component, input, model } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import * as axe from 'axe-core';
import { EMPTY, of } from 'rxjs';

import { InputCalendar } from '../input-calendar/input-calendar';
import { InputDate, InputDateSize } from './input-date';
import { InputDateModal, InputDateModalData } from './input-date-modal';

@Component({
  selector: 'ui-input-calendar',
  template: '',
})
class InputCalendarStub {
  public readonly firstDayOfWeek = input(1);
  public readonly labelId = input('');
  public readonly locale = input<string | undefined>(undefined);
  public readonly maxDate = input<string | Date | null>(null);
  public readonly minDate = input<string | Date | null>(null);
  public readonly value = model('');
}

describe('InputDate', () => {
  let config: DialogConfig<InputDateModalData>;
  const open = vi.fn(
    (_component: typeof InputDateModal, dialogConfig: DialogConfig<InputDateModalData>) => {
      config = dialogConfig;
      return { closed: EMPTY } as unknown as DialogRef<string | undefined>;
    },
  );

  beforeEach(() => {
    open.mockClear();
    TestBed.configureTestingModule({
      providers: [{ provide: Dialog, useValue: { open } }],
    });
  });

  it('binds attributes, resolves its id, synchronizes its value, and is accessible', async () => {
    const fixture = TestBed.createComponent(InputDate);
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    expect(input.id).toMatch(/^ui-input-date-\d+$/);

    fixture.componentRef.setInput('name', 'startsOn');
    await fixture.whenStable();
    expect(input.id).toBe('startsOn');
    expect(input.name).toBe('startsOn');

    fixture.componentRef.setInput('labelId', 'starts-on');
    fixture.componentRef.setInput('placeholder', 'Choose a date');
    fixture.componentRef.setInput('required', true);
    fixture.componentRef.setInput('size', 'lg' satisfies InputDateSize);
    fixture.componentInstance.value.set('2026-08-11');
    await fixture.whenStable();

    expect(input.id).toBe('starts-on');
    expect(input.inputMode).toBe('numeric');
    expect(input.placeholder).toBe('Choose a date');
    expect(input.required).toBe(true);
    expect(input.value).toBe('2026-08-11');
    expect(input.classList).toContain('p-4');

    input.value = '2026-08-12';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe('2026-08-12');

    expect(
      (
        await axe.run(fixture.nativeElement, {
          rules: { 'color-contrast': { enabled: false } },
        })
      ).violations,
    ).toEqual([]);
  });

  it('handles touch, validation state, visibility, disabled state, and focus', async () => {
    const fixture = TestBed.createComponent(InputDate);
    let touchCount = 0;
    fixture.componentInstance.touch.subscribe(() => touchCount++);
    fixture.componentRef.setInput('invalid', true);
    fixture.componentRef.setInput('readonly', true);
    await fixture.whenStable();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    const pickerButton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(input.readOnly).toBe(true);
    expect(pickerButton.disabled).toBe(true);

    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(fixture.componentInstance.touched()).toBe(true);
    expect(touchCount).toBe(1);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.classList).toContain('border-red-500');

    fixture.componentInstance.focus();
    expect(document.activeElement).toBe(input);

    fixture.componentRef.setInput('readonly', false);
    fixture.componentRef.setInput('disabled', true);
    fixture.componentRef.setInput('hidden', true);
    await fixture.whenStable();
    expect(input.disabled).toBe(true);
    expect(pickerButton.disabled).toBe(true);
    expect((fixture.nativeElement as HTMLElement).hidden).toBe(true);
  });

  it('configures the picker, handles its result, and honors disabled states', async () => {
    const fixture = TestBed.createComponent(InputDate);
    fixture.componentRef.setInput('firstDayOfWeek', 0);
    fixture.componentRef.setInput('locale', 'en-US');
    fixture.componentRef.setInput('minDate', '2026-01-01');
    fixture.componentRef.setInput('maxDate', new Date(2026, 11, 31));
    fixture.componentInstance.value.set('2026-07-16');
    await fixture.whenStable();

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(open).toHaveBeenCalledWith(InputDateModal, expect.any(Object));
    expect(config.role).toBe('dialog');
    expect(config.ariaModal).toBe(true);
    expect(config.autoFocus).toBe('first-tabbable');
    expect(config.restoreFocus).toBe(true);
    expect(config.ariaLabelledBy).toBe(config.data?.titleId);
    expect(config.ariaDescribedBy).toBe(config.data?.contentId);
    expect(config.data).toMatchObject({
      firstDayOfWeek: 0,
      locale: 'en-US',
      minDate: '2026-01-01',
      value: '2026-07-16',
    });
    expect(config.data?.maxDate).toEqual(new Date(2026, 11, 31));

    open.mockReturnValueOnce({ closed: of('2026-08-20') } as DialogRef<string | undefined>);
    fixture.componentInstance.openDatePicker();
    expect(fixture.componentInstance.value()).toBe('2026-08-20');

    open.mockReturnValueOnce({ closed: of(undefined) } as DialogRef<string | undefined>);
    fixture.componentInstance.openDatePicker();
    expect(fixture.componentInstance.value()).toBe('2026-08-20');

    open.mockClear();
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();
    fixture.componentInstance.openDatePicker();

    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('readonly', true);
    await fixture.whenStable();
    fixture.componentInstance.openDatePicker();

    expect(open).not.toHaveBeenCalled();
  });
});

describe('InputDateModal', () => {
  const data: InputDateModalData = {
    calendarId: 'date-calendar',
    contentId: 'date-content',
    firstDayOfWeek: 1,
    locale: 'en-US',
    maxDate: '2026-12-31',
    minDate: '2026-01-01',
    titleId: 'date-title',
    value: '2026-07-16',
  };

  it('propagates settings and returns only confirmed values', async () => {
    const close = vi.fn();
    TestBed.overrideComponent(InputDateModal, {
      remove: { imports: [InputCalendar] },
      add: { imports: [InputCalendarStub] },
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: DIALOG_DATA, useValue: data },
        { provide: DialogRef, useValue: { close } },
      ],
    });
    const fixture = TestBed.createComponent(InputDateModal);
    await fixture.whenStable();

    const calendar = fixture.debugElement.query(By.directive(InputCalendarStub))
      .componentInstance as InputCalendarStub;
    expect(calendar.labelId()).toBe('date-calendar');
    expect(calendar.locale()).toBe('en-US');
    expect(calendar.firstDayOfWeek()).toBe(1);
    expect(calendar.minDate()).toBe('2026-01-01');
    expect(calendar.maxDate()).toBe('2026-12-31');
    expect(calendar.value()).toBe('2026-07-16');

    const host: HTMLElement = fixture.nativeElement;
    const buttons = host.querySelectorAll<HTMLButtonElement>('ui-modal-footer button');
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button.classList).toContain('rounded-lg');
      expect(button.classList).toContain('border');
      expect(button.classList).toContain('border-primary-400');
    }

    calendar.value.set('2026-08-20');
    await fixture.whenStable();
    (fixture.nativeElement.querySelector('[data-input-date-select]') as HTMLButtonElement).click();
    expect(close).toHaveBeenCalledWith('2026-08-20');

    (fixture.nativeElement.querySelector('ui-modal-footer button') as HTMLButtonElement).click();
    expect(close).toHaveBeenLastCalledWith(undefined);
  });
});
