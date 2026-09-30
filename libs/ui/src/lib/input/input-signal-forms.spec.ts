import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, form } from '@angular/forms/signals';

import { InputDate } from './components/input-date/input-date';
import { InputNumber } from './components/input-number/input-number';
import { InputSelect } from './components/input-select/input-select';

@Component({
  imports: [FormField, InputDate, InputNumber, InputSelect],
  template: `
    <ui-input-select [options]="options" [formField]="fields.product" />
    <ui-input-date locale="en-US" [formField]="fields.date" />
    <ui-input-number [formField]="fields.target" />
  `,
})
class SignalFormsHost {
  readonly select = viewChild.required(InputSelect);
  readonly model = signal({
    product: 'afrr',
    date: '2026-09-30',
    target: 100 as number | null,
  });
  readonly fields = form(this.model);
  readonly options = [
    { label: 'aFRR', value: 'afrr' },
    { label: 'mFRR', value: 'mfrr' },
  ];
}

describe('dashboard input Signal Forms integration', () => {
  it('keeps select, date, and number values synchronized', async () => {
    const fixture = TestBed.createComponent(SignalFormsHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const date = host.querySelector('ui-input-date input') as HTMLInputElement;
    const number = host.querySelector('ui-input-number input') as HTMLInputElement;

    expect(date.value).toBe('2026-09-30');
    expect(number.valueAsNumber).toBe(100);

    fixture.componentInstance.select().value.set('mfrr');
    date.value = '2026-10-01';
    date.dispatchEvent(new Event('input'));
    number.value = '125';
    number.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(fixture.componentInstance.model()).toEqual({
      product: 'mfrr',
      date: '2026-10-01',
      target: 125,
    });
  });
});
